import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Transfers() {
  const { products, transfers, confirmTransfer } = useInventory();

  // ─── Transfer confirmation state ────────────────────────────────────────────
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmOk, setConfirmOk] = useState("");
  const [confirmErr, setConfirmErr] = useState("");

  // ─── Filter state ───────────────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "pending" | "confirmed"

  // ─── Derived data ───────────────────────────────────────────────────────────
  const pendingTransfers = useMemo(
    () =>
      [...transfers]
        .filter((t) => t.status === "pending")
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)),
    [transfers]
  );

  const filteredTransfers = useMemo(() => {
    const sorted = [...transfers].sort((a, b) =>
      b.createdAt > a.createdAt ? 1 : -1
    );
    if (historyFilter === "pending") return sorted.filter((t) => t.status === "pending");
    if (historyFilter === "confirmed") return sorted.filter((t) => t.status === "confirmed");
    return sorted;
  }, [transfers, historyFilter]);

  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const confirmedCount = transfers.filter((t) => t.status === "confirmed").length;

  // ─── Handler ────────────────────────────────────────────────────────────────
  const handleConfirmTransfer = (transferId, transferQty, productName, sizeName) => {
    setConfirmingId(transferId);
    setConfirmOk("");
    setConfirmErr("");

    const confirmed = window.confirm(
      `CONFIRM STOCK RECEIPT\n\n` +
        `Product: ${productName} (${sizeName})\n` +
        `Quantity: ${transferQty} unit(s)\n\n` +
        `By confirming, you certify that you have physically counted and received all ${transferQty} unit(s). ` +
        `This action will add them to Shop stock and cannot be undone.\n\n` +
        `Confirm receipt?`
    );

    if (!confirmed) {
      setConfirmingId(null);
      return;
    }

    try {
      confirmTransfer(transferId);
      setConfirmOk(
        `✅ Confirmed! ${transferQty} unit(s) of ${productName} (${sizeName}) added to Shop stock.`
      );
      setTimeout(() => setConfirmOk(""), 5000);
    } catch (error) {
      setConfirmErr(error?.message || "Could not confirm transfer.");
      setTimeout(() => setConfirmErr(""), 4000);
    } finally {
      setConfirmingId(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <GlassCard title="Stock Transfers">
      {/* ── Stats ── */}
      <div className="grid-3" style={{ marginBottom: "24px" }}>
        <div
          className="info-box info-box-primary"
          style={{
            borderColor: pendingCount > 0 ? "rgba(255,152,0,0.8)" : undefined,
            boxShadow: pendingCount > 0 ? "0 14px 30px rgba(255,152,0,0.25)" : undefined,
          }}
        >
          <div className="info-box-label">Pending</div>
          <div className="info-box-value" style={{ color: pendingCount > 0 ? "#ffb74d" : undefined }}>
            {pendingCount}
          </div>
          <div className="info-box-footer">
            {pendingCount > 0
              ? "Awaiting your confirmation."
              : "All transfers confirmed."}
          </div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Confirmed</div>
          <div className="info-box-value">{confirmedCount}</div>
          <div className="info-box-footer">Successfully received into Shop stock.</div>
        </div>
        <div className="info-box info-box-secondary">
          <div className="info-box-label">Total</div>
          <div className="info-box-value">{transfers.length}</div>
          <div className="info-box-footer">All stock movements from Main → Shop.</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 1 — PENDING TRANSFERS (action required)
          ══════════════════════════════════════════════════════════════════════════ */}
      {pendingTransfers.length > 0 ? (
        <div
          style={{
            border: "2px solid rgba(255,152,0,0.6)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "28px",
            background: "rgba(255,152,0,0.06)",
          }}
        >
          <h3
            style={{
              margin: "0 0 6px 0",
              color: "#ffb74d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                background: "#ff6600",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "13px",
                fontWeight: 900,
              }}
            >
              {pendingTransfers.length}
            </span>
            Pending Transfers — Confirmation Required
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--black-lighter)" }}>
            The Admin has dispatched the following items from Main stock. Please
            physically count and verify receipt, then press{" "}
            <strong>Confirm Receipt</strong>. Shop stock will only be updated
            after your confirmation.
          </p>

          <div className="table-wrapper" style={{ marginBottom: "12px" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Units Dispatched</th>
                  <th style={{ width: "200px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>
                      <strong>{t.productName}</strong>
                    </td>
                    <td>{t.size}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "18px",
                          color: "#ffb74d",
                        }}
                      >
                        {t.qty}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-small"
                        disabled={confirmingId === t.id}
                        onClick={() =>
                          handleConfirmTransfer(
                            t.id,
                            t.qty,
                            t.productName,
                            t.size
                          )
                        }
                        style={{
                          background: "rgba(76,175,80,0.85)",
                          border: "none",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {confirmingId === t.id ? "Processing…" : "✓ Confirm Receipt"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {confirmOk && (
            <div className="alert alert-success">{confirmOk}</div>
          )}
          {confirmErr && (
            <div className="alert alert-error">{confirmErr}</div>
          )}
        </div>
      ) : (
        <div
          className="alert alert-info"
          style={{ marginBottom: "20px", fontSize: "13px" }}
        >
          ✅ No pending stock transfers. All dispatched items have been confirmed.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SECTION 2 — TRANSFER HISTORY
          ══════════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "32px", marginBottom: "8px", color: "var(--orange)" }}>
        Transfer History
      </h3>
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        {["all", "pending", "confirmed"].map((f) => (
          <button
            key={f}
            type="button"
            className={`btn-small ${historyFilter === f ? "" : "btn-secondary"}`}
            onClick={() => setHistoryFilter(f)}
          >
            {f === "all" ? "All" : f === "pending" ? "⏳ Pending" : "✅ Confirmed"}
          </button>
        ))}
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Confirmed At</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", color: "var(--black-lighter)" }}
                >
                  No transfer records found.
                </td>
              </tr>
            )}
            {filteredTransfers.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.productName}</td>
                <td>{t.size}</td>
                <td>{t.qty}</td>
                <td>
                  {t.status === "pending" ? (
                    <span
                      style={{
                        background: "rgba(255,152,0,0.18)",
                        color: "#ffb74d",
                        borderRadius: "999px",
                        padding: "2px 10px",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      ⏳ Pending
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "rgba(76,175,80,0.18)",
                        color: "#81c784",
                        borderRadius: "999px",
                        padding: "2px 10px",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      ✅ Confirmed
                    </span>
                  )}
                </td>
                <td style={{ fontSize: "12px", color: "var(--black-lighter)" }}>
                  {t.confirmedAt
                    ? new Date(t.confirmedAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
