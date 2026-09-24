import { useState } from "react";
import { analyzeTraffic } from "./api/analyzeApi";
import ScenarioControls from "./components/ScenarioControls";
import TrafficOverview from "./components/TrafficOverview";
import SignalOptimization from "./components/SignalOptimization";
import SustainabilityImpact from "./components/SustainabilityImpact";
import IntersectionDiagram from "./components/IntersectionDiagram";
import CycleTimeline from "./components/CycleTimeline";
import InsightsPanel from "./components/InsightsPanel";
import { useScenarioTransition } from "./hooks/useScenarioTransition";
import "./App.css";

// The dataset's available timestamps aren't exposed by any backend endpoint
// yet (only POST /api/analyze and GET /api/health exist). Once one is added
// (e.g. GET /api/timestamps), fetch it on mount and pass the result here —
// ScenarioControls already renders a dropdown automatically when this array
// is non-empty, and falls back to free-text entry otherwise.
const AVAILABLE_TIMESTAMPS = [];

const STATUS_LABELS = {
  idle: "Ready",
  loading: "Analyzing",
  ready: "Plan ready",
  error: "Analysis failed",
};

// A traffic-signal head that mirrors the app state:
// green = ready / plan ready, red-amber-green cycle = analyzing, red = failed.
function SignalHead({ status }) {
  return (
    <div className="signal-status" aria-live="polite">
      <div className="signal-head" data-status={status} aria-hidden="true">
        <span className="lamp lamp-red" />
        <span className="lamp lamp-amber" />
        <span className="lamp lamp-green" />
      </div>
      <span className="signal-status-text">{STATUS_LABELS[status]}</span>
    </div>
  );
}

export default function App() {
  const [timestamp, setTimestamp] = useState("");
  const [directionScenario, setDirectionScenario] = useState("balanced");
  const [result, setResult] = useState(null);
  // The inputs the current result was actually computed from, so the summary
  // bar doesn't change while the user edits the controls.
  const [analyzed, setAnalyzed] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const transitionClass = useScenarioTransition(isLoading);

  const status = isLoading ? "loading" : error ? "error" : result ? "ready" : "idle";

  async function handleAnalyze() {
    if (!timestamp) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyzeTraffic(timestamp, directionScenario);
      setResult(data);
      setAnalyzed({ timestamp, directionScenario });
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing traffic.");
      setResult(null);
      setAnalyzed(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-text">
            <h1 className="app-title">FlowSync</h1>
            <p className="app-subtitle">
              AI-assisted traffic signal optimization
            </p>
          </div>
          <SignalHead status={status} />
        </div>
        <div className="lane-line" aria-hidden="true" />
      </header>

      <main className="app-main reveal-group">
        <ScenarioControls
          timestamp={timestamp}
          onTimestampChange={setTimestamp}
          directionScenario={directionScenario}
          onDirectionScenarioChange={setDirectionScenario}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          availableTimestamps={AVAILABLE_TIMESTAMPS}
        />


        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner-label">Analysis failed</span>
            <span className="error-banner-message">{error}</span>
          </div>
        )}

        {!result && !error && !isLoading && (
          <div className="empty-state">
            <div className="crosswalk" aria-hidden="true" />
            <div className="empty-state-body">
              <h2 className="empty-state-title">No signal plan yet</h2>
              <p>
                Choose a timestamp and a direction scenario, then select
                Analyze Traffic to compare the baseline timing with the
                optimized plan.
              </p>
            </div>
          </div>
        )}

        {isLoading && !result && (
          <div className="loading-state" aria-live="polite">
            <span className="loading-lamps" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Running signal optimization…</span>
          </div>
        )}

        {result && (
          <>
            {analyzed && (
              <div className="plan-bar">
                <span className="plan-bar-item">
                  <span className="plan-bar-key">Timestamp</span>
                  <span className="plan-bar-value">{analyzed.timestamp}</span>
                </span>
                <span className="plan-bar-item">
                  <span className="plan-bar-key">Scenario</span>
                  <span className="plan-bar-value plan-bar-scenario">
                    {analyzed.directionScenario}
                  </span>
                </span>
              </div>
            )}

            <div className={`results-stack ${transitionClass}`}>
              <TrafficOverview observation={result.observation} />
              <SignalOptimization
                baseline={result.baseline}
                optimized={result.optimized}
              />
              <IntersectionDiagram
                baseline={result.baseline}
                optimized={result.optimized}
              />
              <CycleTimeline
                baseline={result.baseline}
                optimized={result.optimized}
              />
              <SustainabilityImpact impact={result.impact} />
              <InsightsPanel
                observation={result.observation}
                baseline={result.baseline}
                optimized={result.optimized}
                impact={result.impact}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}