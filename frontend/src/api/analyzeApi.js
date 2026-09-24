/**
 * Isolated API logic for the FlowSync backend.
 * Keeps all fetch/network concerns out of UI components.
 */

const BASE_URL = "http://localhost:8000";

/**
 * Calls POST /api/analyze with the selected timestamp and direction scenario.
 * Returns the parsed JSON response on success.
 * Throws an Error with a readable message on failure (network or API error).
 */
export async function analyzeTraffic(timestamp, directionScenario) {
  let response;

  try {
    response = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp,
        direction_scenario: directionScenario,
      }),
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the backend. Is the API running on http://localhost:8000?"
    );
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        detail = typeof errorBody.detail === "string"
          ? errorBody.detail
          : JSON.stringify(errorBody.detail);
      }
    } catch {
      // response body wasn't JSON, keep the generic status message
    }
    throw new Error(detail);
  }

  return response.json();
}

/**
 * Calls GET /api/health to check backend availability.
 * Returns true if the backend responds with status "ok", false otherwise.
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}