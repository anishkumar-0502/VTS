import numpy as np
from typing import List, Tuple, Dict, Any
import math


class RouteGenerator:
    """Generate route coordinates from start and end GPS points"""
    
    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two GPS points in meters
        """
        R = 6371000  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)
        
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    @staticmethod
    def interpolate_coordinates(
        start: Dict[str, float], 
        end: Dict[str, float], 
        num_points: int = 50
    ) -> List[Tuple[float, float]]:
        """
        Generate interpolated coordinates between start and end points
        Returns list of (lat, lng) tuples
        """
        if num_points < 2:
            num_points = 2
            
        lat_start = start["lat"]
        lng_start = start["lng"]
        lat_end = end["lat"]
        lng_end = end["lng"]
        
        # Simple linear interpolation
        lats = np.linspace(lat_start, lat_end, num_points)
        lngs = np.linspace(lng_start, lng_end, num_points)
        
        return [(lats[i], lngs[i]) for i in range(num_points)]
    
    @staticmethod
    def generate_route(
        start: Dict[str, float], 
        end: Dict[str, float]
    ) -> Tuple[float, List[float], List[float], List[float], List[Tuple[float, float]]]:
        """
        Generate route data from start and end coordinates
        Returns: (total_distance, speeds, distances, durations, coordinates)
        """
        # Generate interpolated coordinates
        coordinates = RouteGenerator.interpolate_coordinates(start, end, num_points=100)
        
        # Calculate distances and speeds for each segment
        distances = []
        speeds = []
        durations = []
        
        # Assume average speed of 60 km/h for route simulation
        average_speed_ms = (60 / 3.6)  # Convert km/h to m/s
        
        for i in range(1, len(coordinates)):
            lat1, lng1 = coordinates[i - 1]
            lat2, lng2 = coordinates[i]
            
            # Calculate distance using haversine
            dist = RouteGenerator.haversine_distance(lat1, lng1, lat2, lng2)
            distances.append(dist)
            
            # Calculate duration and speed (vary slightly for realism)
            duration = dist / average_speed_ms if average_speed_ms > 0 else 0
            durations.append(duration)
            
            # Add slight variation to speed (±10%)
            speed_variation = average_speed_ms * (0.9 + 0.2 * np.random.random())
            speeds.append(speed_variation)
        
        total_distance = sum(distances)
        
        return (total_distance, speeds, distances, durations, coordinates)
