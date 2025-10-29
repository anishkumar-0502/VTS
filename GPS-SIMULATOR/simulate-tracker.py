#!/usr/bin/env python3

import argparse
import json
from time import sleep
from datetime import datetime
import numpy as np
import requests
import polyline
from typing import Dict, Any, TypedDict, List, Tuple
from tqdm import tqdm

class LocationDict(TypedDict):
    lng: float
    lat: float

class GoogleMapsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api"

    def get_coordinates(self, location: str) -> Dict[str, Any]:
        url = f"{self.base_url}/geocode/json"
        params = {
            "address": location,
            "key": self.api_key
        }
        
        response = requests.get(url, params=params)
        data: Dict[str, Any] = response.json()
        
        if data["status"] != "OK" or not data.get("results"):
            raise ValueError(f"Location {location} not found")
        
        result: Dict[str, Any] = data["results"][0]
        location_data: LocationDict = result["geometry"]["location"]
        
        feature = {
            "geometry": {
                "coordinates": [location_data["lng"], location_data["lat"]]
            },
            "properties": {
                "place_name": result["formatted_address"]
            }
        }
        
        return feature

    def get_directions(
        self, from_location: Dict[str, Any], to_location: Dict[str, Any]
    ) -> Tuple[
        float, float, List[float], List[float], List[float], List[Tuple[float, float]]
    ]:
        from_coords = from_location["geometry"]["coordinates"]
        to_coords = to_location["geometry"]["coordinates"]
        
        url = f"{self.base_url}/directions/json"
        params = {
            "origin": f"{from_coords[1]},{from_coords[0]}",
            "destination": f"{to_coords[1]},{from_coords[0]}",
            "mode": "driving",
            "key": self.api_key
        }
        
        response = requests.get(url, params=params)
        data: Dict[str, Any] = response.json()
        
        if data["status"] != "OK" or not data.get("routes"):
            raise ValueError("No route found")
            
        route: Dict[str, Any] = data["routes"][0]
        leg: Dict[str, Any] = route["legs"][0]
        
        total_distance = leg["distance"]["value"]
        total_duration = leg["duration"]["value"]
        
        encoded_polyline = route["overview_polyline"]["points"]
        decoded_polyline = polyline.decode(encoded_polyline)
        
        coordinates = [(point[1], point[0]) for point in decoded_polyline]
        
        distances = []
        durations = []
        speeds = []
        
        for i in range(1, len(coordinates)):
            lat1, lng1 = coordinates[i-1][1], coordinates[i-1][0]
            lat2, lng2 = coordinates[i][1], coordinates[i][0]
            dist = np.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2) * 111000
            distances.append(dist)
            segment_duration = (dist / total_distance) * total_duration if total_distance > 0 else 0
            durations.append(segment_duration)
            speed = dist / segment_duration if segment_duration > 0 else 0
            speeds.append(speed)
        
        return (
            total_distance,
            total_duration,
            speeds,
            distances,
            durations,
            coordinates,
        )

class TrackerSim:
    def __init__(
        self,
        speeds: list[float],
        distances: list[float],
        durations: list[float],
        coordinates: list[tuple[float, float]],
    ) -> None:
        self.speeds = speeds
        self.distances = distances
        self.durations = durations
        self.coordinates = coordinates
        self.segment_times = np.divide(self.distances, self.speeds, out=np.zeros_like(self.distances), where=self.speeds!=0)
        self.cumulative_times = np.cumsum(self.segment_times)

    def get_coords(self, elapsed_time: int) -> tuple[float, float]:
        target_segment_index = np.searchsorted(self.cumulative_times, elapsed_time)
        if target_segment_index > 0 and target_segment_index < len(self.coordinates):
            start_coords = self.coordinates[target_segment_index - 1]
            end_coords = self.coordinates[target_segment_index]
            segment_duration = self.segment_times[target_segment_index - 1]
            cumulative_time_before_segment = (
                self.cumulative_times[target_segment_index - 2]
                if target_segment_index > 1
                else 0
            )
            fraction = (elapsed_time - cumulative_time_before_segment) / segment_duration if segment_duration > 0 else 0
            estimated_lat = start_coords[0] + (end_coords[0] - start_coords[0]) * fraction
            estimated_lng = start_coords[1] + (end_coords[1] - start_coords[1]) * fraction
            return estimated_lat, estimated_lng
        else:
            return self.coordinates[0]

    def get_extended_coords(self, elapsed_time: int) -> Dict[str, Any]:
        lat, lng = self.get_coords(elapsed_time)
        target_segment_index = np.searchsorted(self.cumulative_times, elapsed_time)
        speed_ms = self.speeds[target_segment_index - 1] if target_segment_index > 0 and target_segment_index <= len(self.speeds) else 0
        speed_kmh = speed_ms * 3.6
        course = 0.0
        if target_segment_index > 1:
            prev_lat, prev_lng = self.coordinates[target_segment_index - 2]
            delta_lat = lat - prev_lat
            delta_lng = lng - prev_lng
            course = np.degrees(np.arctan2(delta_lng, delta_lat)) % 360
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

def post(url: str, message_data: dict, api_key: str) -> requests.Response:
    headers = {"Authorization": api_key}
    payload = [message_data]
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code >= 200 and response.status_code < 300:
            try:
                response_data = response.json()
                if isinstance(response_data, dict):
                    if 'responses' in response_data:
                        for resp in response_data['responses']:
                            status = resp.get('status', 'unknown')
                            msg_type = resp.get('message_type', 'unknown')
                            if status == 'success':
                                data_msg = resp.get('data', {}).get('message', '')
                                print(f"✓ {msg_type}: {data_msg}")
                            elif status == 'error':
                                error = resp.get('error', 'No error description')
                                print(f"✗ Error for {msg_type}: {error}")
            except ValueError:
                print(f"Non-JSON Response: {response.text}")
        else:
            print(f"✗ Failed to POST: HTTP {response.status_code}")
        return response
    except requests.RequestException as e:
        print(f"✗ Network Error: {str(e)}")
        return requests.Response()

if __name__ == "__main__":
    with open("default.json") as f:
        config = json.load(f)

    parser = argparse.ArgumentParser(description="Simulate a GPS tracker")
    parser.add_argument(
        "--start",
        help="Start location",
        required=config.get("start") is None,
        default=config.get("start"),
    )
    parser.add_argument(
        "--end",
        help="End location",
        required=config.get("end") is None,
        default=config.get("end"),
    )
    parser.add_argument(
        "--interval",
        type=int,
        help="Interval in seconds",
        required=config.get("interval") is None,
        default=config.get("interval"),
    )
    parser.add_argument(
        "--duration",
        type=int,
        help="Duration in seconds (0 to simulate the route once & -1 to loop the route infinitely)",
        required=config.get("duration") is None,
        default=config.get("duration"),
    )
    parser.add_argument(
        "--api_key",
        help="Google Maps API key",
        required=config.get("api_key") is None,
        default=config.get("api_key"),
    )
    parser.add_argument(
        "--webhook_url",
        help="Webhook URL to which the simulated coordinates JSON are POSTed",
        required=config.get("webhook_url") is None,
        default=config.get("webhook_url"),
    )
    parser.add_argument(
        "--tracker_id",
        help="Tracker ID which will be sent in the POST request",
        required=config.get("tracker_id") is None,
        default=config.get("tracker_id"),
    )
    parser.add_argument(
        "--webhook_api_key",
        help="Api key for the webhook",
        required=config.get("webhook_api_key") is None,
        default=config.get("webhook_api_key"),
    )
    args = parser.parse_args()

    from_location = args.start
    to_location = args.end
    interval = args.interval
    duration = args.duration
    api_key = args.api_key
    webhook_url = args.webhook_url
    trackerId = args.tracker_id
    webhook_api_key = args.webhook_api_key

    google_maps_service = GoogleMapsService(api_key)
    from_addr_feature = google_maps_service.get_coordinates(from_location)
    to_addr_feature = google_maps_service.get_coordinates(to_location)

    total_distance, total_duration, speeds, distances, durations, coordinates = (
        google_maps_service.get_directions(from_addr_feature, to_addr_feature)
    )

    tracker_sim = TrackerSim(speeds, distances, durations, coordinates)
    duration = duration if duration > 0 else int(total_duration)

    print(
        f"""
SIMULATING ROUTE
TRACKER ID: {trackerId}
FROM: {from_location} (lat: {from_addr_feature['geometry']['coordinates'][1]}, lng: {from_addr_feature['geometry']['coordinates'][0]})
TO: {to_location} (lat: {to_addr_feature['geometry']['coordinates'][1]}, lng: {to_addr_feature['geometry']['coordinates'][0]})

Total route distance: {total_distance}m
Total route duration: {total_duration}s

Simulated duration: {duration}s
Update intervals: {interval}s

TO EXIT, press Ctrl+C
"""
    )

    boot_message = {
        "message_type": "boot_notification",
        "tracker_id": trackerId,
        "firmware_version": "GPS_v1.0",
        "module_model": "Simulated-GPS",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    post(webhook_url, boot_message, webhook_api_key)

    pbar = tqdm(range(0, duration, interval))
    for time in pbar:
        coords_data = tracker_sim.get_extended_coords(time)
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
        pbar.set_description(f"Elapsed time: {time}s, Coords: {coords_data['latitude']:.4f}, {coords_data['longitude']:.4f}")
        post(webhook_url, location_message, webhook_api_key)

        heartbeat_message = {
            "message_type": "heartbeat",
            "tracker_id": trackerId,
            "status": "active",
            "satellites": coords_data["satellites"],
            "timestamp": timestamp
        }
        post(webhook_url, heartbeat_message, webhook_api_key)

        status_message = {
            "message_type": "status_notification",
            "tracker_id": trackerId,
            "fix_status": "valid" if coords_data["fix_quality"] > 0 else "invalid",
            "satellites": coords_data["satellites"],
            "hdop": coords_data["hdop"],
            "timestamp": timestamp
        }
        post(webhook_url, status_message, webhook_api_key)

        sleep(interval)
