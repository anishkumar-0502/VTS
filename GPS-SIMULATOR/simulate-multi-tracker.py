#!/usr/bin/env python3
"""
Multi-Device GPS Tracker Simulator
Simulates multiple GPS devices simultaneously along different routes
"""

import argparse
import json
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List
from time import sleep
from tqdm import tqdm
import sys
import requests
import numpy as np

from utils.route_generator import RouteGenerator
from utils.tracker_sim import TrackerSim


class DeviceSimulator:
    """Simulates a single GPS device"""
    
    def __init__(
        self,
        device_id: str,
        tracker_id: str,
        route_name: str,
        start_coords: Dict[str, float],
        end_coords: Dict[str, float],
        webhook_url: str,
        webhook_api_key: str,
        interval: int = 2,
        duration: int = 0
    ):
        self.device_id = device_id
        self.tracker_id = tracker_id
        self.route_name = route_name
        self.webhook_url = webhook_url
        self.webhook_api_key = webhook_api_key
        self.interval = interval
        self.duration = duration
        
        # Generate route
        total_distance, speeds, distances, durations, coordinates = RouteGenerator.generate_route(
            start_coords, end_coords
        )
        
        self.tracker_sim = TrackerSim(speeds, distances, durations, coordinates)
        self.total_distance = total_distance
        self.total_duration = int(sum(durations))
        self.effective_duration = duration if duration > 0 else self.total_duration
        
    def get_extended_coords(self, elapsed_time: int) -> Dict[str, Any]:
        """Get GPS coordinates with extended data for a specific elapsed time"""
        lat, lng = self.tracker_sim.get_coords(elapsed_time)
        
        # Get speed info
        target_segment_index = np.searchsorted(self.tracker_sim.cumulative_times, elapsed_time)
        speed_ms = (
            self.tracker_sim.speeds[target_segment_index - 1]
            if target_segment_index > 0 and target_segment_index <= len(self.tracker_sim.speeds)
            else 0
        )
        speed_kmh = speed_ms * 3.6
        
        # Calculate course
        course = 0.0
        if target_segment_index > 1:
            prev_lat, prev_lng = self.tracker_sim.coordinates[target_segment_index - 2]
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
    
    def post(self, message_type: str, data: dict) -> bool:
        """POST data to webhook"""
        headers = {"Authorization": self.webhook_api_key}
        payload = [{
            "message_type": message_type,
            "tracker_id": self.tracker_id,
            **data
        }]
        
        try:
            response = requests.post(self.webhook_url, json=payload, headers=headers)
            if response.status_code >= 200 and response.status_code < 300:
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'responses' in response_data:
                        for resp in response_data['responses']:
                            status = resp.get('status', 'unknown')
                            if status == 'success':
                                print(f"[{self.device_id}] ✓ {message_type}")
                                return True
                            elif status == 'error':
                                error = resp.get('error', 'Unknown error')
                                print(f"[{self.device_id}] ✗ {message_type}: {error}")
                                return False
                except ValueError:
                    pass
            else:
                print(f"[{self.device_id}] HTTP {response.status_code}")
                return False
            return True
        except requests.RequestException as e:
            print(f"[{self.device_id}] Network Error: {str(e)}")
            return False
    
    def simulate(self):
        """Run the simulation for this device"""
        print(f"\n[{self.device_id}] Starting simulation: {self.route_name}")
        print(f"[{self.device_id}] Total distance: {self.total_distance:.0f}m, Duration: {self.total_duration}s")
        print(f"[{self.device_id}] Effective duration: {self.effective_duration}s, Interval: {self.interval}s\n")
        
        # Send BootNotification
        boot_data = {
            "firmware_version": "GPS_v1.0",
            "module_model": "Simulated-GPS-Multi",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        self.post("boot_notification", boot_data)
        
        # Main simulation loop
        pbar = tqdm(
            range(0, self.effective_duration, self.interval),
            desc=f"[{self.device_id}]",
            position=int(self.device_id.split('-')[1]) - 1 if '-' in self.device_id else 0
        )
        
        for time_elapsed in pbar:
            coords_data = self.get_extended_coords(time_elapsed)
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # LocationUpdate
            location_data = {
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
                f"[{self.device_id}] {coords_data['latitude']:.4f}, {coords_data['longitude']:.4f}, "
                f"{coords_data['speed_kmh']} km/h"
            )
            self.post("location_update", location_data)
            
            # Heartbeat
            heartbeat_data = {
                "status": "active",
                "satellites": coords_data["satellites"],
                "timestamp": timestamp
            }
            self.post("heartbeat", heartbeat_data)
            
            # StatusNotification
            status_data = {
                "fix_status": "valid" if coords_data["fix_quality"] > 0 else "invalid",
                "satellites": coords_data["satellites"],
                "hdop": coords_data["hdop"],
                "timestamp": timestamp
            }
            self.post("status_notification", status_data)
            
            sleep(self.interval)
        
        print(f"\n[{self.device_id}] Simulation complete!")


def load_config(config_file: str) -> Dict[str, Any]:
    """Load configuration from JSON file"""
    with open(config_file) as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Simulate multiple GPS trackers")
    parser.add_argument(
        "--config",
        help="Routes and devices configuration file",
        default="routes.json"
    )
    parser.add_argument(
        "--webhook_url",
        help="Webhook URL to POST GPS data",
        default="http://localhost:8787/webhook"
    )
    parser.add_argument(
        "--webhook_api_key",
        help="API key for webhook authentication",
        default="my-secret-key-123"
    )
    parser.add_argument(
        "--interval",
        type=int,
        help="Update interval in seconds",
        default=2
    )
    parser.add_argument(
        "--duration",
        type=int,
        help="Duration in seconds (0 to simulate full route)",
        default=0
    )
    parser.add_argument(
        "--device",
        type=int,
        help="Simulate specific device ID (1, 2, or 3). If not specified, simulate all devices",
        default=None
    )
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    routes_map = {route["id"]: route for route in config["routes"]}
    devices = config["devices"]
    
    # Filter devices if specific device requested
    if args.device:
        devices = [d for d in devices if d["id"] == args.device]
        if not devices:
            print(f"Device {args.device} not found in configuration")
            sys.exit(1)
    
    # Create simulator instances
    simulators: List[DeviceSimulator] = []
    
    for device in devices:
        route = routes_map.get(device["route_id"])
        if not route:
            print(f"Route {device['route_id']} not found for device {device['id']}")
            continue
        
        simulator = DeviceSimulator(
            device_id=f"Device-{device['id']}",
            tracker_id=device["tracker_id"],
            route_name=route["name"],
            start_coords=route["start"],
            end_coords=route["end"],
            webhook_url=args.webhook_url,
            webhook_api_key=args.webhook_api_key,
            interval=args.interval,
            duration=args.duration
        )
        simulators.append(simulator)
    
    if not simulators:
        print("No simulators created")
        sys.exit(1)
    
    # Print startup info
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║          MULTI-DEVICE GPS TRACKER SIMULATOR                    ║
╚════════════════════════════════════════════════════════════════╝

Webhook URL: {args.webhook_url}
Devices: {len(simulators)}
Update Interval: {args.interval}s
Duration: {'Full route' if args.duration == 0 else f'{args.duration}s'}

TO EXIT, press Ctrl+C
""")
    
    # Create and start threads
    threads: List[threading.Thread] = []
    for simulator in simulators:
        thread = threading.Thread(target=simulator.simulate, daemon=True)
        threads.append(thread)
        thread.start()
    
    # Wait for all threads to complete
    try:
        for thread in threads:
            thread.join()
        print("\n✅ All simulations completed!")
    except KeyboardInterrupt:
        print("\n\n🛑 Simulation interrupted by user")
        sys.exit(0)


if __name__ == "__main__":
    main()
