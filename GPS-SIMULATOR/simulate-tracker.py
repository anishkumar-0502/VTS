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

# Existing GoogleMapsService class (unchanged)
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

# Existing TrackerSim class (unchanged)
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
        speed_kmh = speed_ms * 3.6  # Convert m/s to km/h
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

# Modified post function to log only the backend message for success
def post(url: str, data: dict, api_key: str) -> requests.Response:
    headers = {"Authorization": api_key}
    try:
        response = requests.post(url, json=data, headers=headers)
        # Parse and log response
        if response.status_code >= 200 and response.status_code < 300:
            try:
                response_data = response.json()
                if isinstance(response_data, list) and len(response_data) >= 3:
                    response_type, response_message_id, payload = response_data[0], response_data[1], response_data[2]
                    if response_type == "3":
                        # Success response: log only the message
                        print(f"{data[2]}: {payload.get('message', 'No message')}")
                    elif response_type == "4":
                        # Error response
                        print(f"Error for {data[2]} (ID: {response_message_id}): "
                              f"ErrorCode={payload.get('errorCode', 'Unknown')}, "
                              f"ErrorDescription={payload.get('errorDescription', 'No description')}")
                    else:
                        print(f"Unknown Response for {data[2]} (ID: {response_message_id}): {response_data}")
                else:
                    print(f"Invalid Response Format for {data[2]}: {response.text}")
            except ValueError:
                print(f"Non-JSON Response for {data[2]}: {response.text}")
        else:
            print(f"Failed to POST {data[2]}: HTTP {response.status_code} - {response.text}")
        return response
    except requests.RequestException as e:
        print(f"Network Error for {data[2]}: {str(e)}")
        return requests.Response()  # Return empty response to continue simulation

# Main script with OCPP-like JSON frames and response handling
if __name__ == "__main__":
    # Load default values from config file
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

    # Initialize GoogleMapsService and get route data
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

    # Send BootNotification
    boot_message = [
        "2",
        f"{trackerId}_{int(datetime.now().timestamp())}",
        "BootNotification",
        {
            "vehicle_id": trackerId,
            "firmware_version": "GPS_v1.0",
            "module_model": "Simulated-GPS",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    ]
    response = post(webhook_url, boot_message, webhook_api_key) # type: ignore

    # Main loop for LocationUpdate, Heartbeat, StatusNotification
    pbar = tqdm(range(0, duration, interval))
    for time in pbar:
        coords_data = tracker_sim.get_extended_coords(time)
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        message_id = f"{trackerId}_{int(datetime.now().timestamp())}"

        # LocationUpdate (like $GPGGA, $GPRMC)
        location_message = [
            "2",
            message_id,
            "LocationUpdate",
            {
                "vehicle_id": trackerId,
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
        ]
        pbar.set_description(f"Elapsed time: {time}s, Coords: {coords_data['latitude']}, {coords_data['longitude']}")
        response = post(webhook_url, location_message, webhook_api_key) # type: ignore

        # Heartbeat
        heartbeat_message = [
            "2",
            f"{trackerId}_{int(datetime.now().timestamp())}",
            "Heartbeat",
            {
                "vehicle_id": trackerId,
                "status": "active",
                "satellites": coords_data["satellites"],
                "timestamp": timestamp
            }
        ]
        response = post(webhook_url, heartbeat_message, webhook_api_key) # type: ignore

        # StatusNotification
        status_message = [
            "2",
            f"{trackerId}_{int(datetime.now().timestamp())}",
            "StatusNotification",
            {
                "vehicle_id": trackerId,
                "fix_status": "valid" if coords_data["fix_quality"] > 0 else "invalid",
                "satellites": coords_data["satellites"],
                "hdop": coords_data["hdop"],
                "timestamp": timestamp
            }
        ]
        response = post(webhook_url, status_message, webhook_api_key) # type: ignore

        sleep(interval)