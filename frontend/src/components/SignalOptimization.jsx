/**
 * Signal Optimization panel.
 * Shows a before/after comparison of baseline vs optimized signal timing,
 * using only values returned by the backend. Bars animate to their new
 * widths on update, and a delay comparison chart visualizes the modeled
 * reduction alongside the baseline.
 */

import { useCountUp } from "../hooks/useCountUp";

function GreenTimeBar({ label, seconds, maxSeconds, colorClass }) {
  const animatedSeconds = useCountUp(seconds);
  const widthPercent = maxSeconds > 0 ? (animatedSeconds / maxSeconds) * 100 : 0;
  return (
    <div className="green-bar-row">
      <span className="green-bar-label">{label}</span>
      <div className="green-bar-track">
        <div
          className={`green-bar-fill ${colorClass}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="green-bar-value">{Math.round(animatedSeconds)}s</span>
    </div>
  );
}

function DelayComparisonChart({ baselineDelay, optimizedDelay }) {
  const maxDelay = Math.max(baselineDelay, optimizedDelay);
  const animatedBaseline = useCountUp(baselineDelay);
  const animatedOptimized = useCountUp(optimizedDelay);

  const baselineHeight = maxDelay > 0 ? (animatedBaseline / maxDelay) * 100 : 0;
  const optimizedHeight = maxDelay > 0 ? (animatedOptimized / maxDelay) * 100 : 0;

  return (
    <div className="delay-chart">
      <div className="delay-chart-bars">
        <div className="delay-chart-col">
          <span className="delay-chart-figure">{animatedBaseline.toFixed(1)}</span>
          <div className="delay-chart-track">
            <div
              className="delay-chart-fill delay-chart-fill-baseline"
              style={{ height: `${baselineHeight}%` }}
            />
          </div>
          <span className="delay-chart-col-label">Baseline</span>
        </div>
        <div className="delay-chart-col">
          <span className="delay-chart-figure">{animatedOptimized.toFixed(1)}</span>
          <div className="delay-chart-track">
            <div
              className="delay-chart-fill delay-chart-fill-optimized"
              style={{ height: `${optimizedHeight}%` }}
            />
          </div>
          <span className="delay-chart-col-label">Optimized</span>
        </div>
      </div>
      <span className="delay-chart-unit">veh-sec delay</span>
    </div>
  );
}

export default function SignalOptimization({ baseline, optimized }) {
  if (!baseline || !optimized) return null;

  const maxSeconds = Math.max(
    baseline.north_south_green,
    baseline.east_west_green,
    optimized.north_south_green,
    optimized.east_west_green
  );

  const animatedReduction = useCountUp(optimized.delay_reduction);

  return (
    <section className="panel signal-optimization">
      <h2 className="panel-title">Optimized Signal Plan</h2>

      <div className="signal-optimization-body">
        <div className="signal-comparison-grid">
          <div className="signal-column">
            <h3 className="signal-column-title">Baseline</h3>
            <GreenTimeBar
              label="North-South"
              seconds={baseline.north_south_green}
              maxSeconds={maxSeconds}
              colorClass="bar-baseline"
            />
            <GreenTimeBar
              label="East-West"
              seconds={baseline.east_west_green}
              maxSeconds={maxSeconds}
              colorClass="bar-baseline"
            />
            <div className="delay-readout">
              <span className="delay-label">Delay</span>
              <span className="delay-value">{baseline.delay.toFixed(2)} veh-sec</span>
            </div>
          </div>

          <div className="signal-column">
            <h3 className="signal-column-title">Optimized</h3>
            <GreenTimeBar
              label="North-South"
              seconds={optimized.north_south_green}
              maxSeconds={maxSeconds}
              colorClass="bar-optimized"
            />
            <GreenTimeBar
              label="East-West"
              seconds={optimized.east_west_green}
              maxSeconds={maxSeconds}
              colorClass="bar-optimized"
            />
            <div className="delay-readout">
              <span className="delay-label">Delay</span>
              <span className="delay-value">{optimized.delay.toFixed(2)} veh-sec</span>
            </div>
          </div>
        </div>

        <DelayComparisonChart
          baselineDelay={baseline.delay}
          optimizedDelay={optimized.delay}
        />
      </div>

      <div className="delay-reduction-banner">
        <span className="delay-reduction-label">Modeled Delay Reduction</span>
        <span className="delay-reduction-value">
          {animatedReduction.toFixed(2)} veh-sec
        </span>
      </div>
    </section>
  );
}