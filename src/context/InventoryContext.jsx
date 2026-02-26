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

const loadInitialState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        products: [],
        sales: [],
        replacements: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      products: parsed.products || [],
      sales: parsed.sales || [],
      replacements: parsed.replacements || [],
    };
  } catch {
    return {
      products: [],
      sales: [],
      replacements: [],
    };
  }
};

const fetchRemoteState = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(REMOTE_TABLE)
    .select("products, sales, replacements")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return null;
  }
  return data || null;
};

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(() => loadInitialState().products);
  const [sales, setSales] = useState(() => loadInitialState().sales);
  const [replacements, setReplacements] = useState(() => loadInitialState().replacements);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = { products, sales, replacements };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore persistence errors
    }
  }, [products, sales, replacements]);

  useEffect(() => {
    if (!supabase || remoteLoaded) return;
    (async () => {
      const remote = await fetchRemoteState();
      if (remote) {
        setProducts(remote.products || []);
        setSales(remote.sales || []);
        setReplacements(remote.replacements || []);
      }
      setRemoteLoaded(true);
    })();
  }, [remoteLoaded]);

  useEffect(() => {
    if (!supabase) return;
    const sync = async () => {
      const payload = { id: 1, products, sales, replacements };
      // upsert single row with id=1 to act as app-wide snapshot
      await supabase.from(REMOTE_TABLE).upsert(payload, { onConflict: "id" });
    };
    sync();
  }, [products, sales, replacements]);

  const findProductById = (id) => products.find((p) => p.id === id);

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
        const newProduct = {
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
        };
        return [...prev, newProduct];
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

  const updateProductSize = ({ productId, sizeId, name, size, price, mainStockQty, shopStockQty }) => {
    const trimmedName = String(name || "").trim();
    const trimmedSize = String(size || "").trim();

    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const updatedSizes = (p.sizes || []).map((s) =>
          s.id === sizeId
            ? {
                ...s,
                size: trimmedSize,
                price: Number(price) || 0,
                mainStockQty: Number(mainStockQty) || 0,
                shopStockQty: Number(shopStockQty) || 0,
              }
            : s
        );
        return {
          ...p,
          name: trimmedName || p.name,
          sizes: updatedSizes,
        };
      })
    );
  };

  const transferStock = ({ productId, sizeId, qty }) => {
    const amount = Number(qty) || 0;
    if (!productId || !sizeId || amount <= 0) {
      throw new Error("Invalid transfer details.");
    }

    let error = null;

    saveProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId) return p;
        const sizes = (p.sizes || []).map((s) => {
          if (s.id !== sizeId) return s;
          const currentMain = Number(s.mainStockQty) || 0;
          if (currentMain < amount) {
            error = new Error(`Not enough items in MAIN stock. Available: ${currentMain}`);
            return s;
          }
          return {
            ...s,
            mainStockQty: currentMain - amount,
            shopStockQty: (Number(s.shopStockQty) || 0) + amount,
          };
        });
        return { ...p, sizes };
      });
      return next;
    });

    if (error) {
      throw error;
    }
  };

  const deleteProductSize = (productId, sizeId) => {
    saveProducts((prev) =>
      prev
        .map((p) => {
          if (p.id !== productId) return p;
          const remainingSizes = (p.sizes || []).filter((s) => s.id !== sizeId);
          return { ...p, sizes: remainingSizes };
        })
        .filter((p) => (p.sizes || []).length > 0)
    );
  };

  const deleteProduct = (productId) => {
    saveProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const recordSale = ({ date, productId, sizeId, qty, paymentMethod, deliveryType }) => {
    const amount = Number(qty) || 0;
    if (!productId || !sizeId || amount <= 0) {
      throw new Error("Invalid sale details.");
    }

    let selectedProduct = null;
    let selectedSize = null;

    saveProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId) return p;
        selectedProduct = p;
        const sizes = (p.sizes || []).map((s) => {
          if (s.id !== sizeId) return s;
          selectedSize = s;
          const shopQty = Number(s.shopStockQty) || 0;
          if (shopQty < amount) {
            throw new Error(`Only ${shopQty} items available in shop stock.`);
          }
          return {
            ...s,
            shopStockQty: shopQty - amount,
          };
        });
        return { ...p, sizes };
      });
      return next;
    });

    if (!selectedProduct || !selectedSize) {
      throw new Error("Product or size not found.");
    }

    const unitPrice = Number(selectedSize.price) || 0;
    const total = unitPrice * amount;

    const sale = {
      id: createId(),
      date,
      productId,
      sizeId,
      productName: selectedProduct.name,
      size: selectedSize.size,
      qty: amount,
      unitPrice,
      total,
      paymentMethod,
      deliveryType,
    };

    saveSales((prev) => [...prev, sale]);
  };

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

  const recordReplacement = ({ saleId, newProductId, newSizeId, qty }) => {
    const amount = Number(qty) || 0;
    if (!saleId || !newProductId || !newSizeId || amount <= 0) {
      throw new Error("Invalid replacement details.");
    }

    // Validate and gather all required entities first (no state updates, no throws inside setters)
    const existingSale = sales.find((s) => s.id === saleId);
    if (!existingSale) {
      throw new Error("Original sale not found.");
    }
    if (amount > (Number(existingSale.qty) || 0)) {
      throw new Error("Replacement quantity cannot exceed original sale quantity.");
    }

    const originalProduct = findProductById(existingSale.productId);
    if (!originalProduct) {
      throw new Error("Original product not found.");
    }
    const originalSize = (originalProduct.sizes || []).find((s) => s.id === existingSale.sizeId);
    if (!originalSize) {
      throw new Error("Original size not found.");
    }

    const newProduct = findProductById(newProductId);
    if (!newProduct) {
      throw new Error("New product not found.");
    }
    const newSize = (newProduct.sizes || []).find((s) => s.id === newSizeId);
    if (!newSize) {
      throw new Error("New size not found.");
    }

    const currentNewShopQty = Number(newSize.shopStockQty) || 0;
    if (currentNewShopQty < amount) {
      throw new Error(`Not enough shop stock for replacement. Available: ${currentNewShopQty}`);
    }

    const oldUnit = Number(originalSize.price) || 0;
    const newUnit = Number(newSize.price) || 0;
    const diff = (newUnit - oldUnit) * amount;

    // 1) Adjust products stock (no throwing inside updater)
    saveProducts((prev) =>
      prev.map((p) => {
        if (p.id !== originalProduct.id && p.id !== newProduct.id) return p;
        const sizes = (p.sizes || []).map((s) => {
          if (p.id === originalProduct.id && s.id === originalSize.id) {
            return {
              ...s,
              shopStockQty: (Number(s.shopStockQty) || 0) + amount,
            };
          }
          if (p.id === newProduct.id && s.id === newSize.id) {
            return {
              ...s,
              shopStockQty: (Number(s.shopStockQty) || 0) - amount,
            };
          }
          return s;
        });
        return { ...p, sizes };
      })
    );

    // 2) Adjust sales: shrink original sale line, add new sale line
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

      const newSale = {
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
      };

      return [...updated, newSale];
    });

    // 3) Record replacement history (for reports & UI)
    const replacementRecord = {
      id: createId(),
      date: existingSale.date,
      oldProductName: originalProduct.name,
      oldSize: originalSize.size,
      newProductName: newProduct.name,
      newSize: newSize.size,
      qty: amount,
      customerPays: diff > 0 ? diff : 0,
      refundToCustomer: diff < 0 ? -diff : 0,
    };

    saveReplacements((prev) => [...prev, replacementRecord]);
  };

  const value = {
    products,
    sales,
    replacements,
    PAYMENT_METHODS,
    DELIVERY_TYPES,
    addOrUpdateProductSize,
    updateProductSize,
    transferStock,
    deleteProduct,
    deleteProductSize,
    recordSale,
    getLowStockItems,
    getDailySummary,
    getMonthlySummary,
    recordReplacement,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return ctx;
}

