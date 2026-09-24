import { useState, useEffect } from "react";
import { loginUser, registerUser, updateUserProfile, getUserProfile } from "../api/authApi";

export default function UserAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("flowsync_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "register" | "profile"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("flowsync_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("flowsync_user");
    }
  }, [currentUser]);

  function openAuth(targetMode = "login") {
    setErrorMsg("");
    setSuccessMsg("");
    if (currentUser) {
      setMode("profile");
      setEditPhone(currentUser.phone || "");
      setEditDob(currentUser.dob || "");
      setIsEditing(false);
    } else {
      setMode(targetMode);
    }
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setErrorMsg("");
    setSuccessMsg("");
    setIsEditing(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        const res = await loginUser(username.trim(), password.trim());
        if (res.user) {
          setCurrentUser(res.user);
          setSuccessMsg("Logged in successfully!");
          setTimeout(() => closeModal(), 700);
        }
      } else {
        const res = await registerUser(
          username.trim(),
          password.trim(),
          phone.trim() || "Not set",
          dob.trim() || "Not set"
        );
        if (res.user) {
          setCurrentUser(res.user);
          setSuccessMsg("Account created and connected to MongoDB!");
          setTimeout(() => closeModal(), 800);
        }
      }
      setUsername("");
      setPassword("");
      setPhone("");
      setDob("");
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await updateUserProfile(currentUser.username, editPhone, editDob);
      if (res.user) {
        setCurrentUser(res.user);
        setIsEditing(false);
        setSuccessMsg("Profile updated in MongoDB!");
        setTimeout(() => setSuccessMsg(""), 2000);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    closeModal();
  }

  const getBitmojiAvatar = (user) => {
    if (!user) return "";
    if (user.avatar && !user.avatar.includes("bottts") && !user.avatar.endsWith(".svg")) {
      return user.avatar;
    }
    const seed = encodeURIComponent(user.username || "user");
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&backgroundColor=b6e3f4`;
  };

  return (
    <div className="user-auth-wrapper">
      {/* Trigger Button in Top Right */}
      {!currentUser ? (
        <button
          type="button"
          className="auth-trigger-btn"
          onClick={() => openAuth("login")}
          title="Sign In or Register"
        >
          <svg className="auth-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="auth-trigger-text">Sign In / Register</span>
        </button>
      ) : (
        <button
          type="button"
          className="auth-user-badge"
          onClick={() => openAuth("profile")}
          title={`Logged in as ${currentUser.username}`}
        >
          <img
            src={getBitmojiAvatar(currentUser)}
            alt={currentUser.username}
            className="auth-user-avatar"
          />
          <div className="auth-user-info">
            <span className="auth-user-name">{currentUser.username}</span>
            <span className="auth-user-status">Online</span>
          </div>
          <span className="auth-status-beacon" />
        </button>
      )}

      {/* Unified Auth Modal */}
      {isOpen && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={closeModal} aria-label="Close modal">
              &times;
            </button>

            {mode === "profile" && currentUser ? (
              /* User Profile View */
              <div className="auth-profile-view">
                <div className="auth-profile-header">
                  <img
                    src={getBitmojiAvatar(currentUser)}
                    alt={currentUser.username}
                    className="auth-profile-avatar"
                  />
                  <h3 className="auth-profile-name">{currentUser.username}</h3>
                  <span className="auth-db-badge">Connected to MongoDB</span>
                </div>

                {successMsg && <div className="auth-alert success">{successMsg}</div>}
                {errorMsg && <div className="auth-alert error">{errorMsg}</div>}

                <div className="auth-profile-fields">
                  <div className="auth-field-row">
                    <label>Phone Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+1 555-0192"
                        className="auth-input"
                      />
                    ) : (
                      <span className="auth-field-val">{currentUser.phone || "Not set"}</span>
                    )}
                  </div>

                  <div className="auth-field-row">
                    <label>Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        placeholder="MM/DD/YYYY"
                        className="auth-input"
                      />
                    ) : (
                      <span className="auth-field-val">{currentUser.dob || "Not set"}</span>
                    )}
                  </div>
                </div>

                <div className="auth-profile-actions">
                  {isEditing ? (
                    <div className="auth-edit-btns">
                      <button
                        type="button"
                        className="auth-btn-save"
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                      >
                        {isLoading ? "Saving..." : "Save to Database"}
                      </button>
                      <button
                        type="button"
                        className="auth-btn-cancel"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="auth-btn-edit"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Account Details
                    </button>
                  )}

                  <button
                    type="button"
                    className="auth-btn-logout"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              /* Unified Registration & Login View */
              <div className="auth-form-view">
                {/* Tabs for switching between Sign In & Register */}
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={`auth-tab ${mode === "login" ? "active" : ""}`}
                    onClick={() => {
                      setMode("login");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`auth-tab ${mode === "register" ? "active" : ""}`}
                    onClick={() => {
                      setMode("register");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                  >
                    Register
                  </button>
                </div>

                <div className="auth-header-desc">
                  <h3>{mode === "login" ? "Welcome Back" : "Create Account"}</h3>
                  <p>
                    {mode === "login"
                      ? "Sign in to access your traffic simulation profile."
                      : "Register your operator profile with MongoDB."}
                  </p>
                </div>

                {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
                {successMsg && <div className="auth-alert success">{successMsg}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="auth-input-group">
                    <label htmlFor="auth-username">Username</label>
                    <input
                      id="auth-username"
                      type="text"
                      className="auth-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="auth-password">Password</label>
                    <input
                      id="auth-password"
                      type="password"
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  {mode === "register" && (
                    <>
                      <div className="auth-input-group">
                        <label htmlFor="auth-phone">Phone Number (optional)</label>
                        <input
                          id="auth-phone"
                          type="text"
                          className="auth-input"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 555-0100"
                        />
                      </div>

                      <div className="auth-input-group">
                        <label htmlFor="auth-dob">Date of Birth (optional)</label>
                        <input
                          id="auth-dob"
                          type="text"
                          className="auth-input"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          placeholder="MM/DD/YYYY"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Connecting..."
                      : mode === "login"
                      ? "Sign In"
                      : "Create Account"}
                  </button>
                </form>

                <div className="auth-footer-switch">
                  {mode === "login" ? (
                    <span>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => {
                          setMode("register");
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                      >
                        Register here
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already registered?{" "}
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={() => {
                          setMode("login");
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                      >
                        Sign in here
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
