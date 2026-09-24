/**
 * Insights & Recommendations
 *
 * Rule-based interpretation of:
 * - Traffic observation
 * - Baseline signal plan
 * - Optimized signal plan
 * - Sustainability impact
 *
 * No ML / LLM is used here.
 */

function formatNumber(value, precision = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(precision);
}


function InsightRow({ tone = "neutral", label, children }) {
  return (
    <div className={`insight-row insight-row-${tone}`}>
      <div className="insight-row-header">
        <span className="insight-dot" aria-hidden="true" />
        <span className="insight-row-label">{label}</span>
      </div>

      <p className="insight-row-text">
        {children}
      </p>
    </div>
  );
}


export default function InsightsPanel({
  observation,
  baseline,
  optimized,
  impact,
}) {
  if (!observation || !baseline || !optimized || !impact) {
    return null;
  }

  /* -------------------------------------------------------
     Traffic observation
  ------------------------------------------------------- */

  const congestionLevel =
    observation.congestion_level ?? "Unknown";

  const vehicleCount =
    observation.vehicle_count;

  const density =
    observation.vehicle_density;

  const avgSpeed =
    observation.avg_speed;


  /* -------------------------------------------------------
     Signal plans
  ------------------------------------------------------- */

  const baselineNS =
    baseline.north_south_green;

  const baselineEW =
    baseline.east_west_green;

  const optimizedNS =
    optimized.north_south_green;

  const optimizedEW =
    optimized.east_west_green;


  /* -------------------------------------------------------
     Delay / performance
  ------------------------------------------------------- */

  const baselineDelay =
    baseline.delay;

  const optimizedDelay =
    optimized.delay;

  const delayReduction =
    optimized.delay_reduction;

  const delayReductionPercent =
    typeof baselineDelay === "number" &&
    baselineDelay > 0 &&
    typeof delayReduction === "number"
      ? (delayReduction / baselineDelay) * 100
      : null;


  /* -------------------------------------------------------
     Sustainability
  ------------------------------------------------------- */

  const vehicleHoursSaved =
    impact.vehicle_hours_saved;

  const fuelSaved =
    impact.fuel_saved_liters;

  const co2Saved =
    impact.co2_saved_kg;


  /* -------------------------------------------------------
     Determine dominant signal direction
  ------------------------------------------------------- */

  let signalDirection = "balanced";

  if (
    typeof optimizedNS === "number" &&
    typeof optimizedEW === "number"
  ) {
    if (optimizedNS > optimizedEW) {
      signalDirection = "north–south";
    } else if (optimizedEW > optimizedNS) {
      signalDirection = "east–west";
    }
  }


  /* -------------------------------------------------------
     Recommendation rule
  ------------------------------------------------------- */

  let recommendationTone = "neutral";
  let recommendationText =
    "Continue evaluating the optimized timing under additional traffic scenarios before deployment.";

  if (
    typeof delayReduction === "number" &&
    delayReduction > 0
  ) {
    recommendationTone = "teal";

    recommendationText =
      "The optimized timing improves modeled delay for this scenario. Continue validating this signal plan across comparable traffic conditions before real-world deployment.";
  }

  if (
    typeof delayReduction === "number" &&
    delayReduction <= 0
  ) {
    recommendationTone = "red";

    recommendationText =
      "The optimized timing does not improve modeled delay for this scenario. Review the traffic split and signal constraints before considering this plan further.";
  }


  /* -------------------------------------------------------
     Congestion tone
  ------------------------------------------------------- */

  const normalizedCongestion =
    String(congestionLevel).toLowerCase();

  let trafficTone = "teal";

  if (
    normalizedCongestion === "medium" ||
    normalizedCongestion === "moderate"
  ) {
    trafficTone = "amber";
  }

  if (
    normalizedCongestion === "high" ||
    normalizedCongestion === "severe"
  ) {
    trafficTone = "red";
  }


  return (
    <section className="panel insights-panel">

      {/* Header */}

      <div className="panel-header-row">
        <h2 className="panel-title">
          Insights & Recommendations
        </h2>

        <span className="insights-rule-tag">
          Rule-based
        </span>
      </div>


      {/* Scenario summary */}

      <div className="insights-summary">
        <span className="insights-summary-label">
          Scenario summary
        </span>

        <p className="insights-summary-text">
          {congestionLevel} congestion is currently observed
          {typeof vehicleCount === "number"
            ? ` with ${vehicleCount} vehicles`
            : ""}
          {typeof density === "number"
            ? ` at ${formatNumber(density, 0)}% density`
            : ""}
          {typeof avgSpeed === "number"
            ? ` and an average speed of ${formatNumber(
                avgSpeed,
                1
              )} km/h`
            : ""}
          .
        </p>
      </div>


      {/* Insight groups */}

      <div className="insights-list">

        {/* Traffic */}

        <InsightRow
          tone={trafficTone}
          label="Traffic condition"
        >
          The current intersection state is classified as{" "}
          <strong>{congestionLevel.toLowerCase()}</strong>
          {typeof density === "number"
            ? `, with traffic density at ${formatNumber(
                density,
                0
              )}%`
            : ""}
          {typeof avgSpeed === "number"
            ? ` and observed average speed at ${formatNumber(
                avgSpeed,
                1
              )} km/h`
            : ""}
          .
        </InsightRow>


        {/* Performance */}

        <InsightRow
          tone={
            typeof delayReduction === "number" &&
            delayReduction > 0
              ? "teal"
              : "amber"
          }
          label="Performance"
        >
          {typeof baselineDelay === "number" &&
          typeof optimizedDelay === "number" ? (
            <>
              The optimized signal plan reduces modeled delay
              from{" "}
              <strong>
                {formatNumber(baselineDelay, 2)}
              </strong>{" "}
              to{" "}
              <strong>
                {formatNumber(optimizedDelay, 2)}
              </strong>
              {typeof delayReduction === "number" && (
                <>
                  , a reduction of{" "}
                  <strong>
                    {formatNumber(delayReduction, 2)}
                  </strong>
                  {delayReductionPercent !== null && (
                    <>
                      {" "}
                      (
                      {formatNumber(
                        delayReductionPercent,
                        1
                      )}
                      %)
                    </>
                  )}
                </>
              )}
              .
            </>
          ) : (
            "Delay comparison is unavailable for this scenario."
          )}
        </InsightRow>


        {/* Signal strategy */}

        <InsightRow
          tone="amber"
          label="Signal strategy"
        >
          {typeof baselineNS === "number" &&
          typeof baselineEW === "number" &&
          typeof optimizedNS === "number" &&
          typeof optimizedEW === "number" ? (
            <>
              Signal timing changes from{" "}
              <strong>
                {baselineNS}s NS / {baselineEW}s EW
              </strong>{" "}
              to{" "}
              <strong>
                {optimizedNS}s NS / {optimizedEW}s EW
              </strong>
              .{" "}

              {signalDirection === "balanced"
                ? "The optimized plan keeps green time balanced between both directions."
                : `The optimized plan allocates more green time to ${signalDirection} traffic for this scenario.`}
            </>
          ) : (
            "Signal timing comparison is unavailable."
          )}
        </InsightRow>


        {/* Sustainability */}

        <InsightRow
          tone="teal"
          label="Sustainability"
        >
          The modeled optimization estimates{" "}
          <strong>
            {formatNumber(vehicleHoursSaved, 4)} vehicle-hours
          </strong>{" "}
          saved, approximately{" "}
          <strong>
            {formatNumber(fuelSaved, 4)} L
          </strong>{" "}
          of fuel saved and{" "}
          <strong>
            {formatNumber(co2Saved, 4)} kg
          </strong>{" "}
          of CO₂ reduction for this scenario.
        </InsightRow>

      </div>


      {/* Recommendation */}

      <div
        className={`insights-recommendation insights-recommendation-${recommendationTone}`}
      >
        <div className="recommendation-heading">
          <span
            className="recommendation-icon"
            aria-hidden="true"
          >
            →
          </span>

          <span>Recommendation</span>
        </div>

        <p className="recommendation-text">
          {recommendationText}
        </p>
      </div>


      {/* Disclaimer */}

      <p className="insights-disclaimer">
        Recommendations are generated from deterministic
        rules applied to modeled traffic and sustainability
        outputs. They are intended for scenario evaluation,
        not direct field deployment.
      </p>

    </section>
  );
}