import { applyInventoryAction } from './actions.mjs';

export const LEGACY_KEY = 'jegnit-inventory-data-v1';
export const CACHE_KEY = 'jegnit-inventory-confirmed-v2';
export const OUTBOX_PREFIX = 'jegnit-inventory-outbox-v2:';
export const LEGACY_BACKUP_KEY = 'jegnit-inventory-before-v2';
const emptyState = () => ({ products: [], sales: [], replacements: [], transfers: [] });

export function inventoryState(row) {
  if (!row || !['products', 'sales', 'replacements', 'transfers'].every(key => Array.isArray(row[key]))) {
    throw new Error('Inventory response is incomplete. Existing local data has been preserved.');
  }
  return { products: row.products, sales: row.sales, replacements: row.replacements, transfers: row.transfers };
}

// No automatic upload or union of old caches: they can contain intentional deletions,
// stale stock and previously recovered duplicates. Preserve them for reviewed recovery.
export function createInventoryStore({ client, storage, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID() }) {
  let confirmed = emptyState();
  let ready = false;
  let error = null;
  let working = null;
  let snapshot;
  const listeners = new Set();
  let cacheError = null;

  try {
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy && !storage.getItem(LEGACY_BACKUP_KEY)) storage.setItem(LEGACY_BACKUP_KEY, legacy);
    const cached = storage.getItem(CACHE_KEY);
    if (cached) confirmed = inventoryState(JSON.parse(cached));
    else if (legacy) confirmed = inventoryState(JSON.parse(legacy));
  } catch (err) {
    cacheError = `Local storage needs attention: ${err.message}. No records have been cleared.`;
  }

  function entries() {
    const commands = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(OUTBOX_PREFIX)) continue;
      const command = JSON.parse(storage.getItem(key));
      if (!command?.id || !command.action || !Array.isArray(command.args)) throw new Error('A saved entry needs recovery. Export device data before continuing.');
      commands.push(command);
    }
    return commands.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  function publish() {
    let pending = [];
    let rejected = [];
    try {
      const all = entries();
      pending = all.filter(command => !command.rejected);
      rejected = all.filter(command => command.rejected);
    } catch (err) { error = err.message; }
    // Display confirmed state. Pending stock/sales never masquerade as cloud records.
    snapshot = { ...confirmed, ready, isSyncing: !!working, syncError: error || cacheError,
      pendingCount: pending.length, rejectedCount: rejected.length,
      rejectedMessage: rejected[0]?.rejected || null,
      supabaseConfigured: !!client };
    for (const listener of listeners) listener();
  }

  function accept(row) {
    const state = inventoryState(row);
    // Persist the server acknowledgement before retiring its durable command.
    storage.setItem(CACHE_KEY, JSON.stringify(state));
    confirmed = state;
    cacheError = null;
  }

  async function rpc(command, state = null, revision = -1) {
    const { data, error: remoteError } = await client.rpc('inventory_commit_v2', {
      p_mutation_id: command?.id || null,
      p_expected_revision: revision,
      p_state: state,
    });
    if (remoteError) throw new Error(remoteError.code === 'PGRST202'
      ? 'The safe-save database update is required. Device records are preserved.'
      : remoteError.message);
    if (!data?.state || !['ready', 'committed', 'duplicate', 'conflict'].includes(data.status)) {
      throw new Error('Cloud save returned no confirmation. The saved entry is retained on this device.');
    }
    inventoryState(data.state);
    return data;
  }

  async function synchronize() {
    if (!client) { error = 'Cloud connection is not configured. Sales cannot be confirmed.'; return; }
    try {
      error = null;
      const initial = await rpc(null);
      accept(initial.state);
      ready = true;
      publish();
      // Each command is rebuilt from the current server state. Revision checks in
      // Postgres make overlapping tabs/devices retry rather than overwrite.
      for (const command of entries().filter(entry => !entry.rejected)) {
        let completed = false;
        for (let attempt = 0; attempt < 6; attempt++) {
          const head = await rpc(command);
          if (head.status === 'duplicate') {
            accept(head.state);
            storage.removeItem(OUTBOX_PREFIX + command.id);
            completed = true;
            break;
          }
          let next;
          try { next = applyInventoryAction(inventoryState(head.state), command); }
          catch (err) {
            // Validation is definite failure, unlike a timeout. Keep evidence and
            // show it for review; never silently retry this rejected sale later.
            storage.setItem(OUTBOX_PREFIX + command.id, JSON.stringify({ ...command, rejected: err.message }));
            accept(head.state);
            completed = true;
            break;
          }
          const result = await rpc(command, next, head.state.revision);
          if (result.status === 'conflict') continue;
          accept(result.state);
          storage.removeItem(OUTBOX_PREFIX + command.id);
          completed = true;
          break;
        }
        if (!completed) throw new Error('Other devices are updating inventory. The entry is saved on this device and will retry.');
      }
    } catch (err) {
      error = err.message;
    }
  }

  function sync() {
    if (working) return working;
    // Schedule after assigning working so snapshot status is correct, including
    // synchronous errors and React StrictMode's effect cleanup/remount.
    working = Promise.resolve().then(synchronize).finally(() => { working = null; publish(); });
    publish();
    return working;
  }

  async function submit(action, args) {
    if (!client || !ready) throw new Error('Wait for the cloud connection before entering records. The form has not been cleared.');
    if (cacheError) throw new Error(cacheError);
    const pending = entries().filter(command => !command.rejected);
    if (pending.length) throw new Error('A saved entry is still waiting for cloud confirmation. Retry sync before entering another record.');
    const command = { id: uuid(), action, args, createdAt: now() };
    if (action === 'updateProductSize') {
      command.expectedSize = args[0].expectedSize || confirmed.products.find(product => product.id === args[0].productId)?.sizes.find(size => size.id === args[0].sizeId);
    }
    // Fail before saving/clearing the form if local validation or durable storage fails.
    applyInventoryAction(confirmed, command);
    storage.setItem(OUTBOX_PREFIX + command.id, JSON.stringify(command));
    publish();
    // If a refresh was already in flight, run another pass after it completes.
    await sync();
    if (storage.getItem(OUTBOX_PREFIX + command.id) && !error) await sync();
    const remaining = storage.getItem(OUTBOX_PREFIX + command.id);
    if (!remaining) return { status: 'confirmed', id: command.id };
    const saved = JSON.parse(remaining);
    if (saved.rejected) return { status: 'rejected', id: command.id, message: saved.rejected };
    return { status: 'pending', id: command.id };
  }

  function exportDeviceData() {
    const data = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if ([LEGACY_KEY, LEGACY_BACKUP_KEY, CACHE_KEY].includes(key) || key?.startsWith(OUTBOX_PREFIX)) data[key] = storage.getItem(key);
    }
    return { exportedAt: now(), confirmed, deviceData: data };
  }

  publish();
  return { getSnapshot: () => snapshot, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }, sync, submit, exportDeviceData };
}

export function receiptMessage(receipt, success) {
  if (receipt.status === 'rejected') return `Not saved to cloud: ${receipt.message} The entry is retained for review.`;
  if (receipt.status === 'pending') return 'Saved on this device; waiting for cloud confirmation. Do not enter it again. Keep this browser’s site data.';
  return success;
}
