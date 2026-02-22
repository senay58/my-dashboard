import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Login from "./pages/Login.jsx";
import Products from "./pages/Products.jsx";
import Replacements from "./pages/Replacements.jsx";
import Reports from "./pages/Reports.jsx";
import Sales from "./pages/Sales.jsx";
import SalesDashboard from "./pages/SalesDashboard.jsx";

const AUTH_KEY = "jegnit-inventory-auth";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLoginSuccess = (userRole) => {
    setIsLoggedIn(true);
    setRole(userRole);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.isLoggedIn && (parsed?.role === "admin" || parsed?.role === "sales")) {
        setIsLoggedIn(true);
        setRole(parsed.role);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify({ isLoggedIn, role }));
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

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-header">
            <button
              type="button"
              className="logo logo-button"
              onClick={() => setSidebarCollapsed((v) => !v)}
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
          <div className="sidebar-subtitle">
            Inventory Tracking System
          </div>
          <div className="sidebar-role-pill">
            <span className="role-dot" />
            Role: {role === "admin" ? "Admin" : "Sales"}
          </div>
          <nav>
            {role === "admin" && (
              <>
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                  <span className="nav-dot" />
                  <span className="nav-label">Dashboard</span>
                </NavLink>
                <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
                  <span className="nav-dot" />
                  <span className="nav-label">Products & Stock</span>
                </NavLink>
                <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
                  <span className="nav-dot" />
                  <span className="nav-label">Reports</span>
                </NavLink>
                <NavLink to="/replacements" className={({ isActive }) => (isActive ? "active" : "")}>
                  <span className="nav-dot" />
                  <span className="nav-label">Replacements</span>
                </NavLink>
              </>
            )}
            {role === "sales" && (
              <>
                <NavLink to="/sales" className={({ isActive }) => (isActive ? "active" : "")}>
                  <span className="nav-dot" />
                  <span className="nav-label">Sales Entry</span>
                </NavLink>
                <NavLink to="/sales-dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
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

        <main className="main">
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
