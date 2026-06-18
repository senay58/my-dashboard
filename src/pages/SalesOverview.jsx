import React, { useMemo, useState } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useInventory } from "../context/InventoryContext.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function SalesOverview() {
  const { sales, getMonthlySummary } = useInventory();

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDate = (date) => {
    setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const fmtETB = (v) =>
    Number(v || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthly = useMemo(() => {
    const summary = getMonthlySummary(sales || [], {});
    return summary;
  }, [sales, getMonthlySummary]);

  /* Group recent sales by date (newest first, capped at 100 individual sales) */
  const salesByDate = useMemo(() => {
    const recent = (sales || []).slice().reverse().slice(0, 100);
    const map = {};
    recent.forEach((s) => {
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
  }, [sales]);

  const data = useMemo(
    () => ({
      labels: monthly.map((m) => m.month),
      datasets: [
        {
          label: "Revenue (ETB)",
          data: monthly.map((m) => m.total),
          backgroundColor: "rgba(255,102,0,0.6)",
          borderColor: "#ff6600",
          borderWidth: 1,
        },
      ],
    }),
    [monthly]
  );

  const handleMonthSelection = (month) => {
    const match = monthly.find((m) => m.month === month);
    setSelectedMonth(month);
    setSelectedStats(match || null);
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y || 0;
            const month = ctx.label;
            const match = monthly.find((m) => m.month === month);
            const qty = match ? match.qty : 0;
            return [
              `Revenue: ETB ${Number(value).toLocaleString("en-ET", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              `Items sold: ${qty}`,
            ];
          },
        },
      },
    },
    onClick: (_, elements) => {
      if (!elements?.length) return;
      const idx = elements[0].index;
      const month = data.labels[idx];
      handleMonthSelection(month);
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <GlassCard title="Sales Overview">
      {monthly.length === 0 ? (
        <div className="alert alert-info">No sales yet. Record a sale to see the chart.</div>
      ) : (
        <>
          <div className="grid-3" style={{ marginBottom: "20px" }}>
            {monthly.map((m) => (
              <button
                key={m.month}
                type="button"
                onClick={() => handleMonthSelection(m.month)}
                className="info-box info-box-secondary"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div className="info-box-label">Month</div>
                <div className="info-box-value" style={{ fontSize: "18px" }}>
                  {m.month}
                </div>
                <div className="info-box-footer">
                  Revenue:{" "}
                  <strong>ETB {fmtETB(m.total)}</strong>
                  <br />
                  Items sold: <strong>{Number(m.qty || 0)}</strong>
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <Bar data={data} options={options} />
          </div>

          {selectedMonth && selectedStats && (
            <div className="alert alert-info" style={{ marginBottom: "24px" }}>
              In <strong>{selectedMonth}</strong>, you sold{" "}
              <strong>{Number(selectedStats.qty || 0)}</strong> items with total revenue of{" "}
              <strong>ETB {fmtETB(selectedStats.total)}</strong>.
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              RECENT SALES — ACCORDION GROUPED BY DATE
              ═══════════════════════════════════════════════════════════════════ */}
          <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
            Recent Sales
          </h3>
          <div className="table-wrapper">
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
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        color: "var(--black-lighter)",
                      }}
                    >
                      No sales recorded yet.
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
        </>
      )}
    </GlassCard>
  );
}
