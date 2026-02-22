import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import "../index.css";

const CRED_KEY = "jegnit-inventory-credentials-v1";
const DEFAULT_CREDS = {
  admin: { email: "admin@jegnit.com", password: "1234" },
  sales: { email: "sales@jegnit.com", password: "1234" },
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [creds, setCreds] = useState(DEFAULT_CREDS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CRED_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.admin?.email && parsed?.admin?.password && parsed?.sales?.email && parsed?.sales?.password) {
        setCreds(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === creds.admin.email && password === creds.admin.password) {
      setMessage("Welcome Admin.");
      onLoginSuccess("admin");
    } else if (email === creds.sales.email && password === creds.sales.password) {
      setMessage("Welcome Sales.");
      onLoginSuccess("sales");
    } else {
      setMessage("Invalid credentials. Try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "22px",
        background: "var(--black)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <GlassCard title="Login - JEGNIT Inventory Tracking System">
          <div className="alert alert-info">
            JEGNIT Inventory Tracking System. Use your role account to continue.
          </div>

          <form onSubmit={handleLogin} className="form-grid">
            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                placeholder="admin@jegnit.com or sales@jegnit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="1234"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <button type="submit">Login</button>
            </div>
          </form>

          <div className="alert alert-info" style={{ marginTop: "16px", fontSize: "13px" }}>
            <strong>Demo accounts:</strong>
            <br />
            <strong>Admin</strong>: admin@jegnit.com / 1234
            <br />
            <strong>Sales</strong>: sales@jegnit.com / 1234
          </div>

          {message && (
            <div className={`alert ${message.includes("Welcome") ? "alert-success" : "alert-error"}`} style={{ marginTop: "12px" }}>
              {message}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
