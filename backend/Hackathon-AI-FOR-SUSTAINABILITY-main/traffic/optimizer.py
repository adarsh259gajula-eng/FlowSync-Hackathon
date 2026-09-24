from copy import deepcopy

from traffic.model import IntersectionScenario
from traffic.delay import total_delay


def build_signal_plan(
    scenario: IntersectionScenario,
    north_south_green: float,
) -> IntersectionScenario:

    available_green = (
        scenario.cycle_length
        - scenario.lost_time
    )

    east_west_green = available_green - north_south_green

    if north_south_green <= 0:
        raise ValueError("North-south green must be positive")

    if east_west_green <= 0:
        raise ValueError("East-west green must be positive")

    result = deepcopy(scenario)

    result.green_times["north"] = north_south_green
    result.green_times["south"] = north_south_green

    result.green_times["east"] = east_west_green
    result.green_times["west"] = east_west_green

    return result


def optimize_signal(
    scenario: IntersectionScenario,
    step: int = 1,
) -> dict:

    available_green = (
        scenario.cycle_length
        - scenario.lost_time
    )

    best_plan = None
    best_delay = None

    for ns_green in range(
        step,
        int(available_green),
        step,
    ):

        candidate = build_signal_plan(
            scenario,
            ns_green,
        )

        delay = total_delay(candidate)

        if delay is None:
            continue

        if best_delay is None or delay < best_delay:
            best_delay = delay
            best_plan = candidate

    baseline_delay = total_delay(scenario)

    if best_plan is None:
        raise ValueError(
            "No feasible signal plan found"
        )

    return {
        "baseline": scenario,
        "optimized": best_plan,
        "baseline_delay": baseline_delay,
        "optimized_delay": best_delay,
        "delay_reduction": (
            baseline_delay - best_delay
            if baseline_delay is not None
            else None
        ),
    }