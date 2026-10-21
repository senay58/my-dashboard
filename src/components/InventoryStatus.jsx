import React from 'react';
import { useInventory } from '../context/InventoryContext.jsx';

export default function InventoryStatus() {
  const { ready, syncError, pendingCount, rejectedCount, rejectedMessage } = useInventory();
  return (
    <div role="status" aria-live="polite" className={`alert ${syncError || rejectedCount ? 'alert-error' : pendingCount ? 'alert-warning' : 'alert-info'}`}>
      <span>{!ready ? 'Waiting for cloud verification. ' : ''}
        {syncError ? `${syncError} ` : ''}
        {pendingCount > 0 ? `${pendingCount} saved entry/entries waiting for cloud confirmation. Do not re-enter them or clear site data. ` : ''}
        {rejectedCount > 0 ? `${rejectedCount} entry/entries need review: ${rejectedMessage}. Keep this device’s site data and contact the administrator. ` : ''}
        {ready && !syncError && !pendingCount && !rejectedCount ? 'Cloud records verified. ' : ''}</span>
    </div>
  );
}
