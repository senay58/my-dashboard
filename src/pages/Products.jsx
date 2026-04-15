import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Products() {
  const {
    products,
    transfers,
    addOrUpdateProductSize,
    updateProductSize,
    requestTransfer,
    deleteProduct,
    deleteProductSize,
  } = useInventory();

  // ─── Add / Edit form state ──────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [addMainQty, setAddMainQty] = useState("");
  const [addShopQty, setAddShopQty] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);

  // ─── Transfer form state ────────────────────────────────────────────────────
  const [transferProductId, setTransferProductId] = useState("");
  const [transferSizeId, setTransferSizeId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");

  // ─── Transfer history filter ────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "pending" | "confirmed"

  // ─── Derived data ───────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const out = [];
    for (const p of products) {
      for (const s of p.sizes || []) {
        out.push({ product: p, sizeRow: s });
      }
    }
    return out;
  }, [products]);

  const totals = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const main = (p.sizes || []).reduce(
        (sum, s) => sum + (Number(s.mainStockQty) || 0),
        0
      );
      const shop = (p.sizes || []).reduce(
        (sum, s) => sum + (Number(s.shopStockQty) || 0),
        0
      );
      map.set(p.id, { main, shop });
    }
    return map;
  }, [products]);

  const selectedProductForTransfer = products.find(
    (p) => p.id === transferProductId
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const clearAddForm = () => {
    // FIX: name was previously not cleared after submit
    setName("");
    setSize("");
    setPrice("");
    setAddMainQty("");
    setAddShopQty("");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setMessage("");
    addOrUpdateProductSize({
      name,
      size,
      price: Number(price),
      addMainQty: Number(addMainQty),
      addShopQty: Number(addShopQty),
    });
    setMessage("Product saved successfully.");
    clearAddForm();
    setTimeout(() => setMessage(""), 3000);
  };

  const startEdit = (product, sizeRow) => {
    setEditing({ productId: product.id, sizeId: sizeRow.id, product, sizeRow });
    setName(product.name);
    setSize(sizeRow.size);
    setPrice(sizeRow.price);
    setAddMainQty("");
    setAddShopQty("");
  };

  const cancelEdit = () => {
    setEditing(null);
    clearAddForm();
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editing) return;
    updateProductSize({
      productId: editing.productId,
      sizeId: editing.sizeId,
      name,
      size,
      price: Number(price),
      mainStockQty: editing.sizeRow.mainStockQty,
      shopStockQty: editing.sizeRow.shopStockQty,
    });
    setMessage("Product updated.");
    cancelEdit();
    setTimeout(() => setMessage(""), 3000);
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    setTransferMessage("");
    setTransferError("");
    try {
      requestTransfer({
        productId: transferProductId,
        sizeId: transferSizeId,
        qty: Number(transferQty),
      });
      setTransferMessage(
        `Transfer request created. ${transferQty} unit(s) deducted from Main stock — awaiting sales confirmation.`
      );
      setTransferProductId("");
      setTransferSizeId("");
      setTransferQty("");
      setTimeout(() => setTransferMessage(""), 5000);
    } catch (error) {
      setTransferError(`Error: ${error.message}`);
      setTimeout(() => setTransferError(""), 4000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <GlassCard title="Products &amp; Stock Management (Admin)">
      <div className="alert alert-info">
        Admin can add/edit products, manage stock levels, and request stock
        transfers from Main to Shop. Sales staff must confirm receipt before
        shop stock is updated.
      </div>

      {/* ── Add / Edit Form ── */}
      {editing ? (
        <form onSubmit={saveEdit} className="form-grid">
          <div className="form-group">
            <label>Product Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input value={size} onChange={(e) => setSize(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Price (ETB)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <button type="submit" className="btn-small">
              Save Changes
            </button>
          </div>
          <div className="form-group">
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group">
            <label>Product Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product 1"
              required
            />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="e.g. S / M / 1L"
              required
            />
          </div>
          <div className="form-group">
            <label>Price (ETB)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label>Add to MAIN Stock</label>
            <input
              type="number"
              value={addMainQty}
              onChange={(e) => setAddMainQty(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Add to SHOP Stock</label>
            <input
              type="number"
              value={addShopQty}
              onChange={(e) => setAddShopQty(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="form-group">
            <button type="submit">Save / Update</button>
          </div>
        </form>
      )}

      {message && (
        <div
          className={`alert ${
            message.includes("Error") ? "alert-error" : "alert-success"
          }`}
        >
          {message}
        </div>
      )}

      {/* ── Transfer Request Section ── */}
      <div className="transfer-section">
        <h4>
          Request Transfer: Main Stock → Shop Stock
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: "10px",
                background: "#ff6600",
                color: "#fff",
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {pendingCount} pending
            </span>
          )}
        </h4>
        <div className="alert alert-info" style={{ fontSize: "13px" }}>
          When you submit, the items are deducted from Main stock and a pending
          transfer is created. The sales person must confirm receipt before the
          Shop stock is updated.
        </div>
        <form onSubmit={handleTransfer} className="form-grid">
          <div className="form-group">
            <label>Product</label>
            <select
              value={transferProductId}
              onChange={(e) => {
                setTransferProductId(e.target.value);
                setTransferSizeId("");
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
              value={transferSizeId}
              onChange={(e) => setTransferSizeId(e.target.value)}
              disabled={!selectedProductForTransfer}
              required
            >
              <option value="">Select size</option>
              {(selectedProductForTransfer?.sizes || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.size} — Main: {Number(s.mainStockQty || 0)} | Shop:{" "}
                  {Number(s.shopStockQty || 0)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantity to Transfer</label>
            <input
              type="number"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              min="1"
              placeholder="1"
              required
            />
          </div>
          <div className="form-group">
            <button type="submit" className="btn-small">
              Create Transfer Request
            </button>
          </div>
        </form>
        {transferMessage && (
          <div className="alert alert-success" style={{ marginTop: "8px" }}>
            {transferMessage}
          </div>
        )}
        {transferError && (
          <div className="alert alert-error" style={{ marginTop: "8px" }}>
            {transferError}
          </div>
        )}
      </div>

      {/* ── Transfer History ── */}
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

      {/* ── Products Table ── */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
        Product Inventory
      </h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Price</th>
              <th>Main Stock</th>
              <th>Shop Stock</th>
              <th style={{ width: "280px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", color: "var(--black-lighter)" }}
                >
                  No products yet. Add your first product above.
                </td>
              </tr>
            )}
            {rows.map(({ product, sizeRow }) => {
              const t = totals.get(product.id) || { main: 0, shop: 0 };
              return (
                <tr key={sizeRow.id}>
                  <td>
                    <div style={{ fontWeight: 900 }}>{product.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--black-lighter)" }}>
                      Totals — Main: {t.main} | Shop: {t.shop}
                    </div>
                  </td>
                  <td>{sizeRow.size}</td>
                  <td>
                    ETB{" "}
                    {Number(sizeRow.price || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>{Number(sizeRow.mainStockQty || 0)}</td>
                  <td>{Number(sizeRow.shopStockQty || 0)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => startEdit(product, sizeRow)}
                      style={{ marginRight: "6px" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => deleteProductSize(product.id, sizeRow.id)}
                      style={{ marginRight: "6px" }}
                    >
                      Del Size
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-danger"
                      onClick={() => deleteProduct(product.id)}
                    >
                      Del All
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
