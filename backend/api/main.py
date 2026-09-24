import re
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from traffic.data_adapter import (
    build_scenario,
    load_traffic_data,
    row_to_traffic_observation,
)
from traffic.impact import estimate_impact
from traffic.optimizer import optimize_signal

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "traffic_dataset.csv"

# The dataset has no directional demand, so the direction scenario is an explicit
# SIMULATION ASSUMPTION: (north_south_share, east_west_share).
DIRECTION_SPLITS = {
    "balanced": (0.50, 0.50),
    "north_south_heavy": (0.60, 0.40),
    "east_west_heavy": (0.40, 0.60),
}

# Message raised by optimize_signal() when every candidate is oversaturated.
NO_FEASIBLE_PLAN_MESSAGE = "No feasible signal plan found"


class TrafficRequest(BaseModel):
    timestamp: str
    direction_scenario: Literal[
        "balanced",
        "north_south_heavy",
        "east_west_heavy",
    ]


# --------------------------------------------------------------------------- #
# Dataset lookup
# --------------------------------------------------------------------------- #

_TIMESTAMP_PATTERN = re.compile(r"^\s*(\d{1,3}):(\d{2})(?::(\d{2}))?\s*$")


def _canonical_timestamp(value: str) -> Optional[str]:
    """
    '08:17:00', '8:17:00' and '8:17' all become '8:17:00' (the CSV's own style),
    so the request and the CSV are compared on the same footing.
    Returns None if the value is not a valid H:MM[:SS] timestamp.
    """
    match = _TIMESTAMP_PATTERN.match(str(value))
    if match is None:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3) or 0)
    if minutes > 59 or seconds > 59:
        return None
    return f"{hours}:{minutes:02d}:{seconds:02d}"


@lru_cache(maxsize=1)
def _load_dataset():
    """Read the CSV once and index its rows by canonical timestamp."""
    df = load_traffic_data(str(DATA_PATH))
    index = {}
    for position, raw_timestamp in enumerate(df["Timestamp"]):
        key = _canonical_timestamp(raw_timestamp)
        if key is not None:
            index.setdefault(key, position)  # first occurrence wins
    return df, index


def _observation_summary(observation, timestamp: str) -> dict:
    return {
        "timestamp": timestamp,
        "vehicle_count": observation.vehicle_count,
        "avg_speed": observation.avg_speed,
        "vehicle_density": observation.vehicle_density,
        "congestion_level": observation.congestion_level,
    }


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }


@app.post("/api/analyze")
def analyze_traffic(request: TrafficRequest):

    # 1. Find the requested observation in the dataset.
    key = _canonical_timestamp(request.timestamp)
    if key is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid timestamp {request.timestamp!r}; "
                "expected H:MM:SS (for example '08:17:00')."
            ),
        )

    try:
        df, index = _load_dataset()
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=f"Traffic dataset not found at {DATA_PATH}",
        )

    if key not in index:
        raise HTTPException(
            status_code=404,
            detail=f"No observation with timestamp {request.timestamp!r} in the dataset.",
        )

    # 2. Row -> TrafficObservation.
    observation = row_to_traffic_observation(df.iloc[index[key]])
    observation_info = _observation_summary(observation, request.timestamp)

    # 3. Direction scenario -> phase split -> scenario.
    scenario = build_scenario(
        observation,
        phase_split=DIRECTION_SPLITS[request.direction_scenario],
    )

    # 4. Optimise the signal plan.
    try:
        optimization = optimize_signal(scenario)
    except ValueError as error:
        if str(error) != NO_FEASIBLE_PLAN_MESSAGE:
            raise
        raise HTTPException(
            status_code=422,
            detail={
                "error": "no_feasible_plan",
                "message": (
                    "Demand at this timestamp exceeds what this intersection can "
                    "serve under any signal timing for the "
                    f"'{request.direction_scenario}' direction scenario."
                ),
                "observation": observation_info,
            },
        )

    # 5. Impact. If the baseline plan is itself oversaturated there is no baseline
    #    delay to compare against, so there is no reduction to convert.
    delay_reduction = optimization["delay_reduction"]
    impact = (
        estimate_impact(delay_reduction)
        if delay_reduction is not None
        else None
    )

    return {
        "observation": observation_info,
        "baseline": {
            "north_south_green": scenario.green_times["north"],
            "east_west_green": scenario.green_times["east"],
            "delay": optimization["baseline_delay"],
        },
        "optimized": {
            "north_south_green": optimization["optimized"].green_times["north"],
            "east_west_green": optimization["optimized"].green_times["east"],
            "delay": optimization["optimized_delay"],
            "delay_reduction": delay_reduction,
        },
        "impact": impact,
    }