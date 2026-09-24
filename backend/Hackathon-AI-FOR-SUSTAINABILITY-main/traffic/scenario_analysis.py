import pandas as pd

from traffic.data_adapter import (
    load_traffic_data,
    row_to_traffic_observation,
    build_scenario,
)
from traffic.optimizer import optimize_signal


PHASE_SPLITS = [
    (0.50, 0.50),
    (0.55, 0.45),
    (0.60, 0.40),
    (0.65, 0.35),
    (0.70, 0.30),
]


def evaluate_splits(path: str):
    df = load_traffic_data(path)

    results = []

    for _, row in df.iterrows():
        observation = row_to_traffic_observation(row)

        for ns_split, ew_split in PHASE_SPLITS:

            scenario = build_scenario(
                observation,
                phase_split=(ns_split, ew_split),
            )

            optimization = optimize_signal(scenario)

            results.append({
                "timestamp": observation.timestamp,
                "vehicle_count": observation.vehicle_count,
                "congestion_level": observation.congestion_level,
                "ns_split": ns_split,
                "ew_split": ew_split,
                "baseline_delay": optimization["baseline_delay"],
                "optimized_delay": optimization["optimized_delay"],
                "delay_reduction": optimization["delay_reduction"],
                "optimized_ns_green":
                    optimization["optimized"].green_times["north"],
                "optimized_ew_green":
                    optimization["optimized"].green_times["east"],
            })

    return pd.DataFrame(results)


if __name__ == "__main__":
    results = evaluate_splits(
        "data/traffic_dataset.csv"
    )

    summary = (
        results
        .groupby(["ns_split", "ew_split"])
        .agg(
            observations=("delay_reduction", "count"),
            avg_baseline_delay=("baseline_delay", "mean"),
            avg_optimized_delay=("optimized_delay", "mean"),
            avg_delay_reduction=("delay_reduction", "mean"),
        )
        .reset_index()
    )

    print("\nScenario analysis")
    print("-----------------")
    print(summary.to_string(index=False))