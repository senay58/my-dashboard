import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Sales() {
  const {
    products,
    sales,
    recordSale,
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
  const [refNum, setRefNum] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // ─── Accordion expansion state ───────────────────────────────────────────────
  const [expandedProductIds, setExpandedProductIds] = useState({});

  const toggleExpand = (productId) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // ─── Shop totals calculation ────────────────────────────────────────────────
  const totals = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      let shop = 0;
      (p.sizes || []).forEach((s) => {
        shop += Number(s.shopStockQty) || 0;
      });
      map.set(p.id, shop);
    });
    return map;
  }, [products]);

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
      if (paymentMethod !== "Cash" && !refNum.trim()) {
        throw new Error("Reference number is required for bank/digital transfers.");
      }
      recordSale({
        date,
        productId,
        sizeId,
        qty: Number(qty),
        paymentMethod,
        deliveryType,
        refNum,
      });
      setOk("Sale recorded. Shop stock updated.");
      setQty("");
      setRefNum("");
      setTimeout(() => setOk(""), 3000);
    } catch (error) {
      setErr(error?.message || "Could not record sale.");
      setTimeout(() => setErr(""), 4000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <GlassCard title="Sales Entry (Shop Stock — Sales Person)">



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

        {paymentMethod !== "Cash" && (
          <div className="form-group">
            <label>Reference Number</label>
            <input
              type="text"
              value={refNum}
              onChange={(e) => setRefNum(e.target.value)}
              placeholder="Enter bank reference number"
              required
            />
          </div>
        )}

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
                <th style={{ width: "40px" }}></th>
                <th>Product Model</th>
                <th>Sizes Count</th>
                <th>Total Shop Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalShopQty = totals.get(product.id) || 0;
                const isExpanded = !!expandedProductIds[product.id];
                const sizes = product.sizes || [];

                return (
                  <React.Fragment key={product.id}>
                    {/* Clickable Master Row */}
                    <tr
                      onClick={() => toggleExpand(product.id)}
                      style={{
                        cursor: "pointer",
                        background: isExpanded ? "rgba(255, 102, 0, 0.04)" : "inherit",
                        transition: "background 0.2s ease",
                      }}
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
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              totalShopQty === 0
                                ? "#ef4444"
                                : totalShopQty <= 3
                                ? "#f59e0b"
                                : "inherit",
                          }}
                        >
                          {totalShopQty}
                          {totalShopQty === 0 && " — OUT"}
                          {totalShopQty > 0 && totalShopQty <= 3 && " ⚠"}
                        </span>
                      </td>
                    </tr>

                    {/* Detail Expanded Row */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                        <td colSpan="4" style={{ padding: "16px 24px" }}>
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
                                  <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "30%" }}>Size</th>
                                  <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "40%" }}>Price (ETB)</th>
                                  <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px", width: "30%" }}>Shop Stock</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sizes.length === 0 ? (
                                  <tr>
                                    <td colSpan="3" style={{ textAlign: "center", color: "var(--black-lighter)", padding: "12px" }}>
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
                                      <td style={{ padding: "8px 12px" }}>
                                        <span
                                          style={{
                                            fontWeight: 700,
                                            color:
                                              Number(sizeRow.shopStockQty || 0) === 0
                                                ? "#ef4444"
                                                : Number(sizeRow.shopStockQty || 0) <= 3
                                                ? "#f59e0b"
                                                : "inherit",
                                          }}
                                        >
                                          {Number(sizeRow.shopStockQty || 0)}
                                          {Number(sizeRow.shopStockQty || 0) === 0 && " — OUT"}
                                          {Number(sizeRow.shopStockQty || 0) > 0 &&
                                            Number(sizeRow.shopStockQty || 0) <= 3 &&
                                            " ⚠"}
                                        </span>
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
      )}

    </GlassCard>
  );
}
