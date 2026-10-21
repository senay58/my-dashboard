import React from 'react';
import { useInventory } from '../context/InventoryContext.jsx';

export default function InventoryStatus() {
  const { ready, syncError, isSyncing, pendingCount, rejectedCount, rejectedMessage, retrySync, exportDeviceData } = useInventory();
  const download = () => {
    const blob = new Blob([JSON.stringify(exportDeviceData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jegnit-device-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div role="status" aria-live="polite" className={`alert ${syncError || rejectedCount ? 'alert-error' : pendingCount ? 'alert-warning' : 'alert-info'}`}>
      <span>{!ready ? 'Waiting for cloud verification. ' : ''}
        {syncError ? `${syncError} ` : ''}
        {pendingCount > 0 ? `${pendingCount} saved entry/entries waiting for cloud confirmation. Do not re-enter them or clear site data. ` : ''}
        {rejectedCount > 0 ? `${rejectedCount} entry/entries need review: ${rejectedMessage}. Export device data for investigation. ` : ''}
        {ready && !syncError && !pendingCount && !rejectedCount ? 'Cloud records verified. ' : ''}</span>
      <button type="button" className="btn-small btn-secondary" disabled={isSyncing} onClick={() => void retrySync()}>Retry / refresh</button>{' '}
      <button type="button" className="btn-small btn-secondary" onClick={download}>Export device backup</button>
    </div>
  );
}
