import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { supabase } from '../supabaseClient';
import { ACTION_NAMES, PAYMENT_METHODS, DELIVERY_TYPES } from '../inventory/actions.mjs';
import { createInventoryStore } from '../inventory/store.mjs';
import { getDailySummary, getMonthlySummary } from '../inventory/summaries.mjs';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [store] = useState(() => createInventoryStore({ client: supabase, storage: window.localStorage }));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  useEffect(() => {
    void store.sync();
    const retry = () => { void store.sync(); };
    const onStorage = event => {
      if (event.key?.startsWith('jegnit-inventory-outbox-v2:')) retry();
    };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    window.addEventListener('storage', onStorage);
    const interval = window.setInterval(retry, 20000);
    const channel = supabase?.channel('inventory-safe-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_state_v1', filter: 'id=eq.1' }, retry)
      .subscribe();
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      window.removeEventListener('storage', onStorage);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [store]);

  const actions = useMemo(() => Object.fromEntries(ACTION_NAMES.map(action => [action, (...args) => store.submit(action, args)])), [store]);
  const getLowStockItems = useMemo(() => () => state.products.flatMap(product => (product.sizes || [])
    .filter(sizeRow => (Number(sizeRow.shopStockQty) || 0) <= 3)
    .map(sizeRow => ({ product, sizeRow }))), [state.products]);
  const value = { ...state, ...actions, PAYMENT_METHODS, DELIVERY_TYPES, getLowStockItems,
    getDailySummary, getMonthlySummary, retrySync: store.sync, exportDeviceData: store.exportDeviceData };
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
}
