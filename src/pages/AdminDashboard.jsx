import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import "../index.css";
import { useInventory } from "../context/InventoryContext.jsx";

export default function AdminDashboard() {
  const { products, sales, replacements, resetSales } = useInventory();

  const totalProducts = products.length;
  const totalMain = useMemo(
    () =>
      products.reduce(
        (sum, p) =>
          sum +
          (p.sizes || []).reduce((inner, s) => inner + (Number(s.mainStockQty) || 0), 0),
        0
      ),
    [products]
  );
  const totalShop = useMemo(
    () =>
      products.reduce(
        (sum, p) =>
          sum +
          (p.sizes || []).reduce((inner, s) => inner + (Number(s.shopStockQty) || 0), 0),
        0
      ),
    [products]
  );
  const totalSalesAmount = useMemo(
    () => sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
    [sales]
  );
  const today = new Date().toISOString().slice(0, 10);
  const todaySalesQty = sales
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);

  // Editable login credentials for Admin & Sales
  const [adminEmail, setAdminEmail] = useState("admin@jegnit.com");
  const [adminPassword, setAdminPassword] = useState("1234");
  const [salesEmail, setSalesEmail] = useState("sales@jegnit.com");
  const [salesPassword, setSalesPassword] = useState("1234");
  const [credMessage, setCredMessage] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("jegnit-inventory-credentials-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.admin?.email) setAdminEmail(parsed.admin.email);
      if (parsed?.admin?.password) setAdminPassword(parsed.admin.password);
      if (parsed?.sales?.email) setSalesEmail(parsed.sales.email);
      if (parsed?.sales?.password) setSalesPassword(parsed.sales.password);
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
      };
      window.localStorage.setItem("jegnit-inventory-credentials-v1", JSON.stringify(payload));
      setCredMessage("Login emails and passwords updated.");
      setTimeout(() => setCredMessage(""), 2500);
    } catch {
      setCredMessage("Could not save credentials.");
    }
  };

  return (
    <GlassCard title="Admin Command Center">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", color: "var(--black-lighter)" }}>
          High-level snapshot of your inventory, sales and replacements. All numbers auto‑update in real time as sales
          and exchanges are recorded.
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            background: "rgba(255,102,0,0.08)",
            border: "1px solid rgba(255,102,0,0.3)",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          Today {today} • {todaySalesQty} items sold
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: "20px" }}>
        <div className="info-box info-box-primary">
          <div className="info-box-label">Total Sales Amount</div>
          <div className="info-box-value">
            ETB {Number(totalSalesAmount || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="info-box-footer">Lifetime revenue recorded through this system.</div>
        </div>
        <div className="info-box info-box-primary">
          <div className="info-box-label">Inventory (Main)</div>
          <div className="info-box-value">{totalMain}</div>
          <div className="info-box-footer">Total units currently stored in main stock.</div>
        </div>
        <div className="info-box info-box-primary">
          <div className="info-box-label">Inventory (Shop)</div>
          <div className="info-box-value">{totalShop}</div>
          <div className="info-box-footer">Total units currently available for sale in shop.</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Total Products</div>
          <div className="info-box-value">{totalProducts}</div>
          <div className="info-box-footer">Unique product entries with at least one size.</div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Today's Sold Qty</div>
          <div className="info-box-value">{todaySalesQty}</div>
          <div className="info-box-footer">Number of items sold today.</div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Replacements (Total)</div>
          <div className="info-box-value">{replacements.length}</div>
          <div className="info-box-footer">
            Completed exchange transactions with price differences tracked.
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Sales Dashboard Controls</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Reset Sales Data</label>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("This will clear all recorded sales and reset the sales dashboard. Continue?")) {
                resetSales();
              }
            }}
          >
            Reset Sales Dashboard
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>User Access (Admin Only)</h3>
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
          <button type="submit">Save Login Details</button>
        </div>
      </form>
      {credMessage && (
        <div className={`alert ${credMessage.includes("updated") ? "alert-success" : "alert-error"}`}>{credMessage}</div>
      )}
    </GlassCard>
  );
}
