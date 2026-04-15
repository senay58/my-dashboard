import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Login from "./pages/Login.jsx";
import Products from "./pages/Products.jsx";
import Replacements from "./pages/Replacements.jsx";
import Reports from "./pages/Reports.jsx";
import Sales from "./pages/Sales.jsx";
import SalesDashboard from "./pages/SalesDashboard.jsx";
import { useInventory } from "./context/InventoryContext.jsx";

const AUTH_KEY = "jegnit-inventory-auth";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // FIX: call useInventory at top level, not inside JSX IIFEs
  const { isSyncing, syncError, supabaseConfigured } = useInventory();

  // Desktop only: collapse sidebar. On mobile the sidebar is a full drawer.
  const handleSidebarLogoClick = () => {
    if (window.innerWidth > 1024) {
      setSidebarCollapsed((v) => !v);
    } else {
      // On mobile clicking the logo inside the open sidebar closes the drawer
      setSidebarOpen(false);
    }
  };

  const handleLoginSuccess = (userRole) => {
    setIsLoggedIn(true);
    setRole(userRole);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed?.isLoggedIn &&
        (parsed?.role === "admin" || parsed?.role === "sales")
      ) {
        setIsLoggedIn(true);
        setRole(parsed.role);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({ isLoggedIn, role })
      );
    } catch {
      // ignore
    }
  }, [isLoggedIn, role]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole(null);
    try {
      window.localStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
  };

  // Sync status badge — uses hook values directly (no IIFE violation)
  const syncBadge = !supabaseConfigured ? (
    <span style={{ color: "#fdba74" }}>● Local Storage Only</span>
  ) : syncError ? (
    <span style={{ color: "#fca5a5" }}>● Sync Error</span>
  ) : isSyncing ? (
    <span className="animate-pulse" style={{ color: "#bfdbfe" }}>
      ● Syncing Cloud...
    </span>
  ) : (
    <span style={{ color: "#86efac" }}>● Cloud Synced</span>
  );

  const syncBadgeMini = !supabaseConfigured ? (
    <span style={{ color: "#fdba74" }}>● Local</span>
  ) : syncError ? (
    <span style={{ color: "#fca5a5" }}>● Error</span>
  ) : isSyncing ? (
    <span className="animate-pulse" style={{ color: "#bfdbfe" }}>
      ● Syncing
    </span>
  ) : (
    <span style={{ color: "#86efac" }}>● Cloud Synced</span>
  );

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div
        className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-header">
            <button
              type="button"
              className="logo logo-button"
              onClick={handleSidebarLogoClick}
            >
              <img
                src="/logo.png"
                alt="JEGNIT Logo"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="logo-text">JEGNIT</div>
            </button>
          </div>
          <div className="sidebar-subtitle">Inventory Tracking System</div>
          <div className="sidebar-role-pill">
            <span className="role-dot" />
            Role: {role === "admin" ? "Admin" : "Sales"}
          </div>

          {/* Sync status — uses top-level hook values, no violations */}
          <div style={{ padding: "0 20px 10px", fontSize: "0.8rem" }}>
            {syncBadge}
          </div>

          <nav>
            {role === "admin" && (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Dashboard</span>
                </NavLink>
                <NavLink
                  to="/products"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Products &amp; Stock</span>
                </NavLink>
                <NavLink
                  to="/reports"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Reports</span>
                </NavLink>
                <NavLink
                  to="/replacements"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Replacements</span>
                </NavLink>
              </>
            )}
            {role === "sales" && (
              <>
                <NavLink
                  to="/sales"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Sales Entry</span>
                </NavLink>
                <NavLink
                  to="/sales-dashboard"
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-dot" />
                  <span className="nav-label">Sales Dashboard</span>
                </NavLink>
              </>
            )}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: "20px" }}>
            <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="main">
          <div className="mobile-topbar">
            {/* Logo replaces burger — tapping it opens the sidebar drawer */}
            <button
              type="button"
              className="mobile-topbar-logo-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Open navigation menu"
            >
              <img
                src="/logo.png"
                alt="JEGNIT"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <span className="mobile-topbar-logo-text">JEGNIT</span>
            </button>
            <div style={{ marginLeft: "auto", marginRight: "4px", fontSize: "0.7rem" }}>
              {syncBadgeMini}
            </div>
          </div>
          <Routes>
            {role === "admin" && (
              <>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/replacements" element={<Replacements />} />
                <Route path="/sales" element={<Navigate to="/" />} />
                <Route path="/sales-dashboard" element={<Navigate to="/" />} />
              </>
            )}
            {role === "sales" && (
              <>
                <Route path="/sales" element={<Sales />} />
                <Route path="/sales-dashboard" element={<SalesDashboard />} />
                <Route path="/" element={<Navigate to="/sales" />} />
                <Route path="/products" element={<Navigate to="/sales" />} />
                <Route path="/reports" element={<Navigate to="/sales" />} />
                <Route path="/replacements" element={<Navigate to="/sales" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}
