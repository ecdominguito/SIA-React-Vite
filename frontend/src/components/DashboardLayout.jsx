import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth.js";
import { getCurrentUser, safeArray, saveArray, subscribeKeys } from "../lib/storage.js";

export default function DashboardLayout({
  suiteLabel,
  profileName,
  profileRole,
  navItems,
  activeTab,
  onTabChange,
  children
}) {
  const nav = useNavigate();
  const initial = (profileName || "U").charAt(0).toUpperCase();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const switchTimerRef = useRef(null);
  const user = getCurrentUser();

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const refreshNotifications = () => {
      const current = getCurrentUser();
      const username = String(current?.username || "").trim();
      const all = safeArray("allNotifications");
      const mine = all.filter((n) => String(n?.to || "").trim() === username);
      setNotifications(mine);
    };

    refreshNotifications();
    return subscribeKeys(["allNotifications", "currentUser"], refreshNotifications);
  }, []);

  const handleTabChange = (id) => {
    if (activeTab !== id) {
      setIsSwitching(true);
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      switchTimerRef.current = setTimeout(() => {
        setIsSwitching(false);
      }, 170);
    }
    onTabChange(id);
    setIsNavOpen(false);
    setIsNotifOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n?.readAt).length;
  const visibleNotifications = notifications.slice(0, 8);

  const markAllNotificationsRead = () => {
    const username = String(getCurrentUser()?.username || "").trim();
    if (!username) return;
    const all = safeArray("allNotifications");
    const now = new Date().toISOString();
    const next = all.map((n) => {
      const to = String(n?.to || "").trim();
      if (to !== username) return n;
      return n?.readAt ? n : { ...n, readAt: now };
    });
    saveArray("allNotifications", next);
  };

  return (
    <div className="agent-layout">
      <aside className={`agent-sidebar ${isNavOpen ? "open" : ""}`}>
        <div className="agent-brand">
          <span className="agent-brand-mark">
            <i className="bi bi-buildings"></i>
          </span>
          <div>
            <strong>RealEstate Pro</strong>
            <div className="small muted">{suiteLabel}</div>
          </div>
        </div>

        <nav className="agent-nav">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeTab === item.id ? "active" : ""}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => handleTabChange(item.id)}
            >
              <i className={`bi ${item.icon}`}></i>{item.label}
            </button>
          ))}
        </nav>

        <div className="agent-sidebar-footer">
          <div className="agent-profile">
            <span className="agent-avatar">{initial}</span>
            <div>
              <div className="fw-bold">{profileName}</div>
              <div className="small muted">{profileRole}</div>
            </div>
          </div>
          <button
            className="btn btn-outline-dark btn-sm"
            onClick={() => {
              setIsNavOpen(false);
              logout();
              nav("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <button
        type="button"
        className={`agent-sidebar-backdrop ${isNavOpen ? "show" : ""}`}
        aria-label="Close navigation"
        onClick={() => setIsNavOpen(false)}
      />
      <button
        type="button"
        className={`dashboard-notif-backdrop ${isNotifOpen ? "show" : ""}`}
        aria-label="Close notifications"
        onClick={() => setIsNotifOpen(false)}
      />

      <main className="agent-main">
        <div className="dashboard-top-actions">
          <button
            type="button"
            className="dashboard-notif-btn"
            aria-label="Open notifications"
            onClick={() => {
              setIsNotifOpen((v) => !v);
            }}
          >
            <i className="bi bi-bell"></i>
            {!!unreadCount && <span className="dashboard-notif-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
        </div>

        <div className="dashboard-mobile-topbar">
          <button type="button" className="dashboard-menu-btn" onClick={() => setIsNavOpen(true)}>
            <i className="bi bi-list"></i>
            Menu
          </button>
          <div className="dashboard-mobile-title">
            <strong>RealEstate Pro</strong>
            <span>{suiteLabel}</span>
          </div>
          <span className="dashboard-mobile-avatar">{initial}</span>
        </div>
        <div
          className={`dashboard-content ${isSwitching ? "is-loading" : ""}`}
          aria-busy={isSwitching ? "true" : "false"}
          aria-live="polite"
        >
          {children}
        </div>

        <aside className={`dashboard-notif-panel ${isNotifOpen ? "open" : ""}`} aria-label="Notifications panel">
          <div className="dashboard-notif-head">
            <strong>Notifications</strong>
            <div className="dashboard-notif-actions">
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={markAllNotificationsRead}
                disabled={!unreadCount}
              >
                Mark all
              </button>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => setIsNotifOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div className="dashboard-notif-body">
            {visibleNotifications.map((item) => (
              <article key={item.id} className="dashboard-notif-item">
                <div className="dashboard-notif-icon"><i className="bi bi-bell"></i></div>
                <div className="dashboard-notif-copy">
                  <div className="dashboard-notif-title">{item.title || "Notification"}</div>
                  <div className="dashboard-notif-message">{item.message || "-"}</div>
                  <div className="dashboard-notif-meta">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                  </div>
                </div>
              </article>
            ))}
            {!visibleNotifications.length && (
              <div className="dashboard-notif-empty">
                <i className="bi bi-bell-slash"></i>
                <p>No notifications yet.</p>
              </div>
            )}
          </div>
          <div className="dashboard-notif-foot">
            <button
              type="button"
              className="dashboard-notif-see-all"
              onClick={() => {
                setIsNotifOpen(false);
                nav("/notifications");
              }}
            >
              See all
              <i className="bi bi-arrow-right"></i>
            </button>
            <div className="small muted dashboard-notif-user">
              Signed in as @{user?.username || "-"}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
