import React, { useMemo } from "react";
import GlassCard from "../components/GlassCard.jsx";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement } from "chart.js";
import { useInventory } from "../context/InventoryContext.jsx";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

export default function SalesDashboard() {
  const { sales } = useInventory();

  const monthly = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      const key = String(s.date || "").slice(0, 7);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (Number(s.total) || 0));
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
    return {
      labels: entries.map(([m]) => m),
      values: entries.map(([, v]) => v),
    };
  }, [sales]);

  const data = useMemo(
    () => ({
      labels: monthly.labels,
      datasets: [
        {
          label: "Sales (Amount)",
          data: monthly.values,
          borderColor: "#ff6600",
          backgroundColor: "rgba(255,102,0,0.18)",
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [monthly.labels, monthly.values]
  );

  return (
    <GlassCard title="Sales Dashboard">
      {monthly.labels.length === 0 ? (
        <div className="alert alert-info">No sales yet. Record a sale to see the chart.</div>
      ) : (
        <Line data={data} />
      )}
    </GlassCard>
  );
}
