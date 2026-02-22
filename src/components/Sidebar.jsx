import React from "react";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white/10 backdrop-blur-md border-r border-white/20 h-screen p-6 text-white">
      <ul className="space-y-4">
        <li className="hover:text-jegnitOrange cursor-pointer">Dashboard</li>
        <li className="hover:text-jegnitOrange cursor-pointer">Products</li>
        <li className="hover:text-jegnitOrange cursor-pointer">Sales</li>
        <li className="hover:text-jegnitOrange cursor-pointer">Reports</li>
        <li className="hover:text-jegnitOrange cursor-pointer">Replacements</li>
      </ul>
    </aside>
  );
}
