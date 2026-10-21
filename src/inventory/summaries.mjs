export const getDailySummary = (allSales, filters) => {
    const map = new Map();
    for (const s of allSales) {
      if (s.status === "returned") continue; // Option B: exclude returned sales from analytics
      if (filters?.fromDate && s.date < filters.fromDate) continue;
      if (filters?.toDate && s.date > filters.toDate) continue;
      if (filters?.productName && s.productId !== filters.productName) continue;
      const key = s.date;
      const prev = map.get(key) || { date: key, qty: 0, total: 0 };
      prev.qty += Number(s.qty) || 0;
      prev.total += Number(s.total) || 0;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  };

export const getMonthlySummary = (allSales, filters) => {
    const map = new Map();
    for (const s of allSales) {
      if (s.status === "returned") continue; // Option B: exclude returned sales from analytics
      if (filters?.fromDate && s.date < filters.fromDate) continue;
      if (filters?.toDate && s.date > filters.toDate) continue;
      if (filters?.productName && s.productId !== filters.productName) continue;
      const key = String(s.date || "").slice(0, 7);
      if (!key) continue;
      const prev = map.get(key) || { month: key, qty: 0, total: 0 };
      prev.qty += Number(s.qty) || 0;
      prev.total += Number(s.total) || 0;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
  };
