// Baseline vs optimized signal cycle, drawn as two proportional bars.
// Solid segment = North-South green, outlined segment = East-West green.

function CycleBar({ label, plan, scale, tone }) {
  const ns = plan.north_south_green;
  const ew = plan.east_west_green;

  return (
    <div className="cycle-row">
      <span className="cycle-row-label">{label}</span>
      <div className={`cycle-bar cycle-bar-${tone}`}>
        <div className="cycle-seg cycle-seg-ns" style={{ width: `${(ns / scale) * 100}%` }}>
          <span className="mono">NS {ns}s</span>
        </div>
        <div className="cycle-seg cycle-seg-ew" style={{ width: `${(ew / scale) * 100}%` }}>
          <span className="mono">EW {ew}s</span>
        </div>
      </div>
    </div>
  );
}

function formatDelta(value) {
  return `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)} s`;
}

export default function CycleTimeline({ baseline, optimized }) {
  if (!baseline || !optimized) return null;

  const baseCycle = baseline.north_south_green + baseline.east_west_green;
  const optCycle = optimized.north_south_green + optimized.east_west_green;
  const scale = Math.max(baseCycle, optCycle);

  const nsShift = optimized.north_south_green - baseline.north_south_green;
  const ewShift = optimized.east_west_green - baseline.east_west_green;

  return (
    <section className="panel cycle-timeline">
      <div className="panel-header-row">
        <h2 className="panel-title">Signal cycle timeline</h2>
        <span className="estimated-tag mono">{scale} s cycle</span>
      </div>

      <CycleBar label="Baseline" plan={baseline} scale={scale} tone="baseline" />
      <CycleBar label="Optimized" plan={optimized} scale={scale} tone="optimized" />

      <div className="cycle-footer">
        <span className="cycle-shift">
          North–South green <strong className="mono">{formatDelta(nsShift)}</strong>
        </span>
        <span className="cycle-shift">
          East–West green <strong className="mono">{formatDelta(ewShift)}</strong>
        </span>
        <span className="cycle-key">
          <span className="cycle-key-swatch cycle-key-ns" /> North–South
          <span className="cycle-key-swatch cycle-key-ew" /> East–West
        </span>
      </div>
    </section>
  );
}