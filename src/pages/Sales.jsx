import React, { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Sales() {
  const { products, sales, recordSale, PAYMENT_METHODS, DELIVERY_TYPES, getLowStockItems } = useInventory();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [qty, setQty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [deliveryType, setDeliveryType] = useState(DELIVERY_TYPES[0]);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const selectedSize = useMemo(
    () => (selectedProduct?.sizes || []).find((s) => s.id === sizeId),
    [selectedProduct, sizeId]
  );

  useEffect(() => {
    const lowStock = getLowStockItems();
    setLowStockAlerts(lowStock);
  }, [products, getLowStockItems]);

  const onSubmit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    try {
      if (!selectedSize) {
        throw new Error("Please select a product and size.");
      }
      const shopQty = Number(selectedSize.shopStockQty) || 0;
      if (shopQty === 0) {
        throw new Error("Shop stock is zero. Cannot make sale.");
      }
      if (shopQty < Number(qty)) {
        throw new Error(`Only ${shopQty} items available in shop stock.`);
      }
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
    } catch (error) {
      setErr(error?.message || "Could not record sale.");
    }
  };

  return (
    <GlassCard title="Sales Entry (Shop Stock - Sales Person)">
      <div className="alert alert-info">
        Sales can only choose product/size and quantity. Price is controlled by Admin. Sales are blocked when shop stock
        reaches 0.
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="alert alert-warning">
          <strong>Low Stock Alert:</strong> The following items have 3 or fewer units in shop stock:
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            {lowStockAlerts.map((item, idx) => (
              <li key={idx}>
                {item.product.name} ({item.sizeRow.size}) — {item.sizeRow.shopStockQty} units remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
          <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} disabled={!selectedProduct} required>
            <option value="">Select size</option>
            {(selectedProduct?.sizes || []).map((s) => {
              const shopQty = Number(s.shopStockQty) || 0;
              const isZero = shopQty === 0;
              return (
                <option key={s.id} value={s.id} disabled={isZero}>
                  {s.size} — Price ETB{" "}
                  {Number(s.price || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — Stock{" "}
                  {shopQty}
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
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Delivery Type</label>
          <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
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
          Current shop stock: <strong>{Number(selectedSize.shopStockQty || 0)}</strong>
          {Number(selectedSize.shopStockQty || 0) === 0 && (
            <span style={{ color: "#dc3545", fontWeight: 900 }}> — OUT OF STOCK</span>
          )}
          {Number(selectedSize.shopStockQty || 0) > 0 &&
            Number(selectedSize.shopStockQty || 0) <= 3 && (
              <span style={{ color: "#856404", fontWeight: 900 }}> — LOW STOCK WARNING</span>
            )}
        </div>
      )}

      {(ok || err) && (
        <div style={{ marginTop: "12px" }}>
          {ok && <div className="alert alert-success">{ok}</div>}
          {err && <div className="alert alert-error">{err}</div>}
        </div>
      )}

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Available Stock (Shop)</h3>
      {products.length === 0 ? (
        <div className="alert alert-info">No products have been set up yet. Ask the Admin to add products and sizes.</div>
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
                    <td>{Number(s.shopStockQty || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Recent Sales</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
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
