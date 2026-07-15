import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Replacements() {
  const { products, sales, replacements, recordMultiReplacement } = useInventory();

  // ─── Step 1: Original sale ───────────────────────────────────────────────────
  const [saleId, setSaleId] = useState("");
  const [returnQty, setReturnQty] = useState("");

  // ─── Step 2: Exchange list builder ──────────────────────────────────────────
  const [newProductId, setNewProductId] = useState("");
  const [newSizeId, setNewSizeId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [exchangeList, setExchangeList] = useState([]); // [{ id, productId, productName, sizeId, size, qty, unitPrice }]

  // ─── Feedback ───────────────────────────────────────────────────────────────
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // ─── Derived: selected original sale ────────────────────────────────────────
  const selectedSale = useMemo(() => sales.find((s) => s.id === saleId), [sales, saleId]);
  const selectedNewProduct = useMemo(
    () => products.find((p) => p.id === newProductId),
    [products, newProductId]
  );
  const selectedNewSize = useMemo(
    () => (selectedNewProduct?.sizes || []).find((s) => s.id === newSizeId),
    [selectedNewProduct, newSizeId]
  );

  // ─── Money preview ───────────────────────────────────────────────────────────
  const moneyPreview = useMemo(() => {
    if (!selectedSale || !returnQty || exchangeList.length === 0) return null;
    const retAmt = Number(returnQty) || 0;
    if (retAmt <= 0) return null;
    const returnedValue = (Number(selectedSale.unitPrice) || 0) * retAmt;
    const newItemsValue = exchangeList.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const diff = newItemsValue - returnedValue;
    return { returnedValue, newItemsValue, diff, customerPays: diff > 0 ? diff : 0, refund: diff < 0 ? -diff : 0 };
  }, [selectedSale, returnQty, exchangeList]);

  // ─── Add item to exchange list ───────────────────────────────────────────────
  const addToExchange = () => {
    setErr("");
    if (!newProductId || !newSizeId || !newQty) {
      setErr("Please select a product, size and quantity to add.");
      return;
    }
    const amount = Number(newQty);
    if (amount <= 0) { setErr("Quantity must be greater than 0."); return; }
    const prod = products.find((p) => p.id === newProductId);
    const size = (prod?.sizes || []).find((s) => s.id === newSizeId);
    if (!prod || !size) { setErr("Invalid product or size."); return; }

    // Check available stock minus what's already in the exchange list
    const alreadyReserved = exchangeList
      .filter((i) => i.sizeId === newSizeId)
      .reduce((sum, i) => sum + i.qty, 0);
    const available = (Number(size.shopStockQty) || 0) - alreadyReserved;
    if (available < amount) {
      setErr(`Not enough shop stock for ${prod.name} (${size.size}). Available: ${available}`);
      return;
    }

    setExchangeList((prev) => [
      ...prev,
      {
        id: `${newSizeId}-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        sizeId: size.id,
        size: size.size,
        qty: amount,
        unitPrice: Number(size.price) || 0,
      },
    ]);
    setNewProductId("");
    setNewSizeId("");
    setNewQty("");
  };

  const removeFromExchange = (id) => {
    setExchangeList((prev) => prev.filter((i) => i.id !== id));
  };

  // ─── Reset form ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSaleId("");
    setReturnQty("");
    setNewProductId("");
    setNewSizeId("");
    setNewQty("");
    setExchangeList([]);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    if (!saleId || !returnQty || exchangeList.length === 0) {
      setErr("Please complete all steps: select the original sale, set return qty, and add at least one exchange item.");
      return;
    }
    try {
      recordMultiReplacement({
        saleId,
        returnQty: Number(returnQty),
        exchangeItems: exchangeList.map((i) => ({
          productId: i.productId,
          sizeId: i.sizeId,
          qty: i.qty,
        })),
      });
      setOk("✅ Replacement processed successfully! Stock and sales records updated.");
      resetForm();
      setTimeout(() => setOk(""), 5000);
    } catch (error) {
      setErr(error?.message || "Could not process replacement.");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <GlassCard title="Replacements (Exchange)">
      <div className="alert alert-info">
        Allow a customer to return a previously purchased item and receive one or more different
        items in exchange. All shop stock and sales records will be updated automatically. The
        original sale will be marked as <strong>[RETURNED]</strong> in your sales history for a
        complete paper trail.
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 1 — Original Sale
          ═══════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "24px", marginBottom: "10px", color: "var(--orange)" }}>
        Step 1 — Select the Original Sale
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label>Original Sale</label>
          <select
            value={saleId}
            onChange={(e) => {
              setSaleId(e.target.value);
              setReturnQty("");
              setExchangeList([]);
            }}
            required
          >
            <option value="">Select sale…</option>
            {sales
              .filter((s) => s.status !== "returned" && (Number(s.qty) || 0) > 0)
              .slice()
              .reverse()
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} — {s.productName} ({s.size}) x{s.qty} — ETB {fmt(s.total)}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>How many to return?</label>
          <input
            type="number"
            value={returnQty}
            onChange={(e) => setReturnQty(e.target.value)}
            min="1"
            max={selectedSale ? Number(selectedSale.qty) : undefined}
            placeholder="Qty"
            disabled={!selectedSale}
          />
        </div>
      </div>

      {selectedSale && (
        <div className="alert alert-info" style={{ marginTop: "4px" }}>
          <strong>Original:</strong> {selectedSale.productName} ({selectedSale.size}) — Unit price{" "}
          <strong>ETB {fmt(selectedSale.unitPrice)}</strong> — Total qty{" "}
          <strong>{selectedSale.qty}</strong>
          {returnQty && (
            <span>
              {" "}— Returning <strong>{returnQty}</strong> ×{" "}
              <strong>ETB {fmt(selectedSale.unitPrice)}</strong> ={" "}
              <strong>ETB {fmt((Number(selectedSale.unitPrice) || 0) * (Number(returnQty) || 0))}</strong>
            </span>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 2 — Build Exchange List
          ═══════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "28px", marginBottom: "10px", color: "var(--orange)" }}>
        Step 2 — Add Items to Give the Customer
      </h3>

      <div className="form-grid" style={{ alignItems: "flex-end" }}>
        <div className="form-group">
          <label>New Product</label>
          <select
            value={newProductId}
            onChange={(e) => {
              setNewProductId(e.target.value);
              setNewSizeId("");
            }}
            disabled={!selectedSale || !returnQty}
          >
            <option value="">Select product…</option>
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
            value={newSizeId}
            onChange={(e) => setNewSizeId(e.target.value)}
            disabled={!selectedNewProduct}
          >
            <option value="">Select size…</option>
            {(selectedNewProduct?.sizes || []).map((s) => {
              const reserved = exchangeList
                .filter((i) => i.sizeId === s.id)
                .reduce((sum, i) => sum + i.qty, 0);
              const avail = (Number(s.shopStockQty) || 0) - reserved;
              return (
                <option key={s.id} value={s.id} disabled={avail <= 0}>
                  {s.size} — ETB {fmt(s.price)} — Stock {avail}
                  {avail <= 0 ? " (OUT)" : avail <= 3 ? " ⚠ LOW" : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label>Qty</label>
          <input
            type="number"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            min="1"
            placeholder="1"
            disabled={!selectedNewSize}
          />
        </div>

        <div className="form-group">
          <label>&nbsp;</label>
          <button type="button" onClick={addToExchange} disabled={!selectedSale || !returnQty}>
            + Add to Exchange
          </button>
        </div>
      </div>

      {/* Exchange list table */}
      {exchangeList.length > 0 && (
        <div className="table-wrapper" style={{ marginTop: "12px" }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exchangeList.map((item) => (
                <tr key={item.id}>
                  <td>{item.productName}</td>
                  <td>{item.size}</td>
                  <td>{item.qty}</td>
                  <td>ETB {fmt(item.unitPrice)}</td>
                  <td>
                    <strong>ETB {fmt(item.unitPrice * item.qty)}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeFromExchange(item.id)}
                      style={{
                        background: "rgba(220,53,69,0.1)",
                        color: "#dc3545",
                        border: "1px solid rgba(220,53,69,0.3)",
                        borderRadius: "6px",
                        padding: "2px 10px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid rgba(255,102,0,0.3)", fontWeight: 700 }}>
                <td colSpan="4" style={{ textAlign: "right", paddingRight: "12px" }}>
                  Total New Items Value:
                </td>
                <td colSpan="2">
                  ETB {fmt(exchangeList.reduce((s, i) => s + i.unitPrice * i.qty, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 3 — Money Preview & Confirm
          ═══════════════════════════════════════════════════════════════════════ */}
      {moneyPreview && (
        <>
          <h3 style={{ marginTop: "28px", marginBottom: "10px", color: "var(--orange)" }}>
            Step 3 — Review & Confirm
          </h3>

          <div
            className="alert"
            style={{
              background: moneyPreview.diff > 0
                ? "rgba(220,53,69,0.08)"
                : moneyPreview.diff < 0
                ? "rgba(25,135,84,0.08)"
                : "rgba(255,102,0,0.08)",
              border: `1px solid ${moneyPreview.diff > 0 ? "rgba(220,53,69,0.3)" : moneyPreview.diff < 0 ? "rgba(25,135,84,0.3)" : "rgba(255,102,0,0.3)"}`,
              borderRadius: "10px",
              padding: "16px",
              marginTop: "4px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>Customer Returns (value)</div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>ETB {fmt(moneyPreview.returnedValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>Customer Receives (value)</div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>ETB {fmt(moneyPreview.newItemsValue)}</div>
              </div>
              <div>
                {moneyPreview.diff > 0 && (
                  <>
                    <div style={{ fontSize: "12px", color: "#dc3545", marginBottom: "4px", fontWeight: 700 }}>
                      Customer Should Add
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#dc3545" }}>
                      ETB {fmt(moneyPreview.customerPays)}
                    </div>
                  </>
                )}
                {moneyPreview.diff < 0 && (
                  <>
                    <div style={{ fontSize: "12px", color: "#198754", marginBottom: "4px", fontWeight: 700 }}>
                      Refund to Customer
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#198754" }}>
                      ETB {fmt(moneyPreview.refund)}
                    </div>
                  </>
                )}
                {moneyPreview.diff === 0 && (
                  <>
                    <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>Balance</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--orange)" }}>Even ✓</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: "16px" }}>
            <button type="submit" style={{ width: "100%" }}>
              ✅ Process Replacement
            </button>
          </form>
        </>
      )}

      {(ok || err) && (
        <div style={{ marginTop: "12px" }}>
          {ok && <div className="alert alert-success">{ok}</div>}
          {err && <div className="alert alert-error">{err}</div>}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          REPLACEMENT HISTORY
          ═══════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "40px", marginBottom: "12px", color: "var(--orange)" }}>
        Replacement History
      </h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Returned Item</th>
              <th>Qty Returned</th>
              <th>Items Given</th>
              <th>Customer Added (ETB)</th>
              <th>Refunded (ETB)</th>
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
              .map((r) => {
                // Support both new multi-item records (r.newItems) and old single-item records
                const newItemsList = r.newItems
                  ? r.newItems
                  : [{ productName: r.newProductName, size: r.newSize, qty: r.qty, unitPrice: null }];

                return (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      {r.oldProductName} ({r.oldSize})
                    </td>
                    <td>{r.returnQty ?? r.qty}</td>
                    <td>
                      {newItemsList.map((item, idx) => (
                        <div key={idx} style={{ fontSize: "13px", lineHeight: "1.6" }}>
                          <strong>{item.qty}×</strong> {item.productName} ({item.size})
                          {item.unitPrice != null && (
                            <span style={{ opacity: 0.65 }}> @ ETB {fmt(item.unitPrice)}</span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td>ETB {fmt(r.customerPays)}</td>
                    <td>ETB {fmt(r.refundToCustomer)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
