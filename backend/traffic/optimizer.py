from copy import deepcopy
from dataclasses import asdict, dataclass

from traffic.model import IntersectionScenario
from traffic.delay import total_delay
from traffic.objective import (
    DEFAULT_W_CO2,
    DEFAULT_W_DELAY,
    DEFAULT_W_FUEL,
    calculate_co2_emissions,
    calculate_fuel_consumption,
    calculate_objective,
)


# ---------------------------------------------------------------------------
# Backend configuration (NOT user inputs; the frontend form never sets these).
#
# Prototype assumptions, not sourced measurements: verify them before quoting
# them publicly, and keep impact.py on the SAME numbers so that what the
# optimizer optimises and what the report claims cannot disagree.
# ---------------------------------------------------------------------------
DEFAULT_IDLE_FUEL_RATE_L_PER_HOUR = 0.8   # litres per vehicle-hour of delay (petrol car)
DEFAULT_CO2_KG_PER_LITER = 2.3            # kg CO2 per litre of petrol


@dataclass(frozen=True)
class OptimizerSettings:
    idle_fuel_rate_l_per_hour: float = DEFAULT_IDLE_FUEL_RATE_L_PER_HOUR
    co2_kg_per_liter: float = DEFAULT_CO2_KG_PER_LITER
    w_delay: float = DEFAULT_W_DELAY
    w_fuel: float = DEFAULT_W_FUEL
    w_co2: float = DEFAULT_W_CO2


DEFAULT_SETTINGS = OptimizerSettings()


@dataclass
class CandidateEvaluation:
    """One feasible candidate plan and everything computed for it."""
    ns_green: float
    ew_green: float
    plan: IntersectionScenario
    delay: float            # from total_delay()
    vehicle_hours: float
    fuel_liters: float
    co2_kg: float
    objective: float = None   # filled in once min/max across candidates are known


def _validate_settings(settings: OptimizerSettings) -> None:
    """
    Fail fast, before the search, by dry-running the objective.py validators
    (negative rates, weights that do not sum to 1, ...), so the rules live in
    one place and a bad setting is not discovered mid-loop.
    """
    fuel = calculate_fuel_consumption(0.0, settings.idle_fuel_rate_l_per_hour)
    calculate_co2_emissions(fuel, settings.co2_kg_per_liter)
    calculate_objective(
        0.0, 0.0, 0.0,
        delay_min=0.0, delay_max=1.0,
        fuel_min=0.0, fuel_max=1.0,
        co2_min=0.0, co2_max=1.0,
        w_delay=settings.w_delay,
        w_fuel=settings.w_fuel,
        w_co2=settings.w_co2,
    )


def _vehicle_hours(delay_vehicle_seconds: float) -> float:
    """
    Vehicle-hours of delay per hour of operation.

    total_delay() already returns TOTAL delay in vehicle-seconds (per-approach
    delay x demand, summed), so the demand is already inside the number and
    only the unit conversion remains: vehicle-seconds / 3600.
    """
    return delay_vehicle_seconds / 3600.0


def _evaluate_candidate(
    candidate: IntersectionScenario,
    ns_green: float,
    delay: float,
    settings: OptimizerSettings,
) -> CandidateEvaluation:
    vehicle_hours = _vehicle_hours(delay)
    fuel = calculate_fuel_consumption(vehicle_hours, settings.idle_fuel_rate_l_per_hour)
    co2 = calculate_co2_emissions(fuel, settings.co2_kg_per_liter)
    return CandidateEvaluation(
        ns_green=ns_green,
        ew_green=candidate.green_times["east"],
        plan=candidate,
        delay=delay,
        vehicle_hours=vehicle_hours,
        fuel_liters=fuel,
        co2_kg=co2,
    )


def _score_candidates(
    evaluations: list,
    settings: OptimizerSettings,
) -> None:
    """Min/max across ALL feasible candidates, then score each on that shared scale."""
    delays = [e.delay for e in evaluations]
    fuels = [e.fuel_liters for e in evaluations]
    co2s = [e.co2_kg for e in evaluations]

    for e in evaluations:
        e.objective = calculate_objective(
            e.delay, e.fuel_liters, e.co2_kg,
            delay_min=min(delays), delay_max=max(delays),
            fuel_min=min(fuels), fuel_max=max(fuels),
            co2_min=min(co2s), co2_max=max(co2s),
            w_delay=settings.w_delay,
            w_fuel=settings.w_fuel,
            w_co2=settings.w_co2,
        )


def _candidate_record(e: CandidateEvaluation) -> dict:
    """Plain, JSON-friendly view of a candidate (no scenario objects)."""
    return {
        "ns_green": e.ns_green,
        "ew_green": e.ew_green,
        "delay": e.delay,
        "vehicle_hours": e.vehicle_hours,
        "fuel_liters": e.fuel_liters,
        "co2_kg": e.co2_kg,
        "objective": e.objective,
    }


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
    *,
    settings: OptimizerSettings = None,
) -> dict:
    """
    Search candidate splits and recommend the one with the LOWEST OBJECTIVE
    (weighted, normalised delay + fuel + CO2; see objective.py), not simply the
    lowest delay.

    settings: backend fuel/CO2 assumptions and weights. Defaults to
    DEFAULT_SETTINGS. Not a user-facing input.
    """
    if settings is None:
        settings = DEFAULT_SETTINGS
    _validate_settings(settings)

    available_green = (
        scenario.cycle_length
        - scenario.lost_time
    )

    evaluations = []
    infeasible_count = 0

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
            infeasible_count += 1
            continue

        evaluations.append(
            _evaluate_candidate(candidate, ns_green, delay, settings)
        )

    baseline_delay = total_delay(scenario)

    if not evaluations:
        raise ValueError(
            "No feasible signal plan found"
        )

    _score_candidates(evaluations, settings)

    # min() returns the first of any exact ties, matching the old `<` behaviour.
    best = min(evaluations, key=lambda e: e.objective)

    return {
        "baseline": scenario,
        "optimized": best.plan,
        "baseline_delay": baseline_delay,
        "optimized_delay": best.delay,
        "delay_reduction": (
            baseline_delay - best.delay
            if baseline_delay is not None
            else None
        ),
        # --- added ---
        "optimized_objective": best.objective,
        "optimized_vehicle_hours": best.vehicle_hours,
        "optimized_fuel_liters": best.fuel_liters,
        "optimized_co2_kg": best.co2_kg,
        "settings": asdict(settings),
        "infeasible_candidates": infeasible_count,
        "candidates": [_candidate_record(e) for e in evaluations],
    }