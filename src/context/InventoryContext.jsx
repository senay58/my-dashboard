import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const STORAGE_KEY = "jegnit-inventory-data-v1";
const REMOTE_TABLE = "inventory_state_v1";

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer"];
const DELIVERY_TYPES = ["Pickup", "Delivery"];

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const InventoryContext = createContext(null);

// FIX: loadInitialState now also returns transfers; called once via useState lazy init
const loadInitialState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { products: [], sales: [], replacements: [], transfers: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      products: parsed.products || [],
      sales: parsed.sales || [],
      replacements: parsed.replacements || [],
      transfers: parsed.transfers || [],
    };
  } catch {
    return { products: [], sales: [], replacements: [], transfers: [] };
  }
};

const fetchRemoteState = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(REMOTE_TABLE)
    .select("products, sales, replacements, transfers")
    .eq("id", 1)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

export function InventoryProvider({ children }) {
  // FIX: call loadInitialState exactly once (previously called 3 separate times)
  const [initState] = useState(() => loadInitialState());

  const [products, setProducts] = useState(initState.products);
  const [sales, setSales] = useState(initState.sales);
  const [replacements, setReplacements] = useState(initState.replacements);
  const [transfers, setTransfers] = useState(initState.transfers);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Persist everything (including transfers) to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ products, sales, replacements, transfers })
      );
    } catch {
      // ignore persistence errors
    }
  }, [products, sales, replacements, transfers]);

  // Load from Supabase on first mount
  useEffect(() => {
    if (!supabase || remoteLoaded) return;
    (async () => {
      const remote = await fetchRemoteState();
      if (remote) {
        setProducts(remote.products || []);
        setSales(remote.sales || []);
        setReplacements(remote.replacements || []);
        setTransfers(remote.transfers || []);
      }
      setRemoteLoaded(true);
    })();
  }, [remoteLoaded]);

  // Sync to Supabase whenever state changes
  useEffect(() => {
    if (!supabase || !remoteLoaded) return;
    const sync = async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const payload = { id: 1, products, sales, replacements, transfers };
        const { error } = await supabase
          .from(REMOTE_TABLE)
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      } catch (err) {
        console.error("Sync error:", err);
        setSyncError(err.message);
      } finally {
        setIsSyncing(false);
      }
    };
    sync();
  }, [products, sales, replacements, transfers, remoteLoaded]);

  // ─── Safe setter helpers ────────────────────────────────────────────────────

  const saveProducts = (updater) => {
    setProducts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return Array.isArray(next) ? next : prev;
    });
  };

  const saveSales = (updater) => {
    setSales((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return Array.isArray(next) ? next : prev;
    });
  };

  const saveReplacements = (updater) => {
    setReplacements((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return Array.isArray(next) ? next : prev;
    });
  };

  const saveTransfers = (updater) => {
    setTransfers((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return Array.isArray(next) ? next : prev;
    });
  };

  const findProductById = (id) => products.find((p) => p.id === id);

  // ─── Product management ─────────────────────────────────────────────────────

  const addOrUpdateProductSize = ({ name, size, price, addMainQty, addShopQty }) => {
    const trimmedName = String(name || "").trim();
    const trimmedSize = String(size || "").trim();
    const mainQty = Number(addMainQty) || 0;
    const shopQty = Number(addShopQty) || 0;

    if (!trimmedName || !trimmedSize) return;

    saveProducts((prev) => {
      const existingIndex = prev.findIndex(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingIndex === -1) {
        return [
          ...prev,
          {
            id: createId(),
            name: trimmedName,
            sizes: [
              {
                id: createId(),
                size: trimmedSize,
                price: Number(price) || 0,
                mainStockQty: mainQty,
                shopStockQty: shopQty,
              },
            ],
          },
        ];
      }

      const next = [...prev];
      const product = { ...next[existingIndex] };
      const sizes = [...(product.sizes || [])];
      const sizeIndex = sizes.findIndex(
        (s) => String(s.size).toLowerCase() === trimmedSize.toLowerCase()
      );

      if (sizeIndex === -1) {
        sizes.push({
          id: createId(),
          size: trimmedSize,
          price: Number(price) || 0,
          mainStockQty: mainQty,
          shopStockQty: shopQty,
        });
      } else {
        const existingSize = sizes[sizeIndex];
        sizes[sizeIndex] = {
          ...existingSize,
          price: Number(price) || 0,
          mainStockQty: (Number(existingSize.mainStockQty) || 0) + mainQty,
          shopStockQty: (Number(existingSize.shopStockQty) || 0) + shopQty,
        };
      }

      product.name = trimmedName;
      product.sizes = sizes;
      next[existingIndex] = product;
      return next;
    });
  };

  const updateProductSize = ({
    productId,
    sizeId,
    name,
    size,
    price,
    mainStockQty,
    shopStockQty,
  }) => {
    const trimmedName = String(name || "").trim();
    const trimmedSize = String(size || "").trim();

    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          name: trimmedName || p.name,
          sizes: (p.sizes || []).map((s) =>
            s.id === sizeId
              ? {
                  ...s,
                  size: trimmedSize,
                  price: Number(price) || 0,
                  mainStockQty: Number(mainStockQty) || 0,
                  shopStockQty: Number(shopStockQty) || 0,
                }
              : s
          ),
        };
      })
    );
  };

  const deleteProductSize = (productId, sizeId) => {
    saveProducts((prev) =>
      prev
        .map((p) => {
          if (p.id !== productId) return p;
          return { ...p, sizes: (p.sizes || []).filter((s) => s.id !== sizeId) };
        })
        .filter((p) => (p.sizes || []).length > 0)
    );
  };

  const deleteProduct = (productId) => {
    saveProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ─── Stock transfer (Admin → pending): validate BEFORE setter ────────────────

  const requestTransfer = ({ productId, sizeId, qty }) => {
    const amount = Number(qty) || 0;
    if (!productId || !sizeId || amount <= 0) {
      throw new Error("Invalid transfer details.");
    }

    // Validate completely BEFORE touching any state
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error("Product not found.");
    const sizeRow = (product.sizes || []).find((s) => s.id === sizeId);
    if (!sizeRow) throw new Error("Size not found.");
    const currentMain = Number(sizeRow.mainStockQty) || 0;
    if (currentMain < amount) {
      throw new Error(`Not enough items in MAIN stock. Available: ${currentMain}`);
    }

    // Deduct from main stock immediately
    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          sizes: (p.sizes || []).map((s) => {
            if (s.id !== sizeId) return s;
            return {
              ...s,
              mainStockQty: (Number(s.mainStockQty) || 0) - amount,
            };
          }),
        };
      })
    );

    // Create pending transfer record
    saveTransfers((prev) => [
      ...prev,
      {
        id: createId(),
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        productId,
        sizeId,
        productName: product.name,
        size: sizeRow.size,
        qty: amount,
        status: "pending",
        confirmedAt: null,
      },
    ]);
  };

  // Sales person confirms they physically received the items
  const confirmTransfer = (transferId) => {
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) throw new Error("Transfer not found.");
    if (transfer.status === "confirmed") throw new Error("Transfer already confirmed.");

    // Add to shop stock
    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== transfer.productId) return p;
        return {
          ...p,
          sizes: (p.sizes || []).map((s) => {
            if (s.id !== transfer.sizeId) return s;
            return {
              ...s,
              shopStockQty: (Number(s.shopStockQty) || 0) + transfer.qty,
            };
          }),
        };
      })
    );

    // Mark transfer as confirmed
    saveTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: "confirmed", confirmedAt: new Date().toISOString() }
          : t
      )
    );
  };

  // ─── Sales: validate BEFORE setter (fixes throw-in-setter bug) ─────────────

  const recordSale = ({ date, productId, sizeId, qty, paymentMethod, deliveryType }) => {
    const amount = Number(qty) || 0;
    if (!productId || !sizeId || amount <= 0) {
      throw new Error("Invalid sale details.");
    }

    // Validate completely BEFORE touching any state
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error("Product not found.");
    const sizeRow = (product.sizes || []).find((s) => s.id === sizeId);
    if (!sizeRow) throw new Error("Size not found.");
    const shopQty = Number(sizeRow.shopStockQty) || 0;
    if (shopQty < amount) {
      throw new Error(`Only ${shopQty} items available in shop stock.`);
    }

    const unitPrice = Number(sizeRow.price) || 0;
    const total = unitPrice * amount;

    // Safe to update state now — no throws inside setters
    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          sizes: (p.sizes || []).map((s) => {
            if (s.id !== sizeId) return s;
            return { ...s, shopStockQty: (Number(s.shopStockQty) || 0) - amount };
          }),
        };
      })
    );

    saveSales((prev) => [
      ...prev,
      {
        id: createId(),
        date,
        productId,
        sizeId,
        productName: product.name,
        size: sizeRow.size,
        qty: amount,
        unitPrice,
        total,
        paymentMethod,
        deliveryType,
      },
    ]);
  };

  // ─── Replacements ───────────────────────────────────────────────────────────

  const recordReplacement = ({ saleId, newProductId, newSizeId, qty }) => {
    const amount = Number(qty) || 0;
    if (!saleId || !newProductId || !newSizeId || amount <= 0) {
      throw new Error("Invalid replacement details.");
    }

    const existingSale = sales.find((s) => s.id === saleId);
    if (!existingSale) throw new Error("Original sale not found.");
    if (amount > (Number(existingSale.qty) || 0)) {
      throw new Error("Replacement quantity cannot exceed original sale quantity.");
    }

    const originalProduct = findProductById(existingSale.productId);
    if (!originalProduct) throw new Error("Original product not found.");
    const originalSize = (originalProduct.sizes || []).find(
      (s) => s.id === existingSale.sizeId
    );
    if (!originalSize) throw new Error("Original size not found.");

    const newProduct = findProductById(newProductId);
    if (!newProduct) throw new Error("New product not found.");
    const newSize = (newProduct.sizes || []).find((s) => s.id === newSizeId);
    if (!newSize) throw new Error("New size not found.");

    const currentNewShopQty = Number(newSize.shopStockQty) || 0;
    if (currentNewShopQty < amount) {
      throw new Error(
        `Not enough shop stock for replacement. Available: ${currentNewShopQty}`
      );
    }

    const oldUnit = Number(originalSize.price) || 0;
    const newUnit = Number(newSize.price) || 0;
    const diff = (newUnit - oldUnit) * amount;

    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== originalProduct.id && p.id !== newProduct.id) return p;
        return {
          ...p,
          sizes: (p.sizes || []).map((s) => {
            if (p.id === originalProduct.id && s.id === originalSize.id) {
              return { ...s, shopStockQty: (Number(s.shopStockQty) || 0) + amount };
            }
            if (p.id === newProduct.id && s.id === newSize.id) {
              return { ...s, shopStockQty: (Number(s.shopStockQty) || 0) - amount };
            }
            return s;
          }),
        };
      })
    );

    saveSales((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== saleId) return s;
        const remainingQty = (Number(s.qty) || 0) - amount;
        const oldUnitPrice = Number(s.unitPrice) || 0;
        return {
          ...s,
          qty: remainingQty,
          total: remainingQty <= 0 ? 0 : remainingQty * oldUnitPrice,
        };
      });
      return [
        ...updated,
        {
          id: createId(),
          date: existingSale.date,
          productId: newProduct.id,
          sizeId: newSize.id,
          productName: newProduct.name,
          size: newSize.size,
          qty: amount,
          unitPrice: newUnit,
          total: newUnit * amount,
          paymentMethod: existingSale.paymentMethod,
          deliveryType: existingSale.deliveryType,
        },
      ];
    });

    saveReplacements((prev) => [
      ...prev,
      {
        id: createId(),
        date: existingSale.date,
        oldProductName: originalProduct.name,
        oldSize: originalSize.size,
        newProductName: newProduct.name,
        newSize: newSize.size,
        qty: amount,
        customerPays: diff > 0 ? diff : 0,
        refundToCustomer: diff < 0 ? -diff : 0,
      },
    ]);
  };

  // ─── Analytics helpers ──────────────────────────────────────────────────────

  const getLowStockItems = useMemo(
    () => () =>
      products.flatMap((p) =>
        (p.sizes || [])
          .filter((s) => (Number(s.shopStockQty) || 0) <= 3)
          .map((s) => ({ product: p, sizeRow: s }))
      ),
    [products]
  );

  const getDailySummary = (allSales, filters) => {
    const map = new Map();
    for (const s of allSales) {
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

  const getMonthlySummary = (allSales, filters) => {
    const map = new Map();
    for (const s of allSales) {
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

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetAllData = () => {
    saveProducts([]);
    saveSales([]);
    saveReplacements([]);
    saveTransfers([]);
  };

  // ─── Context value ──────────────────────────────────────────────────────────

  const value = {
    products,
    sales,
    replacements,
    transfers,
    PAYMENT_METHODS,
    DELIVERY_TYPES,
    addOrUpdateProductSize,
    updateProductSize,
    requestTransfer,
    confirmTransfer,
    deleteProduct,
    deleteProductSize,
    recordSale,
    getLowStockItems,
    getDailySummary,
    getMonthlySummary,
    recordReplacement,
    resetAllData,
    isSyncing,
    syncError,
    supabaseConfigured: !!supabase,
  };

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return ctx;
}
