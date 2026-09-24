from fastapi import FastAPI
from pydantic import BaseModel

from traffic.model import TrafficObservation
from traffic.data_adapter import build_scenario
from traffic.optimizer import optimize_signal
from traffic.impact import estimate_impact

app = FastAPI()


class TrafficRequest(BaseModel):
    vehicle_count: int
    avg_speed: float
    vehicle_density: float
    free_flow_speed: float
    saturation_flow_rate: float
    north_south_split: float
    east_west_split: float

@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }


@app.post("/api/analyze")
def analyze_traffic(request: TrafficRequest):

    observation = TrafficObservation(
        timestamp="api_request",
        vehicle_count=request.vehicle_count,
        avg_speed=request.avg_speed,
        vehicle_density=request.vehicle_density,
        saturation_flow_rate=request.saturation_flow_rate,
        free_flow_speed=request.free_flow_speed,
        congestion_level="Unknown",
        ir_presence=[0, 0, 0, 0],
    )

    scenario = build_scenario(
        observation,
        phase_split=(
            request.north_south_split,
            request.east_west_split,
        ),
    )

    optimization = optimize_signal(scenario)

    impact = estimate_impact(
        optimization["delay_reduction"]
    )

    return {
        "traffic": {
            "vehicle_count": request.vehicle_count,
            "avg_speed": request.avg_speed,
            "vehicle_density": request.vehicle_density,
        },
        "baseline": {
            "delay": optimization["baseline_delay"],
            "north_south_green": scenario.green_times["north"],
            "east_west_green": scenario.green_times["east"],
        },
        "optimized": {
            "delay": optimization["optimized_delay"],
            "delay_reduction": optimization["delay_reduction"],
            "north_south_green": optimization["optimized"].green_times["north"],
            "east_west_green": optimization["optimized"].green_times["east"],
        },
        "impact": impact,
    }