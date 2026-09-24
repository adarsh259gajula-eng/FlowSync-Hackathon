from traffic.model import IntersectionScenario


def phase_approaches(phase: str) -> list[str]:
    if phase == "north_south":
        return ["north", "south"]

    if phase == "east_west":
        return ["east", "west"]

    raise ValueError(f"Unknown phase: {phase}")


def phase_capacity(
    scenario: IntersectionScenario,
    phase: str,
) -> float:

    approaches = phase_approaches(phase)

    capacity = 0.0

    for approach in approaches:
        capacity += (
            scenario.saturation_flow[approach]
            * scenario.lanes[approach]
            * scenario.green_times[approach]
            / scenario.cycle_length
        )

    return capacity


def degree_of_saturation(
    scenario: IntersectionScenario,
    phase: str,
) -> float:

    demand = scenario.phase_demand[phase]
    capacity = phase_capacity(scenario, phase)

    if capacity <= 0:
        raise ValueError("Phase capacity must be positive")

    return demand / capacity


def webster_delay(
    scenario: IntersectionScenario,
    phase: str,
) -> float | None:

    x = degree_of_saturation(scenario, phase)

    if x >= 1:
        return None

    approaches = phase_approaches(phase)

    green = sum(
        scenario.green_times[approach]
        for approach in approaches
    ) / len(approaches)

    green_ratio = green / scenario.cycle_length

    denominator = 1 - green_ratio * x

    if denominator <= 0:
        return None

    delay = (
        scenario.cycle_length
        * (1 - green_ratio) ** 2
        / (2 * denominator)
    )

    return delay


def total_delay(
    scenario: IntersectionScenario,
) -> float | None:

    total = 0.0

    for phase in scenario.phases():
        delay = webster_delay(scenario, phase)

        if delay is None:
            return None

        total += scenario.phase_demand[phase] * delay

    return total