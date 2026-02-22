import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Replacements() {
  const { products, sales, replacements, recordReplacement } = useInventory();

  const [saleId, setSaleId] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newSizeId, setNewSizeId] = useState("");
  const [qty, setQty] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const selectedSale = useMemo(() => sales.find((s) => s.id === saleId), [sales, saleId]);
  const selectedNewProduct = useMemo(() => products.find((p) => p.id === newProductId), [products, newProductId]);
  const selectedNewSize = useMemo(
    () => (selectedNewProduct?.sizes || []).find((s) => s.id === newSizeId),
    [selectedNewProduct, newSizeId]
  );

  const preview = useMemo(() => {
    if (!selectedSale || !selectedNewSize) return null;
    const q = Number(qty) || 0;
    if (q <= 0) return null;
    const oldUnit = Number(selectedSale.unitPrice) || 0;
    const newUnit = Number(selectedNewSize.price) || 0;
    const diff = (newUnit - oldUnit) * q;
    return {
      diff,
      customerPays: diff > 0 ? diff : 0,
      refund: diff < 0 ? -diff : 0,
    };
  }, [selectedSale, selectedNewSize, qty]);

  const onSubmit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    try {
      recordReplacement({
        saleId,
        newProductId,
        newSizeId,
        qty: Number(qty),
      });
      setOk("Replacement processed. Shop stock calibrated and sale price updated.");
      setQty("");
    } catch (error) {
      setErr(error?.message || "Could not process replacement.");
    }
  };

  return (
    <GlassCard title="Replacements (Exchange)">
      <div className="alert alert-info">
        Replace one sold item with another. Shop stock will update automatically and the system will show how much the
        customer should add or how much to refund. The original sale price will be updated to reflect the new product
        price.
      </div>

      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label>Original Sale</label>
          <select value={saleId} onChange={(e) => setSaleId(e.target.value)} required>
            <option value="">Select sale</option>
            {sales
              .slice()
              .reverse()
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} — {s.productName} ({s.size}) x{s.qty} — ETB{" "}
                  {Number(s.total || 0).toLocaleString("en-ET", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>New Product</label>
          <select
            value={newProductId}
            onChange={(e) => {
              setNewProductId(e.target.value);
              setNewSizeId("");
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
          <label>New Size</label>
          <select
            value={newSizeId}
            onChange={(e) => setNewSizeId(e.target.value)}
            disabled={!selectedNewProduct}
            required
          >
            <option value="">Select size</option>
            {(selectedNewProduct?.sizes || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.size} — Price {Number(s.price || 0).toFixed(2)} — Shop stock {Number(s.shopStockQty || 0)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Qty to Replace</label>
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
          <button type="submit">Process Replacement</button>
        </div>
      </form>

      {selectedSale && (
        <div className="alert alert-info" style={{ marginTop: "12px" }}>
          Original: <strong>{selectedSale.productName}</strong> ({selectedSale.size}) — unit price{" "}
          <strong>
            ETB{" "}
            {Number(selectedSale.unitPrice || 0).toLocaleString("en-ET", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>{" "}
          — total{" "}
          <strong>
            ETB{" "}
            {Number(selectedSale.total || 0).toLocaleString("en-ET", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </div>
      )}

      {preview && (
        <div className="alert alert-warning" style={{ marginTop: "12px" }}>
          {preview.diff > 0 && (
            <span>
              Customer should add:{" "}
              <strong>
                ETB{" "}
                {preview.customerPays.toLocaleString("en-ET", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
          )}
          {preview.diff < 0 && (
            <span>
              Organization should refund:{" "}
              <strong>
                ETB{" "}
                {preview.refund.toLocaleString("en-ET", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
          )}
          {preview.diff === 0 && <span>No price difference.</span>}
        </div>
      )}

      {(ok || err) && (
        <div style={{ marginTop: "12px" }}>
          {ok && <div className="alert alert-success">{ok}</div>}
          {err && <div className="alert alert-error">{err}</div>}
        </div>
      )}

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Replacement History</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Qty</th>
              <th>Customer Adds (ETB)</th>
              <th>Refund (ETB)</th>
            </tr>
          </thead>
          <tbody>
            {replacements.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
                  No replacements yet.
                </td>
              </tr>
            )}
            {replacements
              .slice()
              .reverse()
              .map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    {r.oldProductName} ({r.oldSize})
                  </td>
                  <td>
                    {r.newProductName} ({r.newSize})
                  </td>
                  <td>{r.qty}</td>
                  <td>
                    ETB{" "}
                    {Number(r.customerPays || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    ETB{" "}
                    {Number(r.refundToCustomer || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
