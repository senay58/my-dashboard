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

  const monthly = useMemo(() => {
    const summary = getMonthlySummary(sales || [], {});
    return summary;
  }, [sales, getMonthlySummary]);

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
                  <strong>
                    ETB{" "}
                    {Number(m.total || 0).toLocaleString("en-ET", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
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
              <strong>
                ETB{" "}
                {Number(selectedStats.total || 0).toLocaleString("en-ET", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              .
            </div>
          )}

          {/* Recent Sales moved here */}
          <h3 style={{ marginTop: "32px", marginBottom: "12px", color: "var(--orange)" }}>
            Recent Sales
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Total (ETB)</th>
                  <th>Payment</th>
                  <th>Ref. Number</th>
                  <th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        textAlign: "center",
                        color: "var(--black-lighter)",
                      }}
                    >
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
                      <td>
                        {s.refNum ? (
                          <span style={{ fontFamily: "monospace", fontSize: "12px", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                            {s.refNum}
                          </span>
                        ) : (
                          <span style={{ color: "var(--black-lighter)", fontStyle: "italic" }}>—</span>
                        )}
                      </td>
                      <td>{s.deliveryType}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </GlassCard>
  );
}
