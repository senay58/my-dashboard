import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { useInventory } from "../context/InventoryContext.jsx";

export default function Reports() {
  const { products, sales, getDailySummary, getMonthlySummary } = useInventory();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => {
    setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const filters = useMemo(() => ({ fromDate, toDate, productName: productFilter }), [fromDate, toDate, productFilter]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (filters.fromDate && s.date < filters.fromDate) return false;
      if (filters.toDate && s.date > filters.toDate) return false;
      if (filters.productName && s.productId !== filters.productName) return false;
      return true;
    });
  }, [sales, filters]);

  /* Group filtered sales by date (sorted newest first) */
  const salesByDate = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return Object.entries(map)
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([date, items]) => ({
        date,
        items,
        totalQty: items.reduce((sum, s) => sum + (Number(s.qty) || 0), 0),
        totalAmount: items.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      }));
  }, [filteredSales]);

  const daily = useMemo(() => getDailySummary(sales, filters), [sales, filters, getDailySummary]);
  const monthly = useMemo(() => getMonthlySummary(sales, filters), [sales, filters, getMonthlySummary]);

  const totalAmount = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalQty = filteredSales.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);

  const fmtETB = (v) =>
    Number(v || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <p><strong>Product filter (on screen):</strong> ${productFilter ? products.find(p => p.id === productFilter)?.name || "All" : "All"
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
              <tr><th>Date</th><th>Product</th><th>Size</th><th>Qty</th><th>Total (ETB)</th><th>Payment</th><th>Ref. Number</th><th>Delivery</th></tr>
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
            })}</td><td>${s.paymentMethod}</td><td>${s.refNum || "—"}</td><td>${s.deliveryType}</td></tr>`
        )
        .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      iframe.contentDocument.write(content);
      iframe.contentDocument.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
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
          <div className="info-box-value">ETB {fmtETB(totalAmount)}</div>
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
                <td>ETB {fmtETB(r.total)}</td>
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
                <td>ETB {fmtETB(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SALES DETAIL — ACCORDION GROUPED BY DATE
          ═══════════════════════════════════════════════════════════════════════ */}
      <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>Sales Detail</h3>
      <div className="table-wrapper" style={{ maxHeight: "500px" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "36px" }}></th>
              <th>Date</th>
              <th>Sales Count</th>
              <th>Total Qty</th>
              <th>Total (ETB)</th>
            </tr>
          </thead>
          <tbody>
            {salesByDate.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--black-lighter)" }}>
                  No results for selected filters.
                </td>
              </tr>
            )}
            {salesByDate.map((group) => {
              const isOpen = !!expandedDates[group.date];
              return (
                <React.Fragment key={group.date}>
                  {/* ── Date Master Row ── */}
                  <tr
                    onClick={() => toggleDate(group.date)}
                    style={{
                      cursor: "pointer",
                      background: isOpen ? "rgba(255, 102, 0, 0.04)" : "inherit",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <td style={{ textAlign: "center", fontSize: "12px", color: "var(--orange)" }}>
                      {isOpen ? "▼" : "▶"}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{group.date}</span>
                    </td>
                    <td>
                      <span
                        className="low-stock-badge"
                        style={{
                          background: "rgba(255, 102, 0, 0.08)",
                          color: "var(--orange-dark)",
                          borderColor: "rgba(255, 102, 0, 0.2)",
                        }}
                      >
                        {group.items.length} {group.items.length === 1 ? "Sale" : "Sales"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{group.totalQty}</td>
                    <td style={{ fontWeight: 600 }}>ETB {fmtETB(group.totalAmount)}</td>
                  </tr>

                  {/* ── Expanded Detail Rows ── */}
                  {isOpen && (
                    <tr style={{ background: "rgba(0, 0, 0, 0.02)" }}>
                      <td colSpan="5" style={{ padding: "12px 20px" }}>
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
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Product</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Size</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Qty</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Total (ETB)</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Payment</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Ref. Number</th>
                                <th style={{ background: "transparent", color: "var(--orange-dark)", padding: "8px 12px", fontSize: "12px" }}>Delivery</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((s) => (
                                <tr key={s.id} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{s.productName}</td>
                                  <td style={{ padding: "8px 12px" }}>{s.size}</td>
                                  <td style={{ padding: "8px 12px" }}>{s.qty}</td>
                                  <td style={{ padding: "8px 12px" }}>ETB {fmtETB(s.total)}</td>
                                  <td style={{ padding: "8px 12px" }}>{s.paymentMethod}</td>
                                  <td style={{ padding: "8px 12px" }}>
                                    {s.refNum ? (
                                      <span style={{ fontFamily: "monospace", fontSize: "12px", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                                        {s.refNum}
                                      </span>
                                    ) : (
                                      <span style={{ color: "var(--black-lighter)", fontStyle: "italic" }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>{s.deliveryType}</td>
                                </tr>
                              ))}
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
