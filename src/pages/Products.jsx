import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Products() {
  const {
    products,
    transfers,
    addOrUpdateProductSize,
    updateProductSize,
    requestTransfer,
    deleteTransfer,
    deleteTransfersByMonth,
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

  // ─── Transfer history filter & State ────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState("all"); // "all" | "pending" | "confirmed"
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});

  const toggleMonth = (monthStr) =>
    setExpandedMonths((prev) => ({ ...prev, [monthStr]: !prev[monthStr] }));

  // ─── Accordion Expansion State & Logic ──────────────────────────────────────
  const [expandedProductIds, setExpandedProductIds] = useState({});
  const [lastAddedName, setLastAddedName] = useState("");

  React.useEffect(() => {
    if (lastAddedName) {
      const found = products.find(
        (p) => p.name.toLowerCase() === lastAddedName.toLowerCase()
      );
      if (found) {
        setExpandedProductIds((prev) => ({ ...prev, [found.id]: true }));
        setLastAddedName("");
      }
    }
  }, [products, lastAddedName]);

  const toggleExpand = (productId) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

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
    setLastAddedName(name); // Auto-expand on addition
    setMessage("Product saved successfully.");
    clearAddForm();
    setTimeout(() => setMessage(""), 3000);
  };

  const startEdit = (product, sizeRow) => {
    setEditing({ productId: product.id, sizeId: sizeRow.id, product, sizeRow });
    setName(product.name);
    setSize(sizeRow.size);
    setPrice(sizeRow.price);
    setAddMainQty(sizeRow.mainStockQty || 0);
    setAddShopQty(sizeRow.shopStockQty || 0);
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
      mainStockQty: Number(addMainQty),
      shopStockQty: Number(addShopQty),
    });
    setLastAddedName(name); // Keep auto-expanded
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

  const downloadInventory = () => {
    const doc = new jsPDF();
    
    // JEGNIT Header
    doc.setFontSize(22);
    doc.setTextColor(255, 102, 0); // var(--orange)
    doc.setFont("helvetica", "bold");
    doc.text("JEGNIT", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Total Inventory Report", 14, 30);
    
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${dateStr}`, 14, 38);

    const tableColumn = ["Product Name", "Size", "Price (ETB)", "Main Stock", "Shop Stock"];
    const tableRows = [];

    // Format the data
    products.forEach((product) => {
      (product.sizes || []).forEach((s) => {
        const rowData = [
          product.name,
          s.size,
          Number(s.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 }),
          Number(s.mainStockQty || 0).toString(),
          Number(s.shopStockQty || 0).toString(),
        ];
        tableRows.push(rowData);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [255, 102, 0] }, // Orange header
      styles: { fontSize: 10 },
    });

    doc.save(`jegnit_inventory_${new Date().toISOString().slice(0,10)}.pdf`);
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
            <label>Main Stock</label>
            <input
              type="number"
              value={addMainQty}
              onChange={(e) => setAddMainQty(e.target.value)}
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label>Shop Stock</label>
            <input
              type="number"
              value={addShopQty}
              onChange={(e) => setAddShopQty(e.target.value)}
              min="0"
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "32px", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, color: "var(--orange)" }}>Transfer History</h3>
        <button
          type="button"
          className={`btn-small ${showTransferHistory ? "" : "btn-secondary"}`}
          onClick={() => setShowTransferHistory(!showTransferHistory)}
          style={{ fontSize: "12px" }}
        >
          {showTransferHistory ? "▲ Collapse" : "▼ Show Records"}
        </button>
      </div>

      {showTransferHistory && (() => {
        // Group transfers by month
        const byMonth = {};
        [...transfers].sort((a, b) => (b.date > a.date ? 1 : -1)).forEach((t) => {
          const month = t.date.slice(0, 7);
          if (!byMonth[month]) byMonth[month] = [];
          byMonth[month].push(t);
        });
        const months = Object.keys(byMonth).sort((a, b) => (b > a ? 1 : -1));

        return months.length === 0 ? (
          <div className="alert alert-info">No transfer records yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {months.map((month) => {
              const monthTransfers = byMonth[month];
              const isOpen = !!expandedMonths[month];
              const [y, m] = month.split("-");
              const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
              const pendingInMonth = monthTransfers.filter((t) => t.status === "pending").length;
              const confirmedInMonth = monthTransfers.filter((t) => t.status === "confirmed").length;

              return (
                <div
                  key={month}
                  style={{
                    border: "1px solid rgba(255,102,0,0.2)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.5)",
                  }}
                >
                  {/* Month Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      background: isOpen ? "rgba(255,102,0,0.06)" : "transparent",
                      borderBottom: isOpen ? "1px solid rgba(255,102,0,0.15)" : "none",
                    }}
                  >
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => toggleMonth(month)}
                      style={{ fontWeight: 700, fontSize: "14px" }}
                    >
                      {isOpen ? "▲" : "▼"} {label}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: "var(--black-lighter)" }}>
                        {monthTransfers.length} record(s)
                        {pendingInMonth > 0 && <span style={{ color: "#ffb74d", marginLeft: "6px" }}>⏳ {pendingInMonth}</span>}
                        {confirmedInMonth > 0 && <span style={{ color: "#81c784", marginLeft: "6px" }}>✅ {confirmedInMonth}</span>}
                      </span>
                      <button
                        type="button"
                        className="btn-small btn-danger"
                        title={`Delete all transfers for ${label}`}
                        onClick={() => {
                          if (window.confirm(`Delete ALL ${monthTransfers.length} transfer record(s) for ${label}?`)) {
                            deleteTransfersByMonth(month);
                          }
                        }}
                        style={{ padding: "4px 10px", fontSize: "13px" }}
                      >
                        🗑 Delete Month
                      </button>
                    </div>
                  </div>

                  {/* Detailed records */}
                  {isOpen && (
                    <div className="table-wrapper" style={{ margin: 0, borderRadius: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Confirmed At</th>
                            <th style={{ textAlign: "right" }}>Del</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthTransfers.map((t) => (
                            <tr key={t.id}>
                              <td>{t.date}</td>
                              <td>{t.productName}</td>
                              <td>{t.size}</td>
                              <td>{t.qty}</td>
                              <td>
                                {t.status === "pending" ? (
                                  <span style={{ background: "rgba(255,152,0,0.18)", color: "#ffb74d", borderRadius: "999px", padding: "2px 10px", fontWeight: 700, fontSize: "12px" }}>
                                    ⏳ Pending
                                  </span>
                                ) : (
                                  <span style={{ background: "rgba(76,175,80,0.18)", color: "#81c784", borderRadius: "999px", padding: "2px 10px", fontWeight: 700, fontSize: "12px" }}>
                                    ✅ Confirmed
                                  </span>
                                )}
                              </td>
                              <td style={{ fontSize: "12px", color: "var(--black-lighter)" }}>
                                {t.confirmedAt ? new Date(t.confirmedAt).toLocaleString() : "—"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="btn-small btn-danger"
                                  title="Delete this record"
                                  onClick={() => {
                                    if (window.confirm("Delete this transfer record?")) deleteTransfer(t.id);
                                  }}
                                  style={{ padding: "3px 8px", fontSize: "13px" }}
                                >
                                  🗑
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}


      {/* ── Products Table ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "32px", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, color: "var(--orange)" }}>
          Product Inventory
        </h3>
        <button type="button" className="btn-small" onClick={downloadInventory} style={{ background: "var(--orange)", color: "white", padding: "8px 16px" }}>
          Download Inventory (PDF)
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: "40px" }}></th>
              <th>Product Model</th>
              <th>Sizes Count</th>
              <th>Total Main Stock</th>
              <th>Total Shop Stock</th>
              <th style={{ width: "200px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  style={{ textAlign: "center", color: "var(--black-lighter)" }}
                >
                  No products yet. Add your first product above.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const t = totals.get(product.id) || { main: 0, shop: 0 };
              const isExpanded = !!expandedProductIds[product.id];
              const sizes = product.sizes || [];

              return (
                <React.Fragment key={product.id}>
                  {/* Master Clickable Row */}
                  <tr
                    onClick={() => toggleExpand(product.id)}
                    style={{
                      cursor: "pointer",
                      background: isExpanded ? "rgba(255, 102, 0, 0.04)" : "inherit",
                      transition: "background 0.2s ease",
                    }}
                    className="product-master-row"
                  >
                    <td style={{ textAlign: "center", fontSize: "12px", color: "var(--orange)" }}>
                      {isExpanded ? "▼" : "▶"}
                    </td>
                    <td>
                      <div style={{ fontWeight: 900, fontSize: "15px" }}>{product.name}</div>
                    </td>
                    <td>
                      <span className="low-stock-badge" style={{ background: "rgba(255, 102, 0, 0.08)", color: "var(--orange-dark)", borderColor: "rgba(255, 102, 0, 0.2)" }}>
                        {sizes.length} {sizes.length === 1 ? "Size" : "Sizes"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{t.main}</td>
                    <td style={{ fontWeight: 700 }}>{t.shop}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-small btn-danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete the model "${product.name}" and ALL its sizes?`
                            )
                          ) {
                            deleteProduct(product.id);
                          }
                        }}
                      >
                        Delete Model
                      </button>
                    </td>
                  </tr>

                  {/* Detail Expanded Row */}
                  {isExpanded && (
                    <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                      <td colSpan="6" style={{ padding: "16px 24px" }}>
                        <div
                          style={{
                            border: "1px solid rgba(255, 102, 0, 0.15)",
                            borderRadius: "8px",
                            overflow: "hidden",
                            background: "rgba(255, 255, 255, 0.6)",
                            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <table style={{ width: "100%", borderCollapse: "collapse", background: "transparent" }}>
                            <thead>
                              <tr style={{ background: "rgba(255, 102, 0, 0.08)" }}>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "15%" }}>Size</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "25%" }}>Price</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "20%" }}>Main Stock</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "20%" }}>Shop Stock</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "20%", textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sizes.length === 0 ? (
                                <tr>
                                  <td colSpan="5" style={{ textAlign: "center", color: "var(--black-lighter)", padding: "12px" }}>
                                    No sizes added to this model yet.
                                  </td>
                                </tr>
                              ) : (
                                sizes.map((sizeRow) => (
                                  <tr key={sizeRow.id} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>{sizeRow.size}</td>
                                    <td style={{ padding: "8px 12px" }}>
                                      ETB{" "}
                                      {Number(sizeRow.price || 0).toLocaleString("en-ET", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>{Number(sizeRow.mainStockQty || 0)}</td>
                                    <td style={{ padding: "8px 12px" }}>{Number(sizeRow.shopStockQty || 0)}</td>
                                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
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
                                      >
                                        Del Size
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
