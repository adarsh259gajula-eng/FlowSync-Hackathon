/**
 * Traffic Scenario control panel.
 * Lets the user pick a timestamp + direction scenario and trigger analysis.
 * Purely presentational — holds no fetch logic itself.
 */

const DIRECTION_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "north_south_heavy", label: "North-South Heavy" },
  { value: "east_west_heavy", label: "East-West Heavy" },
];

export default function ScenarioControls({
  timestamp,
  onTimestampChange,
  directionScenario,
  onDirectionScenarioChange,
  onAnalyze,
  isLoading,
  availableTimestamps,
}) {
  return (
    <section className="panel scenario-controls">
      <h2 className="panel-title">Traffic Scenario</h2>

      <div className="control-row">
        <label className="control-label" htmlFor="timestamp-select">
          Timestamp
        </label>
        {availableTimestamps && availableTimestamps.length > 0 ? (
          <select
            id="timestamp-select"
            className="control-input"
            value={timestamp}
            onChange={(e) => onTimestampChange(e.target.value)}
          >
            <option value="" disabled>
              Select a timestamp
            </option>
            {availableTimestamps.map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="timestamp-select"
            className="control-input"
            type="text"
            placeholder="e.g. 08:17:00"
            value={timestamp}
            onChange={(e) => onTimestampChange(e.target.value)}
          />
        )}
      </div>

      <div className="control-row">
        <label className="control-label" htmlFor="direction-select">
          Direction Scenario
        </label>
        <select
          id="direction-select"
          className="control-input"
          value={directionScenario}
          onChange={(e) => onDirectionScenarioChange(e.target.value)}
        >
          {DIRECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        className="analyze-button"
        onClick={onAnalyze}
        disabled={isLoading || !timestamp}
      >
        {isLoading ? "Analyzing..." : "Analyze Traffic"}
      </button>
    </section>
  );
}