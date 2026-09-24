"""
traffic/config.py -- fuel and emission assumptions, defined ONCE.

Shared by:
    optimizer.py  to score candidate signal plans
    impact.py     to report the savings of the chosen plan

Keeping both on the same numbers guarantees the plan the optimizer picks and the
impact the API reports are computed under identical assumptions.

These are backend configuration, never user inputs. They are prototype values,
not sourced measurements: verify them before quoting them publicly. Change them
here and nowhere else.
"""

# Litres of fuel burned per vehicle per hour of delay (idling passenger car, petrol).
IDLE_FUEL_RATE_L_PER_VEHICLE_HOUR = 0.8

# Kilograms of CO2 emitted per litre of petrol burned.
CO2_KG_PER_LITER = 2.3