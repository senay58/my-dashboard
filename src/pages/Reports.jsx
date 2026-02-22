import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Reports() {
  const { products, sales, getDailySummary, getMonthlySummary } = useInventory();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [productFilter, setProductFilter] = useState("");

  const filters = useMemo(() => ({ fromDate, toDate, productName: productFilter }), [fromDate, toDate, productFilter]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filters.fromDate && s.date < filters.fromDate) return false;
      if (filters.toDate && s.date > filters.toDate) return false;
      if (filters.productName && s.productId !== filters.productName) return false;
      return true;
    });
  }, [sales, filters]);

  const daily = useMemo(() => getDailySummary(sales, filters), [sales, filters, getDailySummary]);
  const monthly = useMemo(() => getMonthlySummary(sales, filters), [sales, filters, getMonthlySummary]);

  const totalAmount = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalQty = filteredSales.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);

  const handlePrint = () => {
    const allSales = sales.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const allTotalQty = allSales.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
    const allTotalAmount = allSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const allDaily = getDailySummary(sales, {}); // unfiltered
    const allMonthly = getMonthlySummary(sales, {}); // unfiltered

    const printWindow = window.open("", "_blank");
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>JEGNIT Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #ff6600; display: flex; align-items: center; gap: 12px; }
            h1 img { height: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #ff6600; color: white; }
            .summary { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>
            <img src="/logo.png" alt="JEGNIT Logo" />
            <span>JEGNIT Inventory Tracking System - Full Sales Report</span>
          </h1>
          <div class="summary">
            <p><strong>Date Range (filters on screen):</strong> ${fromDate || "All"} to ${toDate || "All"}</p>
            <p><strong>Product filter (on screen):</strong> ${
              productFilter ? products.find(p => p.id === productFilter)?.name || "All" : "All"
            }</p>
            <p><strong>Total Quantity (all sales):</strong> ${allTotalQty}</p>
            <p><strong>Total Amount (all sales):</strong> ETB ${allTotalAmount
              .toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <h2>Daily Summary (All Sales)</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Qty</th><th>Amount (ETB)</th></tr>
            </thead>
            <tbody>
              ${allDaily
                .map(
                  (r) =>
                    `<tr><td>${r.date}</td><td>${r.qty}</td><td>${Number(r.total || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <h2>Monthly Summary (All Sales)</h2>
          <table>
            <thead>
              <tr><th>Month</th><th>Qty</th><th>Amount (ETB)</th></tr>
            </thead>
            <tbody>
              ${allMonthly
                .map(
                  (r) =>
                    `<tr><td>${r.month}</td><td>${r.qty}</td><td>${Number(r.total || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <h2>Sales Detail (Every Recorded Sale)</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Size</th><th>Qty</th><th>Total (ETB)</th><th>Payment</th><th>Delivery</th></tr>
            </thead>
            <tbody>
              ${allSales
                .map(
                  (s) =>
                    `<tr><td>${s.date}</td><td>${s.productName}</td><td>${s.size}</td><td>${s.qty}</td><td>${Number(
                      s.total || 0
                    ).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</td><td>${s.paymentMethod}</td><td>${s.deliveryType}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <GlassCard title="Reports (Admin)">
      <div className="alert alert-info">
        Filter by date and product name for on-screen analysis. When you print, the report will always include every
        recorded sale in the system.
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Product Name</label>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pdf-actions">
        <button onClick={handlePrint} className="btn-secondary">
          Print Full Report
        </button>
      </div>

      <div className="grid-3">
        <div className="info-box">
          <div className="info-box-label">Filtered Quantity</div>
          <div className="info-box-value">{totalQty}</div>
        </div>
        <div className="info-box">
          <div className="info-box-label">Filtered Sales Amount</div>
          <div className="info-box-value">
            ETB{" "}
            {Number(totalAmount || 0).toLocaleString("en-ET", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="info-box">
          <div className="info-box-label">Filtered Records</div>
          <div className="info-box-value">{filteredSales.length}</div>
        </div>
      </div>

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Sales per Day</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Qty</th>
              <th>Total Amount (ETB)</th>
            </tr>
          </thead>
          <tbody>
            {daily.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
                  No results for selected filters.
                </td>
              </tr>
            )}
            {daily.map((r) => (
              <tr key={r.date}>
                <td>{r.date}</td>
                <td>{r.qty}</td>
                <td>
                  ETB{" "}
                  {Number(r.total || 0).toLocaleString("en-ET", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Sales per Month</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Qty</th>
              <th>Total Amount (ETB)</th>
            </tr>
          </thead>
          <tbody>
            {monthly.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
                  No results for selected filters.
                </td>
              </tr>
            )}
            {monthly.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{r.qty}</td>
                <td>
                  ETB{" "}
                  {Number(r.total || 0).toLocaleString("en-ET", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Sales Detail</h3>
      <div className="table-wrapper" style={{ maxHeight: "400px" }}>
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
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
                  No results for selected filters.
                </td>
              </tr>
            )}
            {filteredSales.map((s) => (
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
