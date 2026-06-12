import React, { useEffect, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Settings() {
  const { resetAllData, isSyncing, syncError, supabaseConfigured } = useInventory();

  // ─── Editable login credentials ─────────────────────────────────────────────
  const [adminEmail, setAdminEmail] = useState("admin@jegnit.com");
  const [adminPassword, setAdminPassword] = useState("1234");
  const [salesEmail, setSalesEmail] = useState("sales@jegnit.com");
  const [salesPassword, setSalesPassword] = useState("1234");
  const [secretCode, setSecretCode] = useState("JEGNIT-RESET-2026");
  const [credMessage, setCredMessage] = useState("");

  // ─── Reset state ────────────────────────────────────────────────────────────
  const [resetError, setResetError] = useState("");
  const [resetOk, setResetOk] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("jegnit-inventory-credentials-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.admin?.email) setAdminEmail(parsed.admin.email);
      if (parsed?.admin?.password) setAdminPassword(parsed.admin.password);
      if (parsed?.sales?.email) setSalesEmail(parsed.sales.email);
      if (parsed?.sales?.password) setSalesPassword(parsed.sales.password);
      if (parsed?.secretCode) setSecretCode(parsed.secretCode);
    } catch {
      // ignore
    }
  }, []);

  const handleSaveCreds = (e) => {
    e.preventDefault();
    try {
      const payload = {
        admin: { email: adminEmail, password: adminPassword },
        sales: { email: salesEmail, password: salesPassword },
        secretCode,
      };
      window.localStorage.setItem("jegnit-inventory-credentials-v1", JSON.stringify(payload));
      setCredMessage("Login emails and passwords updated.");
      setTimeout(() => setCredMessage(""), 2500);
    } catch {
      setCredMessage("Could not save credentials.");
    }
  };

  const handleResetAll = (e) => {
    e.preventDefault();
    setResetError("");
    setResetOk("");
    const formData = new FormData(e.target);
    const emailInput = formData.get("confirmAdminEmail");
    const passwordInput = formData.get("confirmAdminPassword");
    if (emailInput !== adminEmail || passwordInput !== adminPassword) {
      setResetError("Admin email or password does not match. Reset cancelled.");
      return;
    }
    if (
      window.confirm(
        "This will erase ALL products, sales, and replacements data from the system. This cannot be undone. Continue?"
      )
    ) {
      resetAllData();
      setResetOk("All inventory, sales, and replacements data has been reset.");
    }
  };

  return (
    <GlassCard title="Settings">
      <div className="alert alert-info" style={{ fontSize: "13px" }}>
        Manage system credentials, sync configuration, and data resets from this panel.
      </div>

      {/* ── Cloud Sync Status ── */}
      <h3 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--orange)" }}>
        Cloud Sync Status
      </h3>
      <div className="grid-3" style={{ marginBottom: "20px" }}>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Supabase</div>
          <div className="info-box-value" style={{ fontSize: "16px" }}>
            {supabaseConfigured ? "✅ Connected" : "⚠ Not Configured"}
          </div>
          <div className="info-box-footer">
            {supabaseConfigured
              ? "Data is synced to the cloud in real time."
              : "Data is stored locally only. Set up .env to enable cloud sync."}
          </div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Sync Status</div>
          <div className="info-box-value" style={{ fontSize: "16px" }}>
            {isSyncing ? "🔄 Syncing…" : syncError ? "❌ Error" : "✅ Idle"}
          </div>
          <div className="info-box-footer">
            {syncError ? syncError : "Last sync completed without errors."}
          </div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Storage</div>
          <div className="info-box-value" style={{ fontSize: "16px" }}>
            💾 localStorage
          </div>
          <div className="info-box-footer">
            All data is also persisted locally as a fallback.
          </div>
        </div>
      </div>

      {/* ── User Access ── */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
        User Access (Admin Only)
      </h3>
      <div className="alert alert-info" style={{ fontSize: "13px", marginBottom: "16px" }}>
        Update login credentials for Admin and Sales users. Changes take effect immediately.
      </div>
      <form onSubmit={handleSaveCreds} className="form-grid">
        <div className="form-group">
          <label>Admin Email</label>
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Admin Password</label>
          <input type="text" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Sales Email</label>
          <input type="email" value={salesEmail} onChange={(e) => setSalesEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Sales Password</label>
          <input type="text" value={salesPassword} onChange={(e) => setSalesPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Admin Secret Code (for 'Forgot password')</label>
          <input
            type="text"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <button type="submit">Save Login Details</button>
        </div>
      </form>
      {credMessage && (
        <div className={`alert ${credMessage.includes("updated") ? "alert-success" : "alert-error"}`}>{credMessage}</div>
      )}

      {/* ── Danger Zone ── */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "#dc3545" }}>
        ⚠ Danger Zone — Reset All Data
      </h3>
      <div className="alert alert-warning" style={{ fontSize: "13px", marginBottom: "16px" }}>
        <strong>Warning:</strong> This action will permanently erase ALL products, sales, replacements, and transfer records.
        This cannot be undone. You must re-enter your admin credentials to confirm.
      </div>
      <form onSubmit={handleResetAll} className="form-grid">
        <div className="form-group">
          <label>Confirm Admin Email</label>
          <input
            type="email"
            name="confirmAdminEmail"
            placeholder="Type current admin email to confirm"
            required
          />
        </div>
        <div className="form-group">
          <label>Confirm Admin Password</label>
          <input
            type="password"
            name="confirmAdminPassword"
            placeholder="Type current admin password to confirm"
            required
          />
        </div>
        <div className="form-group">
          <button type="submit" className="btn-danger">
            Reset ALL Products, Sales & Replacements
          </button>
        </div>
      </form>
      {(resetError || resetOk) && (
        <div style={{ marginTop: "12px" }}>
          {resetError && <div className="alert alert-error">{resetError}</div>}
          {resetOk && <div className="alert alert-success">{resetOk}</div>}
        </div>
      )}
    </GlassCard>
  );
}
