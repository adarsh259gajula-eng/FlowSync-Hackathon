import { useCountUp } from "../hooks/useCountUp";

/**
 * Sustainability Impact panel.
 * Displays modeled environmental savings from the optimized signal plan.
 * These are estimates derived from the optimization model, not measured
 * real-world reductions — labeled accordingly.
 *
 * Data shape:
 *   impact = {
 *     vehicle_hours_saved: number,
 *     fuel_saved_liters:   number,
 *     fuel_baseline_liters?: number,  // optional — enables the comparison bar
 *     co2_saved_kg:        number,
 *     co2_baseline_kg?:    number,    // optional — enables the comparison bar
 *   }
 *
 * The baseline fields are optional. If the caller has them (e.g. the
 * optimizer already computes baseline consumption before applying
 * savings), pass them through and the panel renders a baseline-vs-
 * optimized comparison bar per metric. Without them, the metric still
 * renders as a count-up figure, just without the comparison bar.
 */

function ImpactCard({ label, value, unit, precision = 4 }) {
  const animated = useCountUp(value);
  return (
    <div className="impact-card">
      <span className="impact-label">{label}</span>
      <span className="impact-value">
        {animated.toFixed(precision)}
        <span className="impact-unit">{unit}</span>
      </span>
    </div>
  );
}

function ComparisonBar({ label, baseline, optimized, unit, precision = 1 }) {
  if (typeof baseline !== "number" || baseline <= 0) return null;

  const animatedOptimized = useCountUp(optimized);
  const pctSaved = Math.max(0, Math.min(100, ((baseline - optimized) / baseline) * 100));
  const optimizedWidth = Math.max(0, Math.min(100, (optimized / baseline) * 100));

  return (
    <div className="impact-comparison-row">
      <div className="impact-comparison-header">
        <span className="impact-comparison-label">{label}</span>
        <span className="impact-comparison-delta mono">
          −{pctSaved.toFixed(0)}%
        </span>
      </div>

      <div className="impact-comparison-track">
        <div
          className="impact-comparison-fill impact-comparison-fill-optimized"
          style={{ width: `${optimizedWidth}%` }}
        />
      </div>

      <div className="impact-comparison-figures mono">
        <span className="impact-comparison-figure-optimized">
          {animatedOptimized.toFixed(precision)} {unit} optimized
        </span>
        <span className="impact-comparison-figure-baseline">
          {baseline.toFixed(precision)} {unit} baseline
        </span>
      </div>
    </div>
  );
}

export default function SustainabilityImpact({ impact }) {
  if (!impact) return null;

  const {
    vehicle_hours_saved,
    fuel_saved_liters,
    fuel_baseline_liters,
    co2_saved_kg,
    co2_baseline_kg,
  } = impact;

  const fuelOptimized =
    typeof fuel_baseline_liters === "number" ? fuel_baseline_liters - fuel_saved_liters : null;
  const co2Optimized =
    typeof co2_baseline_kg === "number" ? co2_baseline_kg - co2_saved_kg : null;

  const hasComparison = fuelOptimized !== null || co2Optimized !== null;

  return (
    <section className="panel sustainability-impact">
      <div className="panel-header-row">
        <h2 className="panel-title">Sustainability Impact</h2>
        <span className="estimated-tag">Estimated · modeled</span>
      </div>

      <div className="impact-grid">
        <ImpactCard label="Vehicle-hours saved" value={vehicle_hours_saved} unit="veh-hr" />
        <ImpactCard label="Fuel saved" value={fuel_saved_liters} unit="L" />
        <ImpactCard label="CO2 reduction" value={co2_saved_kg} unit="kg" />
      </div>

      {hasComparison && (
        <div className="impact-comparison-group">
          {fuelOptimized !== null && (
            <ComparisonBar
              label="Fuel consumption"
              baseline={fuel_baseline_liters}
              optimized={fuelOptimized}
              unit="L"
            />
          )}
          {co2Optimized !== null && (
            <ComparisonBar
              label="CO2 emissions"
              baseline={co2_baseline_kg}
              optimized={co2Optimized}
              unit="kg"
            />
          )}
        </div>
      )}

      <p className="impact-disclaimer">
        These figures come from the optimization model for this scenario, not
        measured sensor or vehicle data.
      </p>
    </section>
  );
}