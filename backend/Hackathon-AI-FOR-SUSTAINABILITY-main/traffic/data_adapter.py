import ast
import pandas as pd

from traffic.model import TrafficObservation, IntersectionScenario


def load_traffic_data(path: str) -> pd.DataFrame:
    return pd.read_csv(path)


def row_to_traffic_observation(row: pd.Series) -> TrafficObservation:
    ir_raw = row["IR Presence (Lane 1-4)"]

    if isinstance(ir_raw, str):
        ir_presence = ast.literal_eval(ir_raw)
    else:
        ir_presence = list(ir_raw)

    if len(ir_presence) != 4:
        raise ValueError("IR presence must contain 4 values")

    if any(value not in (0, 1) for value in ir_presence):
        raise ValueError("IR presence values must be binary")

    return TrafficObservation(
        timestamp=str(row["Timestamp"]),
        vehicle_count=int(row["Vehicle Count"]),
        avg_speed=float(row["Avg Speed (km/h)"]),
        vehicle_density=float(row["Vehicle Density (%)"]),
        saturation_flow_rate=float(
            row["Saturation Flow Rate(veh/hr/lane)"]
        ),
        free_flow_speed=float(row["FreeFlowSpeed (km/h)"]),
        congestion_level=str(row["Congestion Level"]),
        ir_presence=ir_presence,
    )


def build_scenario(
    observation: TrafficObservation,
    phase_split: tuple[float, float] | None = None,
    intersection_id: str = "SIM_001",
) -> IntersectionScenario:

    observed_flow = observation.vehicle_count

    pressure = calculate_traffic_pressure(observation)

    if phase_split is None:
        pressure = calculate_traffic_pressure(observation)

        ns_split = 0.50 + (0.10 * pressure)
        ew_split = 1.0 - ns_split
    else:
        ns_split, ew_split = phase_split

    if abs((ns_split + ew_split) - 1.0) > 1e-9:
        raise ValueError("phase_split values must sum to 1")

    phase_demand = {
        "north_south": observed_flow * ns_split,
        "east_west": observed_flow * ew_split,
    }

    lanes = {
        "north": 1,
        "south": 1,
        "east": 1,
        "west": 1,
    }

    saturation_flow = {
        "north": observation.saturation_flow_rate,
        "south": observation.saturation_flow_rate,
        "east": observation.saturation_flow_rate,
        "west": observation.saturation_flow_rate,
    }

    green_times = {
        "north": 41,
        "south": 41,
        "east": 41,
        "west": 41,
    }

    scenario = IntersectionScenario(
        intersection_id=intersection_id,
        phase_demand=phase_demand,
        lanes=lanes,
        saturation_flow=saturation_flow,
        green_times=green_times,
        cycle_length=90,
        lost_time=8,
    )

    scenario.validate()

    return scenario


def calculate_traffic_pressure(
    observation: TrafficObservation,
) -> float:

    density_pressure = observation.vehicle_density / 100

    if observation.free_flow_speed <= 0:
        raise ValueError("free_flow_speed must be > 0")

    speed_pressure = 1 - (
        observation.avg_speed
        / observation.free_flow_speed
    )

    speed_pressure = max(0.0, min(1.0, speed_pressure))

    pressure = (
        0.5 * density_pressure
        + 0.5 * speed_pressure
    )

    return round(pressure, 4)


def dynamic_phase_split(
    pressure: float,
) -> tuple[float, float]:

    pressure = max(0.0, min(1.0, pressure))

    ns_split = 0.50 + (0.10 * pressure)
    ew_split = 1.0 - ns_split

    return round(ns_split, 4), round(ew_split, 4)


if __name__ == "__main__":
    df = load_traffic_data("data/traffic_dataset.csv")

    observation = row_to_traffic_observation(df.iloc[0])

    scenario = build_scenario(observation)

    print("\nTraffic observation:")
    print(observation)

    print("\nSimulation scenario:")
    print(scenario)