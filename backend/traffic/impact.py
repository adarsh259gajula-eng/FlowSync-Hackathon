from traffic.config import (
    CO2_KG_PER_LITER,
    IDLE_FUEL_RATE_L_PER_VEHICLE_HOUR,
)

def delay_reduction_to_vehicle_hours(
    delay_reduction: float,
) -> float:

    if delay_reduction < 0:
        raise ValueError(
            "delay_reduction must be >= 0"
        )

    return delay_reduction / 3600


def estimate_fuel_saved(
    vehicle_hours_saved: float,
    idle_fuel_rate_lph: float = IDLE_FUEL_RATE_L_PER_VEHICLE_HOUR,
) -> float:

    if vehicle_hours_saved < 0:
        raise ValueError(
            "vehicle_hours_saved must be >= 0"
        )

    return vehicle_hours_saved * idle_fuel_rate_lph


def estimate_co2_saved(
    fuel_saved_liters: float,
    co2_factor_kg_per_liter: float = CO2_KG_PER_LITER,
) -> float:

    if fuel_saved_liters < 0:
        raise ValueError(
            "fuel_saved_liters must be >= 0"
        )

    return fuel_saved_liters * co2_factor_kg_per_liter


def estimate_impact(
    delay_reduction: float,
) -> dict:

    vehicle_hours_saved = (
        delay_reduction_to_vehicle_hours(
            delay_reduction
        )
    )

    fuel_saved = estimate_fuel_saved(
        vehicle_hours_saved
    )

    co2_saved = estimate_co2_saved(
        fuel_saved
    )

    return {
        "vehicle_hours_saved": vehicle_hours_saved,
        "fuel_saved_liters": fuel_saved,
        "co2_saved_kg": co2_saved,
    }