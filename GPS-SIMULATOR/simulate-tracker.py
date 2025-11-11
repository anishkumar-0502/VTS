#!/usr/bin/env python3

import argparse
import json
import math
from datetime import datetime
from time import sleep
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import polyline
import requests
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConfigurationError, PyMongoError
from tqdm import tqdm


class LocationDict(Dict[str, float]):
    lng: float
    lat: float


class GoogleMapsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api"

    def get_coordinates(self, location: str) -> Dict[str, Any]:
        url = f"{self.base_url}/geocode/json"
        params = {"address": location, "key": self.api_key}
        response = requests.get(url, params=params)
        data: Dict[str, Any] = response.json()
        if data.get("status") != "OK" or not data.get("results"):
            raise ValueError(f"Location {location} not found")
        result: Dict[str, Any] = data["results"][0]
        location_data: LocationDict = result["geometry"]["location"]
        feature = {
            "geometry": {
                "coordinates": [location_data["lng"], location_data["lat"]]
            },
            "properties": {"place_name": result["formatted_address"]}
        }
        return feature

    def get_directions(
        self,
        from_location: Dict[str, Any],
        to_location: Dict[str, Any]
    ) -> Tuple[float, float, List[float], List[float], List[float], List[Tuple[float, float]]]:
        from_coords = from_location["geometry"]["coordinates"]
        to_coords = to_location["geometry"]["coordinates"]
        url = f"{self.base_url}/directions/json"
        params = {
            "origin": f"{from_coords[1]},{from_coords[0]}",
            "destination": f"{to_coords[1]},{to_coords[0]}",
            "mode": "driving",
            "key": self.api_key
        }
        response = requests.get(url, params=params)
        data: Dict[str, Any] = response.json()
        if data.get("status") != "OK" or not data.get("routes"):
            raise ValueError("No route found")
        route: Dict[str, Any] = data["routes"][0]
        leg: Dict[str, Any] = route["legs"][0]
        total_distance = float(leg["distance"]["value"])
        total_duration = float(leg["duration"]["value"])
        encoded_polyline = route["overview_polyline"]["points"]
        decoded_polyline = polyline.decode(encoded_polyline)
        coordinates = [(point[1], point[0]) for point in decoded_polyline]
        distances: List[float] = []
        durations: List[float] = []
        speeds: List[float] = []
        for i in range(1, len(coordinates)):
            lat1, lng1 = coordinates[i - 1][1], coordinates[i - 1][0]
            lat2, lng2 = coordinates[i][1], coordinates[i][0]
            dist = math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2) * 111000
            distances.append(dist)
            segment_duration = (dist / total_distance) * total_duration if total_distance > 0 else 0.0
            durations.append(segment_duration)
            speed = dist / segment_duration if segment_duration > 0 else 0.0
            speeds.append(speed)
        return total_distance, total_duration, speeds, distances, durations, coordinates


class TrackerSim:
    def __init__(
        self,
        speeds: List[float],
        distances: List[float],
        durations: List[float],
        coordinates: List[Tuple[float, float]]
    ) -> None:
        self.speeds = np.array(speeds, dtype=float)
        self.distances = np.array(distances, dtype=float)
        self.durations = np.array(durations, dtype=float)
        self.coordinates = np.array(coordinates, dtype=float)
        if self.coordinates.shape[0] < 2:
            raise ValueError("TrackerSim requires at least two coordinates")
        with np.errstate(divide="ignore", invalid="ignore"):
            self.segment_times = np.divide(
                self.distances,
                self.speeds,
                out=np.full_like(self.distances, fill_value=1.0, dtype=float),
                where=self.speeds > 0
            )
        self.cumulative_times = np.cumsum(self.segment_times)

    def get_coords(self, elapsed_time: int) -> Tuple[float, float]:
        if elapsed_time <= 0:
            return tuple(self.coordinates[0])
        if elapsed_time >= self.cumulative_times[-1]:
            return tuple(self.coordinates[-1])
        target_segment_index = int(np.searchsorted(self.cumulative_times, elapsed_time, side="right"))
        segment_index = max(0, min(target_segment_index - 1, self.coordinates.shape[0] - 2))
        start_coords = self.coordinates[segment_index]
        end_coords = self.coordinates[segment_index + 1]
        cumulative_time_before_segment = self.cumulative_times[segment_index - 1] if segment_index > 0 else 0.0
        segment_duration = self.segment_times[segment_index]
        if segment_duration <= 0:
            return tuple(end_coords)
        fraction = (elapsed_time - cumulative_time_before_segment) / segment_duration
        fraction = float(max(0.0, min(1.0, fraction)))
        estimated_lat = start_coords[0] + (end_coords[0] - start_coords[0]) * fraction
        estimated_lng = start_coords[1] + (end_coords[1] - start_coords[1]) * fraction
        return estimated_lat, estimated_lng

    def get_extended_coords(self, elapsed_time: int) -> Dict[str, Any]:
        lat, lng = self.get_coords(elapsed_time)
        target_segment_index = int(np.searchsorted(self.cumulative_times, elapsed_time, side="right"))
        segment_index = max(0, min(target_segment_index - 1, len(self.speeds) - 1))
        speed_ms = float(self.speeds[segment_index]) if len(self.speeds) else 0.0
        speed_kmh = speed_ms * 3.6
        course = 0.0
        if segment_index > 0:
            prev_lat, prev_lng = self.coordinates[segment_index]
            delta_lat = lat - prev_lat
            delta_lng = lng - prev_lng
            course = math.degrees(math.atan2(delta_lng, delta_lat)) % 360
        return {
            "latitude": lat,
            "longitude": lng,
            "speed_kmh": round(speed_kmh, 2),
            "course": round(course, 2),
            "altitude": 50.0,
            "satellites": 8,
            "fix_quality": 1,
            "hdop": 1.2
        }


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def extract_point(payload: Optional[Dict[str, Any]]) -> Optional[Tuple[float, float]]:
    if not payload:
        return None
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    if lat is None or lng is None:
        return None
    try:
        return float(lat), float(lng)
    except (TypeError, ValueError):
        return None


def build_trip_route(
    trip: Dict[str, Any],
    default_speed_kmh: float
) -> Tuple[List[float], List[float], List[float], List[Tuple[float, float]], float, str, str]:
    points: List[Tuple[float, float]] = []
    start_point = extract_point(trip.get("start_location"))
    if start_point:
        points.append(start_point)
    route_points = trip.get("route_points") or []
    route_points = sorted(route_points, key=lambda item: item.get("sequence", 0))
    for stop in route_points:
        stop_point = extract_point(stop)
        if stop_point and (not points or stop_point != points[-1]):
            points.append(stop_point)
    end_point = extract_point(trip.get("end_location"))
    if end_point and (not points or end_point != points[-1]):
        points.append(end_point)
    if len(points) < 2:
        raise ValueError("Scheduled trip has insufficient route points")
    speed_kmh = default_speed_kmh if default_speed_kmh and default_speed_kmh > 0 else 30.0
    speed_ms = speed_kmh / 3.6
    distances: List[float] = []
    speeds: List[float] = []
    durations: List[float] = []
    total_distance = 0.0
    for i in range(1, len(points)):
        lat1, lng1 = points[i - 1]
        lat2, lng2 = points[i]
        segment_distance = haversine_distance(lat1, lng1, lat2, lng2)
        if segment_distance <= 0:
            segment_distance = 1.0
        distances.append(segment_distance)
        total_distance += segment_distance
        speeds.append(speed_ms)
        segment_duration = segment_distance / speed_ms if speed_ms > 0 else 1.0
        durations.append(segment_duration)
    start_label = trip.get("start_location", {}).get("address") or trip.get("route_name") or "Route start"
    end_label = trip.get("end_location", {}).get("address") or trip.get("route_name") or "Route end"
    return speeds, distances, durations, points, total_distance, start_label, end_label


def resolve_database(client: MongoClient, mongo_db: Optional[str]) -> Database:
    if mongo_db:
        return client[mongo_db]
    try:
        return client.get_default_database()
    except ConfigurationError as exc:
        raise ValueError("Mongo database name is required") from exc


def find_device(devices: Collection, device_id: Optional[str], vehicle_id: Optional[str]) -> Dict[str, Any]:
    if device_id:
        device = devices.find_one({"device_id": device_id}) or devices.find_one({"imei": device_id})
        if device:
            return device
    if vehicle_id:
        device = devices.find_one({"assigned_vehicle_id": vehicle_id})
        if device:
            return device
    raise ValueError("Device assignment not found")


def fetch_trip_context(
    mongo_uri: str,
    mongo_db: Optional[str],
    scheduled_trip_id: Optional[str],
    device_id: Optional[str],
    trip_period: Optional[str],
    day_name: Optional[str],
    default_speed_kmh: float
) -> Tuple[List[float], List[float], List[float], List[Tuple[float, float]], float, str, str, str, Dict[str, Any]]:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        db = resolve_database(client, mongo_db)
        scheduled_trips = db["scheduledtrips"]
        devices = db["devices"]
        trip: Optional[Dict[str, Any]] = None
        device: Optional[Dict[str, Any]] = None
        if scheduled_trip_id:
            trip = scheduled_trips.find_one({"scheduled_trip_id": scheduled_trip_id})
            if not trip:
                raise ValueError("Scheduled trip not found")
            vehicle_id = trip.get("vehicle_id")
            device = find_device(devices, device_id, vehicle_id)
        else:
            if not device_id:
                raise ValueError("Device identifier is required when scheduled trip id is absent")
            device = find_device(devices, device_id, None)
            vehicle_id = device.get("assigned_vehicle_id")
            if not vehicle_id:
                raise ValueError("Device has no assigned vehicle")
            query: Dict[str, Any] = {"vehicle_id": vehicle_id, "is_active": True}
            if trip_period:
                query["trip_period"] = trip_period
            if day_name:
                query[f"repeat_days.{day_name}"] = True
            trip = scheduled_trips.find_one(query, sort=[("scheduled_start_time", 1)])
            if not trip:
                trip = scheduled_trips.find_one({"vehicle_id": vehicle_id}, sort=[("updatedAt", -1)])
            if not trip:
                raise ValueError("No scheduled trip found for vehicle")
        speeds, distances, durations, points, total_distance, start_label, end_label = build_trip_route(trip, default_speed_kmh)
        tracker_id = device.get("device_id") if device else "simulator"
        summary = {
            "scheduled_trip_id": trip.get("scheduled_trip_id"),
            "vehicle_id": trip.get("vehicle_id"),
            "driver_id": trip.get("driver_id"),
            "route_name": trip.get("route_name"),
            "scheduled_start_time": trip.get("scheduled_start_time"),
            "trip_period": trip.get("trip_period"),
            "device_id": device.get("device_id") if device else None,
            "imei": device.get("imei") if device else None
        }
        return speeds, distances, durations, points, total_distance, start_label, end_label, tracker_id, summary
    except PyMongoError as exc:
        raise ValueError(str(exc)) from exc
    finally:
        client.close()


def post(url: str, message_data: Dict[str, Any], api_key: str) -> requests.Response:
    headers = {"Authorization": api_key} if api_key else {}
    payload = [message_data]
    try:
        response = requests.post(url, json=payload, headers=headers)
        if 200 <= response.status_code < 300:
            try:
                response_data = response.json()
                if isinstance(response_data, dict) and "responses" in response_data:
                    for item in response_data["responses"]:
                        status = item.get("status", "unknown")
                        message_type = item.get("message_type", "unknown")
                        if status == "success":
                            data_msg = item.get("data", {}).get("message", "")
                            print(f"✓ {message_type}: {data_msg}")
                        elif status == "error":
                            error = item.get("error", "No error description")
                            print(f"✗ Error for {message_type}: {error}")
            except ValueError:
                print(f"Non-JSON Response: {response.text}")
        else:
            print(f"✗ Failed to POST: HTTP {response.status_code}")
        return response
    except requests.RequestException as exc:
        print(f"✗ Network Error: {str(exc)}")
        return requests.Response()


if __name__ == "__main__":
    with open("default.json") as f:
        config = json.load(f)
    parser = argparse.ArgumentParser(description="Simulate a GPS tracker")
    parser.add_argument("--start", default=config.get("start"))
    parser.add_argument("--end", default=config.get("end"))
    parser.add_argument("--interval", type=int, default=config.get("interval", 5))
    parser.add_argument("--duration", type=int, default=config.get("duration", 0))
    parser.add_argument("--api_key", default=config.get("api_key"))
    parser.add_argument("--webhook_url", default=config.get("webhook_url"))
    parser.add_argument("--tracker_id", default=config.get("tracker_id"))
    parser.add_argument("--webhook_api_key", default=config.get("webhook_api_key", ""))
    parser.add_argument("--mongo_uri", default=config.get("mongo_uri"))
    parser.add_argument("--mongo_db", default=config.get("mongo_db"))
    parser.add_argument("--scheduled_trip_id", default=config.get("scheduled_trip_id"))
    parser.add_argument("--device_id", default=config.get("device_id"))
    parser.add_argument("--trip_period", default=config.get("trip_period"))
    parser.add_argument("--day", default=config.get("day"))
    parser.add_argument("--default_speed_kmh", type=float, default=config.get("default_speed_kmh", 30.0))
    args = parser.parse_args()
    use_mongo = bool(args.scheduled_trip_id or args.device_id)
    if not args.webhook_url:
        parser.error("Webhook URL is required")
    interval = max(args.interval or 1, 1)
    webhook_api_key = args.webhook_api_key or ""
    if use_mongo:
        if not args.mongo_uri:
            parser.error("Mongo URI is required when using scheduled trip or device mode")
        day_name = None
        if args.day:
            day_name = args.day
        else:
            day_name = datetime.utcnow().strftime("%A")
        speeds, distances, durations, coordinates, total_distance, start_label, end_label, tracker_id, summary = fetch_trip_context(
            args.mongo_uri,
            args.mongo_db,
            args.scheduled_trip_id,
            args.device_id,
            args.trip_period,
            day_name,
            args.default_speed_kmh
        )
        trackerId = tracker_id
        total_duration = float(np.sum(np.divide(distances, speeds, out=np.zeros_like(distances), where=np.array(speeds) > 0)))
        duration_seconds = args.duration if args.duration and args.duration > 0 else int(math.ceil(total_duration))
        duration_seconds = max(duration_seconds, interval)
        start_coords = coordinates[0]
        end_coords = coordinates[-1]
        print(
            f"""
SIMULATING SCHEDULED TRIP
TRACKER ID: {trackerId}
TRIP: {summary.get('scheduled_trip_id') or 'dynamic'}
VEHICLE: {summary.get('vehicle_id') or 'unknown'}
DRIVER: {summary.get('driver_id') or 'unknown'}
ROUTE: {summary.get('route_name') or 'scheduled route'}
PERIOD: {summary.get('trip_period') or 'na'} at {summary.get('scheduled_start_time') or 'na'}
FROM: {start_label} (lat: {start_coords[0]}, lng: {start_coords[1]})
TO: {end_label} (lat: {end_coords[0]}, lng: {end_coords[1]})

Total route distance: {int(total_distance)}m
Simulated duration: {duration_seconds}s
Update intervals: {interval}s

TO EXIT, press Ctrl+C
"""
        )
    else:
        if not args.start or not args.end or not args.api_key:
            parser.error("Start, end, and api_key are required for Google Maps mode")
        google_maps_service = GoogleMapsService(args.api_key)
        from_addr_feature = google_maps_service.get_coordinates(args.start)
        to_addr_feature = google_maps_service.get_coordinates(args.end)
        total_distance, total_duration, speeds, distances, durations, coordinates = google_maps_service.get_directions(
            from_addr_feature,
            to_addr_feature
        )
        trackerId = args.tracker_id or "simulated-tracker"
        duration_seconds = args.duration if args.duration and args.duration > 0 else int(total_duration)
        duration_seconds = max(duration_seconds, interval)
        print(
            f"""
SIMULATING ROUTE
TRACKER ID: {trackerId}
FROM: {args.start} (lat: {from_addr_feature['geometry']['coordinates'][1]}, lng: {from_addr_feature['geometry']['coordinates'][0]})
TO: {args.end} (lat: {to_addr_feature['geometry']['coordinates'][1]}, lng: {to_addr_feature['geometry']['coordinates'][0]})

Total route distance: {int(total_distance)}m
Total route duration: {int(total_duration)}s

Simulated duration: {duration_seconds}s
Update intervals: {interval}s

TO EXIT, press Ctrl+C
"""
        )
    tracker_sim = TrackerSim(speeds, distances, durations, coordinates)
    boot_message = {
        "message_type": "boot_notification",
        "tracker_id": trackerId,
        "firmware_version": "GPS_v1.0",
        "module_model": "Simulated-GPS",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    post(args.webhook_url, boot_message, webhook_api_key)
    pbar = tqdm(range(0, duration_seconds, interval))
    for elapsed in pbar:
        coords_data = tracker_sim.get_extended_coords(elapsed)
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        location_message = {
            "message_type": "location_update",
            "tracker_id": trackerId,
            "latitude": coords_data["latitude"],
            "longitude": coords_data["longitude"],
            "altitude": coords_data["altitude"],
            "speed_kmh": coords_data["speed_kmh"],
            "course": coords_data["course"],
            "satellites": coords_data["satellites"],
            "fix_quality": coords_data["fix_quality"],
            "hdop": coords_data["hdop"],
            "timestamp": timestamp
        }
        pbar.set_description(
            f"Elapsed time: {elapsed}s, Coords: {coords_data['latitude']:.4f}, {coords_data['longitude']:.4f}"
        )
        post(args.webhook_url, location_message, webhook_api_key)
        heartbeat_message = {
            "message_type": "heartbeat",
            "tracker_id": trackerId,
            "status": "active",
            "satellites": coords_data["satellites"],
            "timestamp": timestamp
        }
        post(args.webhook_url, heartbeat_message, webhook_api_key)
        status_message = {
            "message_type": "status_notification",
            "tracker_id": trackerId,
            "fix_status": "valid" if coords_data["fix_quality"] > 0 else "invalid",
            "satellites": coords_data["satellites"],
            "hdop": coords_data["hdop"],
            "timestamp": timestamp
        }
        post(args.webhook_url, status_message, webhook_api_key)
        sleep(interval)
