"""
traffic/objective.py -- CONTROL OBJECTIVE for the signal optimizer.

This module is deliberately separate from impact.py:

    objective.py  (this file)  scores ONE candidate plan on absolute quantities
                               (delay, fuel consumed, CO2 emitted) so that every
                               candidate is evaluated the same way. Lower is better.

    impact.py                  REPORTS the difference between a baseline plan and
                               the chosen plan (vehicle-hours saved, fuel saved,
                               CO2 saved). It is not used to pick the plan.

Only the calculation layer lives here. Nothing in this file searches, ranks or
filters candidates; the optimizer does that (including skipping infeasible
plans whose Webster delay is None) and supplies the normalisation ranges.

All three objective terms are COSTS (delay, fuel used, CO2 emitted), so after
min-max normalisation each lies in [0, 1] across the candidate set and a LOWER
combined score is better.
"""
from __future__ import annotations

import math
from numbers import Real

# Prototype weights, NOT scientifically established. The frontend can override.
DEFAULT_W_DELAY = 0.5
DEFAULT_W_FUEL = 0.25
DEFAULT_W_CO2 = 0.25

_WEIGHT_SUM_TOLERANCE = 1e-6


# ----------------------------------------------------------------- validation
def _require_finite(name: str, value, *, non_negative: bool = False) -> float:
    """Reject bools, non-numbers, NaN and inf (and negatives when requested)."""
    if isinstance(value, bool) or not isinstance(value, Real) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number (got {value!r})")
    if non_negative and value < 0:
        raise ValueError(f"{name} must be >= 0 (got {value})")
    return float(value)


# ---------------------------------------------------------------- fuel / CO2
def calculate_fuel_consumption(vehicle_hours: float, idle_fuel_rate_l_per_hour: float) -> float:
    """
    Fuel consumed (litres) = vehicle_hours * idle_fuel_rate.

    vehicle_hours              total vehicle-hours of delay (>= 0)
    idle_fuel_rate_l_per_hour  litres burned per vehicle per hour of delay (>= 0)

    ASSUMPTION: all delay time is charged at the idle rate. Extra fuel from
    decelerating/accelerating is not modelled, and a single rate implies one
    vehicle class. The rate is a required argument (no default) so the caller
    states its fleet assumption explicitly and can share it with impact.py.
    """
    hours = _require_finite("vehicle_hours", vehicle_hours, non_negative=True)
    rate = _require_finite("idle_fuel_rate_l_per_hour", idle_fuel_rate_l_per_hour,
                           non_negative=True)
    return hours * rate


def calculate_co2_emissions(fuel_liters: float, co2_kg_per_liter: float) -> float:
    """
    CO2 emitted (kg) = fuel_liters * emission_factor.

    fuel_liters       fuel burned, litres (>= 0)
    co2_kg_per_liter  emission factor for that fuel, kg CO2 per litre (>= 0)
    """
    fuel = _require_finite("fuel_liters", fuel_liters, non_negative=True)
    factor = _require_finite("co2_kg_per_liter", co2_kg_per_liter, non_negative=True)
    return fuel * factor


# --------------------------------------------------------------- normalisation
def normalize_min_max(value: float, lo: float, hi: float, name: str = "value") -> float:
    """
    (value - lo) / (hi - lo). Lowest candidate -> 0, highest -> 1.

    - hi < lo is rejected (a reversed range is a bug, not a preference).
    - hi == lo means every candidate is tied on this term, so it cannot
      discriminate between them: returns 0.0 instead of dividing by zero.
    - Values outside [lo, hi] are NOT clipped, so ordering stays monotonic even
      if a fixed reference range is used later. With ranges computed from the
      candidate set itself, every value falls inside [lo, hi].
    """
    v = _require_finite(name, value)
    lo_f = _require_finite(f"{name}_min", lo)
    hi_f = _require_finite(f"{name}_max", hi)
    if hi_f < lo_f:
        raise ValueError(f"{name}_max ({hi_f}) must be >= {name}_min ({lo_f})")
    if hi_f == lo_f:
        return 0.0
    return (v - lo_f) / (hi_f - lo_f)


# -------------------------------------------------------------------- objective
def calculate_objective(
    delay: float,
    fuel: float,
    co2: float,
    *,
    delay_min: float,
    delay_max: float,
    fuel_min: float,
    fuel_max: float,
    co2_min: float,
    co2_max: float,
    w_delay: float = DEFAULT_W_DELAY,
    w_fuel: float = DEFAULT_W_FUEL,
    w_co2: float = DEFAULT_W_CO2,
) -> float:
    """
    Combined objective for ONE candidate plan (lower is better):

        w_delay * norm(delay) + w_fuel * norm(fuel) + w_co2 * norm(co2)

    delay, fuel, co2   absolute values for this candidate (>= 0). Each pair
                       (delay, fuel, co2) must be in the same units as its range.
    *_min, *_max       normalisation ranges, supplied by the caller. The optimizer
                       should compute them across ALL feasible candidates so every
                       plan is scored on the same scale.
    w_*                non-negative and summing to 1, so the score lies in [0, 1]
                       when the ranges come from the candidate set.

    Callers must not pass None/NaN (e.g. an oversaturated plan with no Webster
    delay): filter those out first. This function raises rather than guessing.
    """
    weights = {
        "w_delay": _require_finite("w_delay", w_delay, non_negative=True),
        "w_fuel": _require_finite("w_fuel", w_fuel, non_negative=True),
        "w_co2": _require_finite("w_co2", w_co2, non_negative=True),
    }
    total = sum(weights.values())
    if not math.isclose(total, 1.0, abs_tol=_WEIGHT_SUM_TOLERANCE):
        raise ValueError(f"weights must sum to 1.0 (got {total})")

    delay_v = _require_finite("delay", delay, non_negative=True)
    fuel_v = _require_finite("fuel", fuel, non_negative=True)
    co2_v = _require_finite("co2", co2, non_negative=True)

    return (
        weights["w_delay"] * normalize_min_max(delay_v, delay_min, delay_max, "delay")
        + weights["w_fuel"] * normalize_min_max(fuel_v, fuel_min, fuel_max, "fuel")
        + weights["w_co2"] * normalize_min_max(co2_v, co2_min, co2_max, "co2")
    )