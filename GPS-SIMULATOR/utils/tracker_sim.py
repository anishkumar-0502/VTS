import numpy as np


class TrackerSim:
    def __init__(
        self,
        speeds: list[float],
        distances: list[float],
        durations: list[float],
        coordinates: list[tuple[float, float]],
    ) -> None:
        self.speeds = np.array(speeds, dtype=float)
        self.distances = np.array(distances, dtype=float)
        self.durations = np.array(durations, dtype=float)
        self.coordinates = np.array(coordinates, dtype=float)

        if self.coordinates.shape[0] < 2:
            raise ValueError("TrackerSim requires at least two coordinates")

        with np.errstate(divide='ignore', invalid='ignore'):
            self.segment_times = np.divide(
                self.distances,
                self.speeds,
                out=np.full_like(self.distances, fill_value=1.0, dtype=float),
                where=self.speeds > 0
            )
        self.cumulative_times = np.cumsum(self.segment_times)

    def get_coords(self, elapsed_time: int) -> tuple[float, float]:
        if elapsed_time <= 0:
            return tuple(self.coordinates[0])
        if elapsed_time >= self.cumulative_times[-1]:
            return tuple(self.coordinates[-1])

        target_segment_index = int(np.searchsorted(self.cumulative_times, elapsed_time, side='right'))
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
