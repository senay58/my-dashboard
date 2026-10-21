import { businessDate, isSaleDate } from './dates.mjs';
export const PAYMENT_METHODS = ['Cash', 'CBE', 'Telebirr', 'BOA', 'Dashen Bank', 'Awash Bank'];
export const DELIVERY_TYPES = ['Pickup', 'Delivery'];
export const ACTION_NAMES = ['addOrUpdateProductSize', 'updateProductSize', 'deleteProductSize', 'deleteProduct', 'requestTransfer', 'confirmTransfer', 'deleteTransfer', 'deleteTransfersByMonth', 'recordSale', 'recordReplacement', 'recordMultiReplacement', 'resetAllData'];

// Pure transaction builder. Re-run against the latest revision after contention.
// IDs and timestamps remain stable across retries and lost responses.
export function applyInventoryAction(state, command) {
  const { products, sales, replacements, transfers } = state;
  let next = { products, sales, replacements, transfers };
  let sequence = 0;
  const createId = () => command.id + ':' + (++sequence);
  const save = (key, updater) => { next = { ...next, [key]: typeof updater === 'function' ? updater(next[key]) : updater }; };
  const saveProducts = updater => save('products', updater);
  const saveSales = updater => save('sales', updater);
  const saveReplacements = updater => save('replacements', updater);
  const saveTransfers = updater => save('transfers', updater);
  const findProductById = (id) => products.find((p) => p.id === id);

  // ─── Product management ─────────────────────────────────────────────────────

  const addOrUpdateProductSize = ({ name, size, price, addMainQty, addShopQty }) => {
    const trimmedName = String(name || "").trim();
    const trimmedSize = String(size || "").trim();
    const mainQty = Number(addMainQty) || 0;
    const shopQty = Number(addShopQty) || 0;

    if (!trimmedName || !trimmedSize) throw new Error("Product name and size are required.");
    if (![mainQty, shopQty].every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isFinite(Number(price)) || Number(price) < 0) throw new Error("Enter nonnegative stock quantities and a valid price.");

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
    if (![mainStockQty, shopStockQty].every(n => Number.isSafeInteger(Number(n)) && Number(n) >= 0) || !Number.isFinite(Number(price)) || Number(price) < 0) throw new Error('Enter nonnegative stock quantities and a valid price.');
    const currentSize = (products.find(p => p.id === productId)?.sizes || []).find(s => s.id === sizeId);
    if (!currentSize) throw new Error('The product or size no longer exists. Refresh before editing.');
    if (command.expectedSize && JSON.stringify(currentSize) !== JSON.stringify(command.expectedSize)) throw new Error('This stock changed on another device. Review the current quantities before saving this edit.');


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
    if (!productId || !sizeId || !Number.isSafeInteger(amount) || amount <= 0) {
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
        date: businessDate(command.createdAt),
        createdAt: command.createdAt,
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
          ? { ...t, status: "confirmed", confirmedAt: command.createdAt }
          : t
      )
    );
  };

  const deleteTransfer = (transferId) => {
    saveTransfers((prev) => prev.filter((t) => t.id !== transferId));
  };

  const deleteTransfersByMonth = (monthStr) => {
    // monthStr format: "YYYY-MM"
    saveTransfers((prev) => prev.filter((t) => !t.date.startsWith(monthStr)));
  };

  // ─── Sales: validate BEFORE setter (fixes throw-in-setter bug) ─────────────

  const recordSale = ({ date, productId, sizeId, qty, paymentMethod, deliveryType, refNum }) => {
    const amount = Number(qty) || 0;
    if (!isSaleDate(date)) throw new Error("Please enter a valid sale date.");
    if (!Number.isSafeInteger(amount)) throw new Error("Quantity must be a whole number.");
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw new Error("Invalid payment method.");
    if (!DELIVERY_TYPES.includes(deliveryType)) throw new Error("Invalid delivery type.");
    if (paymentMethod !== "Cash" && !String(refNum || "").trim()) throw new Error("Reference number is required for bank/digital transfers.");
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
        createdAt: command.createdAt,
        productId,
        sizeId,
        productName: product.name,
        size: sizeRow.size,
        qty: amount,
        unitPrice,
        total,
        paymentMethod,
        deliveryType,
        refNum: paymentMethod !== "Cash" ? refNum : "",
      },
    ]);
  };

  // ─── Replacements ───────────────────────────────────────────────────────────

  const recordReplacement = ({ saleId, newProductId, newSizeId, qty }) =>
    recordMultiReplacement({ saleId, returnQty: qty, exchangeItems: [{ productId: newProductId, sizeId: newSizeId, qty }] });

  // ─── Analytics helpers ──────────────────────────────────────────────────────

  // ─── Multi-Item Replacement (Option B) ─────────────────────────────────────
  // exchangeItems: [{ productId, sizeId, qty }]
  // returnQty: how many of the original sale item to take back
  const recordMultiReplacement = ({ saleId, returnQty, exchangeItems }) => {
    const retAmount = Number(returnQty) || 0;
    if (!saleId || retAmount <= 0 || !Array.isArray(exchangeItems) || exchangeItems.length === 0) {
      throw new Error("Invalid replacement details.");
    }

    // ── Validate original sale ────────────────────────────────────────────────
    const existingSale = sales.find((s) => s.id === saleId);
    if (!existingSale) throw new Error("Original sale not found.");
    if (!Number.isSafeInteger(retAmount)) throw new Error("Return quantity must be a whole number.");
    if (existingSale.status === "returned") throw new Error("This sale has already been returned.");
    if (retAmount > (Number(existingSale.qty) || 0)) {
      throw new Error("Return quantity cannot exceed original sale quantity.");
    }

    const originalProduct = findProductById(existingSale.productId);
    if (!originalProduct) throw new Error("Original product not found.");
    const originalSize = (originalProduct.sizes || []).find((s) => s.id === existingSale.sizeId);
    if (!originalSize) throw new Error("Original size not found.");

    // ── Validate all exchange items BEFORE touching state ─────────────────────
    const resolvedItems = exchangeItems.map((item, idx) => {
      const amount = Number(item.qty) || 0;
      if (!item.productId || !item.sizeId || !Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error(`Exchange item #${idx + 1} is invalid.`);
      }
      const prod = findProductById(item.productId);
      if (!prod) throw new Error(`Exchange item #${idx + 1}: product not found.`);
      const sizeRow = (prod.sizes || []).find((s) => s.id === item.sizeId);
      if (!sizeRow) throw new Error(`Exchange item #${idx + 1}: size not found.`);
      const available = (Number(sizeRow.shopStockQty) || 0) + (prod.id === originalProduct.id && sizeRow.id === originalSize.id ? retAmount : 0);
      if (available < amount) {
        throw new Error(
          `Not enough shop stock for ${prod.name} (${sizeRow.size}). Available: ${available}`
        );
      }
      return { prod, sizeRow, amount };
    });

    // ── Calculate money ────────────────────────────────────────────────────────
    const returnedValue = (Number(existingSale.unitPrice) || 0) * retAmount;
    const newItemsValue = resolvedItems.reduce(
      (sum, { sizeRow, amount }) => sum + (Number(sizeRow.price) || 0) * amount,
      0
    );
    const diff = newItemsValue - returnedValue; // positive = customer pays, negative = refund

    // Aggregate every returned/exchanged size, including repeated sizes and
    // exchanges within the original product. Validate before changing any state.
    const deltas = new Map();
    const adjust = (productId, sizeId, amount) => {
      const key = productId + ':' + sizeId;
      deltas.set(key, (deltas.get(key) || 0) + amount);
    };
    adjust(originalProduct.id, originalSize.id, retAmount);
    for (const { prod, sizeRow, amount } of resolvedItems) adjust(prod.id, sizeRow.id, -amount);
    for (const product of products) {
      for (const size of product.sizes || []) {
        const change = deltas.get(product.id + ':' + size.id) || 0;
        if ((Number(size.shopStockQty) || 0) + change < 0) throw new Error('Not enough shop stock for the combined exchange quantities.');
      }
    }
    saveProducts(previous => previous.map(product => ({ ...product,
      sizes: (product.sizes || []).map(size => ({ ...size,
        shopStockQty: (Number(size.shopStockQty) || 0) + (deltas.get(product.id + ':' + size.id) || 0),
      })),
    })));

    // ── Mark original sale as returned (Option B) ─────────────────────────────
    // New sale records created for each exchange item
    saveSales((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== saleId) return s;
        const remaining = Number(s.qty) - retAmount;
        return remaining === 0
          ? { ...s, status: 'returned', returnedQty: (Number(s.returnedQty) || 0) + retAmount }
          : { ...s, originalQty: s.originalQty ?? s.qty, qty: remaining,
              total: remaining * Number(s.unitPrice), returnedQty: (Number(s.returnedQty) || 0) + retAmount };
      });
      const newSaleRecords = resolvedItems.map(({ prod, sizeRow, amount }) => ({
        id: createId(),
        date: existingSale.date,
        createdAt: command.createdAt,
        sourceSaleId: saleId,
        productId: prod.id,
        sizeId: sizeRow.id,
        productName: prod.name,
        size: sizeRow.size,
        qty: amount,
        unitPrice: Number(sizeRow.price) || 0,
        total: (Number(sizeRow.price) || 0) * amount,
        paymentMethod: existingSale.paymentMethod,
        deliveryType: existingSale.deliveryType,
        refNum: existingSale.refNum || "",
      }));
      return [...updated, ...newSaleRecords];
    });

    // ── Save replacement history ───────────────────────────────────────────────
    saveReplacements((prev) => [
      ...prev,
      {
        id: createId(),
        date: existingSale.date,
        oldProductName: originalProduct.name,
        oldSize: originalSize.size,
        returnQty: retAmount,
        returnedValue,
        newItemsValue,
        customerPays: diff > 0 ? diff : 0,
        refundToCustomer: diff < 0 ? -diff : 0,
        // Array of new items for display in history
        newItems: resolvedItems.map(({ prod, sizeRow, amount }) => ({
          productName: prod.name,
          size: sizeRow.size,
          qty: amount,
          unitPrice: Number(sizeRow.price) || 0,
        })),
        // Legacy fields for backwards compat with old history display
        newProductName: resolvedItems.map((ri) => ri.prod.name).join(", "),
        newSize: resolvedItems.map((ri) => ri.sizeRow.size).join(", "),
        qty: resolvedItems.reduce((s, ri) => s + ri.amount, 0),
      },
    ]);
  };

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetAllData = () => { throw new Error("Bulk reset is disabled while protecting live records. Use a reviewed recovery procedure."); };


  const actions = { addOrUpdateProductSize, updateProductSize, deleteProductSize, deleteProduct, requestTransfer, confirmTransfer, deleteTransfer, deleteTransfersByMonth, recordSale, recordReplacement, recordMultiReplacement, resetAllData };
  if (!Object.hasOwn(actions, command.action)) throw new Error('Unknown inventory operation.');
  actions[command.action](...command.args);
  return next;
}
