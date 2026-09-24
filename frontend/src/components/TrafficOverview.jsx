/**
 * Traffic Overview panel.
 * Displays the raw observation data returned by the backend for the
 * selected timestamp. Purely presentational — only shows real API fields.
 * Adds a density gauge and a one-line summary derived entirely from
 * the observation values (no invented data).
 */

import { useCountUp } from "../hooks/useCountUp";

const CONGESTION_STYLES = {
  Low: { color: "#4ade80", label: "Low" },
  Moderate: { color: "#fbbf24", label: "Moderate" },
  High: { color: "#f87171", label: "High" },
};

function CongestionBadge({ level }) {
  const style = CONGESTION_STYLES[level] || { color: "#94a3b8", label: level };
  return (
    <span
      className="congestion-badge"
      style={{
        color: style.color,
        borderColor: style.color,
        backgroundColor: `${style.color}1a`, // low-opacity fill
      }}
    >
      {style.label}
    </span>
  );
}

function DensityGauge({ value, color }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="density-gauge">
      <div className="density-gauge-track">
        <div
          className="density-gauge-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <div className="density-gauge-scale">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function buildSummary({ vehicle_count, avg_speed, vehicle_density, congestion_level }) {
  const congestionPhrase =
    congestion_level === "High"
      ? "congestion is high"
      : congestion_level === "Moderate"
      ? "congestion is moderate"
      : "traffic is flowing freely";

  return `At this timestamp, ${vehicle_count} vehicles were observed moving at an average of ${avg_speed} km/h across ${vehicle_density}% density — ${congestionPhrase}.`;
}

export default function TrafficOverview({ observation }) {
  if (!observation) return null;

  const { timestamp, vehicle_count, avg_speed, vehicle_density, congestion_level } =
    observation;

  const animatedCount = useCountUp(vehicle_count);
  const animatedSpeed = useCountUp(avg_speed);
  const animatedDensity = useCountUp(vehicle_density);

  const congestionColor =
    (CONGESTION_STYLES[congestion_level] || { color: "#94a3b8" }).color;

  return (
    <section className="panel traffic-overview">
      <h2 className="panel-title">Traffic Overview</h2>

      <p className="overview-summary">{buildSummary(observation)}</p>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Timestamp</span>
          <span className="metric-value">{timestamp}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Vehicle Count</span>
          <span className="metric-value">{Math.round(animatedCount)}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Avg Speed</span>
          <span className="metric-value">{animatedSpeed.toFixed(1)} km/h</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Vehicle Density</span>
          <span className="metric-value">{animatedDensity.toFixed(1)}%</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Congestion Level</span>
          <CongestionBadge level={congestion_level} />
        </div>
      </div>

      <div className="density-gauge-wrap">
        <span className="density-gauge-label">Vehicle density</span>
        <DensityGauge value={vehicle_density} color={congestionColor} />
      </div>
    </section>
  );
}