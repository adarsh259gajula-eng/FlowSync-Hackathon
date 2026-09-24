/**
 * Authentication and User Profile API for FlowSync.
 * Connects to FastAPI backend and MongoDB cluster.
 */

const BASE_URL = "http://localhost:8000";

export async function loginUser(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Login failed. Please check your credentials.");
  }
  return data;
}

export async function registerUser(username, password, phone = "Not set", dob = "Not set") {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, phone, dob }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Registration failed. Username may already be taken.");
  }
  return data;
}

export async function getUserProfile(username) {
  const response = await fetch(`${BASE_URL}/api/user/profile?username=${encodeURIComponent(username)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to load user profile.");
  }
  return data;
}

export async function updateUserProfile(username, phone, dob) {
  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, phone, dob }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to update profile.");
  }
  return data;
}
