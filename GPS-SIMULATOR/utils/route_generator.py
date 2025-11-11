import math
from typing import List, Tuple, Dict, Any

import numpy as np
import requests


class RouteGenerator:
    """Generate route coordinates from start and end GPS points"""

    OSRM_ENDPOINT = "https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson"
    MAX_POINTS = 500

    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two GPS points in meters
        """
        R = 6371000
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

        lats = np.linspace(lat_start, lat_end, num_points)
        lngs = np.linspace(lng_start, lng_end, num_points)

        return [(lats[i], lngs[i]) for i in range(num_points)]

    @staticmethod
    def fetch_osrm_coordinates(start: Dict[str, float], end: Dict[str, float]) -> Tuple[List[Tuple[float, float]], float]:
        url = RouteGenerator.OSRM_ENDPOINT.format(
            start_lng=start["lng"],
            start_lat=start["lat"],
            end_lng=end["lng"],
            end_lat=end["lat"]
        )
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            routes = data.get("routes") or []
            if not routes:
                return [], 0.0
            primary_route = routes[0]
            geometry = primary_route.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []
            if len(coordinates) < 2:
                return [], 0.0
            if len(coordinates) > RouteGenerator.MAX_POINTS:
                step = max(1, len(coordinates) // RouteGenerator.MAX_POINTS)
                coordinates = coordinates[::step]
            latlng_coordinates = [(float(coord[1]), float(coord[0])) for coord in coordinates]
            distance = float(primary_route.get("distance", 0.0))
            return latlng_coordinates, distance
        except (requests.RequestException, ValueError, TypeError):
            return [], 0.0

    @staticmethod
    def generate_route(
        start: Dict[str, float],
        end: Dict[str, float]
    ) -> Tuple[float, List[float], List[float], List[float], List[Tuple[float, float]]]:
        osrm_coordinates, osrm_distance = RouteGenerator.fetch_osrm_coordinates(start, end)
        if osrm_coordinates:
            coordinates = osrm_coordinates
            total_distance = osrm_distance if osrm_distance > 0 else 0.0
        else:
            coordinates = RouteGenerator.interpolate_coordinates(start, end, num_points=100)
            total_distance = 0.0

        distances = []
        speeds = []
        durations = []

        average_speed_ms = 60 / 3.6

        for i in range(1, len(coordinates)):
            lat1, lng1 = coordinates[i - 1]
            lat2, lng2 = coordinates[i]

            dist = RouteGenerator.haversine_distance(lat1, lng1, lat2, lng2)
            distances.append(dist)
            total_distance += dist if osrm_distance == 0.0 else 0.0

            duration = dist / average_speed_ms if average_speed_ms > 0 else 0
            durations.append(duration)

            speed_variation = average_speed_ms * (0.9 + 0.2 * np.random.random())
            speeds.append(speed_variation)

        if osrm_distance > 0:
            total_distance = osrm_distance
        else:
            total_distance = sum(distances)

        return total_distance, speeds, distances, durations, coordinates
