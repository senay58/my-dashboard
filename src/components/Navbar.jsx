import React from "react";
import { useInventory } from "../context/InventoryContext";

export default function Navbar() {
  const { isSyncing, syncError, supabaseConfigured } = useInventory();

  return (
    <nav className="bg-gradient-to-r from-jegnitOrange to-orange-500 p-4 text-white shadow-lg flex justify-between items-center">
      <h1 className="text-2xl font-bold">Jegnit Inventory</h1>
      
      <div className="flex items-center gap-2 text-sm bg-black/20 px-3 py-1 rounded-full">
        {!supabaseConfigured ? (
          <span className="text-orange-200">● Local Only</span>
        ) : syncError ? (
          <span className="text-red-300">● Sync Error</span>
        ) : isSyncing ? (
          <span className="animate-pulse text-blue-200">● Syncing...</span>
        ) : (
          <span className="text-green-300">● Cloud Synced</span>
        )}
      </div>
    </nav>
  );
}
