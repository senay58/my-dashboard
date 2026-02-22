import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Products() {
  const { products, addOrUpdateProductSize, updateProductSize, transferStock, deleteProduct, deleteProductSize } =
    useInventory();

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [addMainQty, setAddMainQty] = useState("");
  const [addShopQty, setAddShopQty] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [transferProductId, setTransferProductId] = useState("");
  const [transferSizeId, setTransferSizeId] = useState("");
  const [transferQty, setTransferQty] = useState("");

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
    setMessage("Product saved.");
    setSize("");
    setPrice("");
    setAddMainQty("");
    setAddShopQty("");
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
    setName("");
    setSize("");
    setPrice("");
    setAddMainQty("");
    setAddShopQty("");
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
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    setMessage("");
    try {
      transferStock({
        productId: transferProductId,
        sizeId: transferSizeId,
        qty: Number(transferQty),
      });
      setMessage("Stock transferred successfully.");
      setTransferProductId("");
      setTransferSizeId("");
      setTransferQty("");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const selectedProductForTransfer = products.find((p) => p.id === transferProductId);

  return (
    <GlassCard title="Products & Stock Management (Admin)">
      <div className="alert alert-info">
        Admin can add/edit products, manage main stock and shop stock, and transfer items from main to shop stock.
      </div>

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
            <label>Price</label>
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
            <button type="submit" className="btn-small">Save Changes</button>
          </div>
          <div className="form-group">
            <button type="button" className="btn-small btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group">
            <label>Product Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product 1" required />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. S / M / 1L" required />
          </div>
          <div className="form-group">
            <label>Price</label>
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
        <div className={`alert ${message.includes("Error") ? "alert-error" : "alert-success"}`}>{message}</div>
      )}

      <div className="transfer-section">
        <h4>Transfer Stock: Main → Shop</h4>
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
                  {s.size} (Main: {s.mainStockQty || 0})
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
            <button type="submit" className="btn-small">Transfer</button>
          </div>
        </form>
      </div>

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
                <td colSpan="6" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
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
                      style={{ marginRight: "8px" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={() => deleteProductSize(product.id, sizeRow.id)}
                      style={{ marginRight: "8px" }}
                    >
                      Delete Size
                    </button>
                    <button type="button" className="btn-small btn-danger" onClick={() => deleteProduct(product.id)}>
                      Delete Product
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
