import pandas as pd
from traffic.impact import estimate_impact
from traffic.data_adapter import (
    load_traffic_data,
    row_to_traffic_observation,
    build_scenario,
)
from traffic.optimizer import optimize_signal


def evaluate_dataset(path: str):
    df = load_traffic_data(path)

    results = []

    for _, row in df.iterrows():
        observation = row_to_traffic_observation(row)
        scenario = build_scenario(observation)

        optimization = optimize_signal(scenario)

        baseline = optimization["baseline_delay"]
        optimized = optimization["optimized_delay"]
        reduction = optimization["delay_reduction"]
        impact = estimate_impact(reduction)

        results.append({
            "timestamp": observation.timestamp,
            "vehicle_count": observation.vehicle_count,
            "avg_speed": observation.avg_speed,
            "vehicle_density": observation.vehicle_density,
            "congestion_level": observation.congestion_level,
            "baseline_delay": baseline,
            "optimized_delay": optimized,
            "delay_reduction": reduction,
            "optimized_ns_green": optimization["optimized"].green_times["north"],
            "optimized_ew_green": optimization["optimized"].green_times["east"],
            "vehicle_hours_saved": impact["vehicle_hours_saved"],
            "fuel_saved_liters": impact["fuel_saved_liters"],
            "co2_saved_kg": impact["co2_saved_kg"],
        })

    return pd.DataFrame(results)


if __name__ == "__main__":
    results = evaluate_dataset(
        "data/traffic_dataset.csv"
    )

    print("\nDataset evaluation")
    print("------------------")

    print(f"Rows evaluated: {len(results)}")

    print(
        f"Average baseline delay: "
        f"{results['baseline_delay'].mean():.2f}"
    )

    print(
        f"Average optimized delay: "
        f"{results['optimized_delay'].mean():.2f}"
    )

    print(
        f"Average delay reduction: "
        f"{results['delay_reduction'].mean():.2f}"
    )

    improvement = (
        results["delay_reduction"].mean()
        / results["baseline_delay"].mean()
        * 100
    )

    print(
        f"Average improvement: "
        f"{improvement:.2f}%"
    )

    print(
        f"Total vehicle-hours saved: "
        f"{results['vehicle_hours_saved'].sum():.2f}"
    )

    print(
        f"Total estimated fuel saved: "
        f"{results['fuel_saved_liters'].sum():.2f} L"
    )

    print(
        f"Total estimated CO2 avoided: "
        f"{results['co2_saved_kg'].sum():.2f} kg"
    )