import requests
import polyline
import numpy as np
from typing import Dict, Any, TypedDict, List, Tuple


class LocationDict(TypedDict):
    lng: float
    lat: float


class GoogleMapsService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://maps.googleapis.com/maps/api"

    def get_coordinates(self, location: str) -> Dict[str, Any]:
        """
        Get coordinates for a location using Google Maps Geocoding API
        """
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
        
        # Create a feature similar to Mapbox's format for compatibility
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
        """
        Get directions between two locations using Google Maps Directions API
        """
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
        
        if data["status"] != "OK" or not data.get("routes"):
            raise ValueError("No route found")
            
        route: Dict[str, Any] = data["routes"][0]
        leg: Dict[str, Any] = route["legs"][0]
        
        # Extract total distance and duration
        total_distance = leg["distance"]["value"]  # in meters
        total_duration = leg["duration"]["value"]  # in seconds
        
        # Extract the polyline and decode it to get coordinates
        encoded_polyline = route["overview_polyline"]["points"]
        decoded_polyline = polyline.decode(encoded_polyline)
        
        # Convert to the format expected by the tracker simulator
        coordinates = [(point[1], point[0]) for point in decoded_polyline]  # (lng, lat) format
        
        # Calculate speeds, distances, and durations for each segment
        # This is an approximation since Google doesn't provide this level of detail
        distances = []
        durations = []
        speeds = []
        
        for i in range(1, len(coordinates)):
            # Calculate distance between consecutive points (simplified)
            lat1, lng1 = coordinates[i-1][1], coordinates[i-1][0]
            lat2, lng2 = coordinates[i][1], coordinates[i][0]
            
            # Simple Euclidean distance (not accurate for real-world distances)
            # For a more accurate calculation, you would use the Haversine formula
            dist = np.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2) * 111000  # rough conversion to meters
            distances.append(dist)
            
            # Estimate duration based on total duration proportional to distance
            segment_duration = (dist / total_distance) * total_duration if total_distance > 0 else 0
            durations.append(segment_duration)
            
            # Calculate speed (m/s)
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