import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import "../index.css";
import { useInventory } from "../context/InventoryContext.jsx";

export default function AdminDashboard() {
  const { products, sales, replacements, transfers, getMonthlySummary, resetAllData } = useInventory();

  const pendingTransfers = transfers.filter((t) => t.status === "pending").length;
  const confirmedTransfers = transfers.filter((t) => t.status === "confirmed").length;

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

  const monthlySummary = useMemo(
    () => getMonthlySummary(sales || [], {}),
    [sales, getMonthlySummary]
  );

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [showMonthlyCards, setShowMonthlyCards] = useState(false);

  return (
    <GlassCard title="Admin Command Center">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ fontSize: "13px", color: "var(--black-lighter)" }}>
          High-level snapshot of your inventory, sales and replacements. All numbers auto‑update in real time as sales
          and exchanges are recorded.
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            background: "rgba(255,102,0,0.08)",
            border: "1px solid rgba(255,102,0,0.3)",
            fontSize: "11px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
            maxWidth: "100%",
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

      <h3 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--orange)" }}>Monthly Revenue Overview</h3>
      {monthlySummary.length === 0 ? (
        <div className="alert alert-info">No sales recorded yet. Monthly revenue will appear here once sales are added.</div>
      ) : (
        <>
          <div style={{ marginBottom: "12px" }}>
            <button
              type="button"
              className="btn-small"
              onClick={() => setShowMonthlyCards((v) => !v)}
            >
              {showMonthlyCards ? "Hide Monthly Cards" : "Show Monthly Cards"}
            </button>
          </div>
          {showMonthlyCards && (
            <>
              <div className="grid-3" style={{ marginBottom: "20px" }}>
                {monthlySummary.map((m) => (
                  <button
                    key={m.month}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(m.month);
                      setSelectedStats(m);
                    }}
                    className={`info-box info-box-secondary clickable-card${
                      selectedMonth === m.month ? " clickable-card-active" : ""
                    }`}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <div className="info-box-label">Month</div>
                    <div className="info-box-value" style={{ fontSize: "18px" }}>{m.month}</div>
                    <div className="info-box-footer">
                      Revenue:{" "}
                      <strong>
                        ETB{" "}
                        {Number(m.total || 0).toLocaleString("en-ET", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                      <br />
                      Items sold: <strong>{Number(m.qty || 0)}</strong>
                    </div>
                  </button>
                ))}
              </div>
              {selectedMonth && selectedStats && (
                <div className="alert alert-info">
                  In <strong>{selectedMonth}</strong>, total revenue was{" "}
                  <strong>
                    ETB{" "}
                    {Number(selectedStats.total || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>{" "}
                  from <strong>{Number(selectedStats.qty || 0)}</strong> items sold.
                </div>
              )}
            </>
          )}
        </>
      )}

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

      <div className="grid-3" style={{ marginTop: "16px" }}>
        <div className="info-box info-box-secondary" style={{ borderColor: pendingTransfers > 0 ? "rgba(255,152,0,0.5)" : undefined }}>
          <div className="info-box-label">Pending Transfers</div>
          <div className="info-box-value" style={{ color: pendingTransfers > 0 ? "#ffb74d" : undefined }}>
            {pendingTransfers}
          </div>
          <div className="info-box-footer">
            {pendingTransfers > 0
              ? "Awaiting sales person confirmation."
              : "All transfers confirmed by sales staff."}
          </div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Confirmed Transfers</div>
          <div className="info-box-value">{confirmedTransfers}</div>
          <div className="info-box-footer">Total transfers confirmed by sales staff.</div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Total Transfers</div>
          <div className="info-box-value">{transfers.length}</div>
          <div className="info-box-footer">All stock movements from Main → Shop.</div>
        </div>
      </div>
    </GlassCard>
  );
}
