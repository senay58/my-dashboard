import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Sales() {
  const {
    products,
    sales,
    transfers,
    recordSale,
    confirmTransfer,
    PAYMENT_METHODS,
    DELIVERY_TYPES,
    getLowStockItems,
  } = useInventory();

  // ─── Sale form state ────────────────────────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [qty, setQty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [deliveryType, setDeliveryType] = useState(DELIVERY_TYPES[0]);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // ─── Transfer confirmation state ────────────────────────────────────────────
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmOk, setConfirmOk] = useState("");
  const [confirmErr, setConfirmErr] = useState("");

  // ─── Low stock alerts ───────────────────────────────────────────────────────
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const selectedSize = useMemo(
    () => (selectedProduct?.sizes || []).find((s) => s.id === sizeId),
    [selectedProduct, sizeId]
  );

  useEffect(() => {
    setLowStockAlerts(getLowStockItems());
  }, [products, getLowStockItems]);

  // Pending transfers (newest first)
  const pendingTransfers = useMemo(
    () =>
      [...transfers]
        .filter((t) => t.status === "pending")
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)),
    [transfers]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const onSubmit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    try {
      if (!selectedSize) throw new Error("Please select a product and size.");
      const shopQty = Number(selectedSize.shopStockQty) || 0;
      if (shopQty === 0) throw new Error("Shop stock is zero. Cannot make sale.");
      if (shopQty < Number(qty))
        throw new Error(`Only ${shopQty} items available in shop stock.`);
      recordSale({
        date,
        productId,
        sizeId,
        qty: Number(qty),
        paymentMethod,
        deliveryType,
      });
      setOk("Sale recorded. Shop stock updated.");
      setQty("");
      setTimeout(() => setOk(""), 3000);
    } catch (error) {
      setErr(error?.message || "Could not record sale.");
      setTimeout(() => setErr(""), 4000);
    }
  };

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
    <GlassCard title="Sales Entry (Shop Stock — Sales Person)">

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 1 — PENDING TRANSFERS (action required)
          ════════════════════════════════════════════════════════════════════════ */}
      {pendingTransfers.length > 0 && (
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
            Pending Stock Transfers — Confirmation Required
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
      )}

      {/* No pending transfers indicator */}
      {pendingTransfers.length === 0 && (
        <div
          className="alert alert-info"
          style={{ marginBottom: "20px", fontSize: "13px" }}
        >
          ✅ No pending stock transfers. All dispatched items have been
          confirmed.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 2 — LOW STOCK ALERTS
          ════════════════════════════════════════════════════════════════════════ */}
      {lowStockAlerts.length > 0 && (
        <div className="alert alert-warning">
          <strong>Low Stock Alert:</strong> The following items have 3 or fewer
          units in shop stock:
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            {lowStockAlerts.map((item, idx) => (
              <li key={idx}>
                {item.product.name} ({item.sizeRow.size}) —{" "}
                {item.sizeRow.shopStockQty} units remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 3 — RECORD SALE
          ════════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "24px", marginBottom: "12px", color: "var(--orange)" }}>
        Record a Sale
      </h3>
      <div className="alert alert-info" style={{ fontSize: "13px" }}>
        Sales are deducted from Shop Stock only. Prices are set by Admin.
        Sales are blocked when shop stock reaches 0.
      </div>

      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Product</label>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setSizeId("");
            }}
            required
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Size</label>
          <select
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value)}
            disabled={!selectedProduct}
            required
          >
            <option value="">Select size</option>
            {(selectedProduct?.sizes || []).map((s) => {
              const shopQty = Number(s.shopStockQty) || 0;
              const isZero = shopQty === 0;
              return (
                <option key={s.id} value={s.id} disabled={isZero}>
                  {s.size} — ETB{" "}
                  {Number(s.price || 0).toLocaleString("en-ET", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  — Stock {shopQty}
                  {isZero ? " (OUT OF STOCK)" : shopQty <= 3 ? " ⚠ LOW" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min="1"
            placeholder="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Delivery Type</label>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
          >
            {DELIVERY_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <button type="submit">Record Sale</button>
        </div>
      </form>

      {selectedSize && (
        <div className="alert alert-info" style={{ marginTop: "12px" }}>
          Current shop stock:{" "}
          <strong>{Number(selectedSize.shopStockQty || 0)}</strong>
          {Number(selectedSize.shopStockQty || 0) === 0 && (
            <span style={{ color: "#dc3545", fontWeight: 900 }}>
              {" "}— OUT OF STOCK
            </span>
          )}
          {Number(selectedSize.shopStockQty || 0) > 0 &&
            Number(selectedSize.shopStockQty || 0) <= 3 && (
              <span style={{ color: "#856404", fontWeight: 900 }}>
                {" "}— LOW STOCK WARNING
              </span>
            )}
        </div>
      )}

      {(ok || err) && (
        <div style={{ marginTop: "12px" }}>
          {ok && <div className="alert alert-success">{ok}</div>}
          {err && <div className="alert alert-error">{err}</div>}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 4 — AVAILABLE SHOP STOCK
          ════════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
        Available Stock (Shop)
      </h3>
      {products.length === 0 ? (
        <div className="alert alert-info">
          No products have been set up yet. Ask the Admin to add products.
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>Price (ETB)</th>
                <th>Shop Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.flatMap((p) =>
                (p.sizes || []).map((s) => (
                  <tr key={`${p.id}-${s.id}`}>
                    <td>{p.name}</td>
                    <td>{s.size}</td>
                    <td>
                      {Number(s.price || 0).toLocaleString("en-ET", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            Number(s.shopStockQty || 0) === 0
                              ? "#ef4444"
                              : Number(s.shopStockQty || 0) <= 3
                              ? "#f59e0b"
                              : "inherit",
                        }}
                      >
                        {Number(s.shopStockQty || 0)}
                        {Number(s.shopStockQty || 0) === 0 && " — OUT"}
                        {Number(s.shopStockQty || 0) > 0 &&
                          Number(s.shopStockQty || 0) <= 3 &&
                          " ⚠"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 5 — RECENT SALES
          ════════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
        Recent Sales
      </h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Total (ETB)</th>
              <th>Payment</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    color: "var(--black-lighter)",
                  }}
                >
                  No sales recorded yet.
                </td>
              </tr>
            )}
            {sales
              .slice()
              .reverse()
              .slice(0, 50)
              .map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.productName}</td>
                  <td>{s.size}</td>
                  <td>{s.qty}</td>
                  <td>
                    ETB{" "}
                    {Number(s.total || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>{s.paymentMethod}</td>
                  <td>{s.deliveryType}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
