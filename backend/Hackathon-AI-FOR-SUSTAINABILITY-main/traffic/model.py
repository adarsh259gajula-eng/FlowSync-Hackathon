from dataclasses import dataclass
from typing import Dict


@dataclass
class TrafficObservation:
    timestamp: str
    vehicle_count: int
    avg_speed: float
    vehicle_density: float
    saturation_flow_rate: float
    free_flow_speed: float
    congestion_level: str
    ir_presence: list[int]


@dataclass
class IntersectionScenario:
    intersection_id: str
    phase_demand: Dict[str, float]
    lanes: Dict[str, int]
    saturation_flow: Dict[str, float]
    green_times: Dict[str, float]
    cycle_length: float
    lost_time: float

    def validate(self):
        phases = {"north_south", "east_west"}
        approaches = {"north", "south", "east", "west"}

        if set(self.phase_demand) != phases:
            raise ValueError("Invalid phase configuration")

        if set(self.lanes) != approaches:
            raise ValueError("Invalid lane configuration")

        if set(self.saturation_flow) != approaches:
            raise ValueError("Invalid saturation flow configuration")

        if set(self.green_times) != approaches:
            raise ValueError("Invalid green-time configuration")

        if self.cycle_length <= 0:
            raise ValueError("cycle_length must be > 0")

        if self.lost_time < 0:
            raise ValueError("lost_time must be >= 0")

        if self.lost_time >= self.cycle_length:
            raise ValueError("lost_time must be less than cycle_length")

        if any(value < 0 for value in self.phase_demand.values()):
            raise ValueError("phase demand cannot be negative")

        return True

    def phases(self):
        return list(self.phase_demand.keys())