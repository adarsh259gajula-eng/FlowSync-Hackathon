/**
 * Intersection Visualization panel.
 * Renders a simple top-down intersection diagram so a viewer can see,
 * within a few seconds, how the optimized plan reallocates green time
 * between the North-South and East-West approaches.
 *
 * The phase cycle animation is a scaled-down illustration of the plan's
 * green-time ratio (real seconds / 3, so a 41s phase plays in ~14s) —
 * it is a visualization of the modeled plan, not a live signal feed.
 * Driven entirely by baseline/optimized props from the backend.
 */

import { useEffect, useState } from "react";

const SIM_SPEEDUP = 3; // real seconds compressed by this factor for playback

function useSignalPhaseCycle(nsGreen, ewGreen, enabled) {
  const [phase, setPhase] = useState("ns");

  useEffect(() => {
    if (!enabled) return undefined;

    const nsMs = Math.max(1000, (nsGreen / SIM_SPEEDUP) * 1000);
    const ewMs = Math.max(1000, (ewGreen / SIM_SPEEDUP) * 1000);

    let cancelled = false;
    let timeoutId;

    function runCycle(current) {
      setPhase(current);
      const duration = current === "ns" ? nsMs : ewMs;
      timeoutId = setTimeout(() => {
        if (!cancelled) runCycle(current === "ns" ? "ew" : "ns");
      }, duration);
    }

    runCycle("ns");

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [nsGreen, ewGreen, enabled]);

  return phase;
}

function ApproachArrows({ axis, active }) {
  const arrowClass = `flow-arrow ${active ? "flow-arrow-active" : ""}`;

  if (axis === "ns") {
    return (
      <g>
        <path className={arrowClass} d="M172 30 L172 95 M164 85 L172 97 L180 85" />
        <path className={arrowClass} d="M188 210 L188 145 M180 155 L188 143 L196 155" />
      </g>
    );
  }
  return (
    <g>
      <path className={arrowClass} d="M30 172 L95 172 M85 164 L97 172 L85 180" />
      <path className={arrowClass} d="M210 188 L145 188 M155 180 L143 188 L155 196" />
    </g>
  );
}

export default function IntersectionDiagram({ baseline, optimized }) {
  const [planView, setPlanView] = useState("optimized");

  const activePlan = planView === "optimized" ? optimized : baseline;

  const phase = useSignalPhaseCycle(
    activePlan?.north_south_green,
    activePlan?.east_west_green,
    Boolean(activePlan)
  );

  if (!baseline || !optimized) return null;

  const nsIncreased = optimized.north_south_green > baseline.north_south_green;
  const ewIncreased = optimized.east_west_green > baseline.east_west_green;

  return (
    <section className="panel intersection-diagram">
      <div className="panel-header-row">
        <h2 className="panel-title">Intersection Visualization</h2>
        <div className="plan-toggle" role="group" aria-label="Signal plan view">
          <button
            type="button"
            className={`plan-toggle-btn ${planView === "baseline" ? "plan-toggle-btn-active" : ""}`}
            onClick={() => setPlanView("baseline")}
          >
            Baseline
          </button>
          <button
            type="button"
            className={`plan-toggle-btn ${planView === "optimized" ? "plan-toggle-btn-active" : ""}`}
            onClick={() => setPlanView("optimized")}
          >
            Optimized
          </button>
        </div>
      </div>

      <div className="intersection-layout">
        <svg
          className="intersection-svg"
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="100" width="240" height="40" className="road" />
          <rect x="100" y="0" width="40" height="240" className="road" />

          <line x1="0" y1="120" x2="240" y2="120" className="lane-divider" />
          <line x1="120" y1="0" x2="120" y2="240" className="lane-divider" />

          <text x="120" y="16" textAnchor="middle" className="compass-label">N</text>
          <text x="120" y="232" textAnchor="middle" className="compass-label">S</text>
          <text x="16" y="125" textAnchor="middle" className="compass-label">W</text>
          <text x="224" y="125" textAnchor="middle" className="compass-label">E</text>

          <ApproachArrows axis="ns" active={phase === "ns"} />
          <ApproachArrows axis="ew" active={phase === "ew"} />

          <circle
            cx="108" cy="92" r="6"
            className={`signal-dot ${phase === "ns" ? "signal-dot-go" : "signal-dot-stop"}`}
          />
          <circle
            cx="132" cy="148" r="6"
            className={`signal-dot ${phase === "ns" ? "signal-dot-go" : "signal-dot-stop"}`}
          />
          <circle
            cx="92" cy="132" r="6"
            className={`signal-dot ${phase === "ew" ? "signal-dot-go" : "signal-dot-stop"}`}
          />
          <circle
            cx="148" cy="108" r="6"
            className={`signal-dot ${phase === "ew" ? "signal-dot-go" : "signal-dot-stop"}`}
          />
        </svg>

        <div className="intersection-legend">
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-ns" />
            <span className="legend-text">
              North-South: {baseline.north_south_green}s → {optimized.north_south_green}s
              {nsIncreased && <span className="legend-delta"> (+)</span>}
            </span>
          </div>
          <div className="legend-row">
            <span className="legend-swatch legend-swatch-ew" />
            <span className="legend-text">
              East-West: {baseline.east_west_green}s → {optimized.east_west_green}s
              {ewIncreased && <span className="legend-delta"> (+)</span>}
            </span>
          </div>
          <p className="legend-caption">
            Showing the {planView} plan's signal cycle, played back at 3× speed
            from its modeled green-time seconds — an illustration of the plan,
            not a live signal feed.
          </p>
        </div>
      </div>
    </section>
  );
}