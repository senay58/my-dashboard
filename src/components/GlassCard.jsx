import React from "react";
import "../index.css";

export default function GlassCard({ title, children }) {
  return (
    <div className="glass-card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}
