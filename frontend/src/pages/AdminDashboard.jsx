import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, safeArray, saveArray, subscribeKeys } from "../lib/storage.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import UIFeedback from "../components/UIFeedback.jsx";
import {
  applyPropertyImageFallback,
  money,
  statusBadgeClass,
  tripStatus,
  withImage
} from "../lib/dashboardUtils.js";
import useUiFeedback from "../lib/useUiFeedback.js";
import {
  cleanEmail,
  cleanPhone,
  cleanText,
  cleanUsername,
  createEntityId,
  isStrongEnoughPassword,
  isValidEmail,
  isValidPhone,
  isValidUsername
} from "../lib/inputUtils.js";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "bi-grid" },
  { id: "users", label: "Users", icon: "bi-people" },
  { id: "properties", label: "Properties", icon: "bi-buildings" },
  { id: "appointments", label: "Appointments", icon: "bi-calendar2-week" },
  { id: "office-meets", label: "Office Meets", icon: "bi-building" },
  { id: "trips", label: "Trips", icon: "bi-car-front" },
  { id: "reviews", label: "Reviews", icon: "bi-star" }
];

function StatCard({ label, value, icon }) {
  return (
    <article className="agent-stat-card">
      <div className="agent-stat-top">
        <span>{label}</span>
        <i className={`bi ${icon}`}></i>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

export default function AdminDashboard() {
  const user = getCurrentUser();

  const [tab, setTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [apps, setApps] = useState([]);
  const [meets, setMeets] = useState([]);
  const [trips, setTrips] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewAgentFilter, setReviewAgentFilter] = useState("all");
  const [reviewQuery, setReviewQuery] = useState("");

  const [agentForm, setAgentForm] = useState({
    username: "",
    password: "",
    fullName: "",
    phone: "",
    email: ""
  });
  const feedback = useUiFeedback();

  useEffect(() => {
    const refreshAll = () => {
      setUsers(safeArray("allUsers"));
      setApps(safeArray("allAppointments"));
      setMeets(safeArray("officeMeets"));
      setTrips(safeArray("allTrips"));
      setProperties(safeArray("allProperties"));
      setReviews(safeArray("allReviews"));
    };

    refreshAll();
    return subscribeKeys(["allUsers", "allAppointments", "officeMeets", "allTrips", "allProperties", "allReviews"], refreshAll);
  }, []);

  const agents = useMemo(() => users.filter((u) => u.role === "agent"), [users]);
  const customers = useMemo(() => users.filter((u) => u.role === "customer"), [users]);
  const pendingApps = useMemo(() => apps.filter((a) => (a.status || "pending") === "pending"), [apps]);
  const pendingMeets = useMemo(() => meets.filter((m) => (m.status || "pending") === "pending"), [meets]);
  const filteredProperties = useMemo(() => {
    const q = propertyQuery.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      [p.title, p.location, p.agent, p.description].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [properties, propertyQuery]);
  const sortedReviews = useMemo(
    () => reviews.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [reviews]
  );
  const filteredReviews = useMemo(() => {
    const q = reviewQuery.trim().toLowerCase();
    return sortedReviews.filter((r) => {
      const isAddressed = Boolean(r.addressedAt);
      const rating = Number(r.rating || 0);
      const passFilter =
        reviewFilter === "all" ||
        (reviewFilter === "pending" && !isAddressed) ||
        (reviewFilter === "addressed" && isAddressed) ||
        (reviewFilter === "low" && rating <= 2) ||
        (reviewFilter === "high" && rating >= 4) ||
        (reviewFilter === "pinned" && Boolean(r.pinnedByAdmin || r.pinnedByAgent));
      if (!passFilter) return false;
      if (reviewAgentFilter !== "all" && String(r.agent || "") !== reviewAgentFilter) return false;
      if (!q) return true;
      return [r.propertyTitle, r.location, r.comment, r.customer, r.agent]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [sortedReviews, reviewFilter, reviewAgentFilter, reviewQuery]);
  const avgReviewRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    return total / reviews.length;
  }, [reviews]);
  const pendingReviewCount = useMemo(() => reviews.filter((r) => !r.addressedAt).length, [reviews]);
  const lowRatingCount = useMemo(() => reviews.filter((r) => Number(r.rating || 0) <= 2).length, [reviews]);
  const reviewAgents = useMemo(
    () => Array.from(new Set(reviews.map((r) => String(r.agent || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [reviews]
  );
  const upcomingAdminTrips = useMemo(
    () =>
      trips.filter((t) => {
        const st = tripStatus(t);
        return st !== "done" && st !== "cancelled";
      }),
    [trips]
  );
  const pastAdminTrips = useMemo(
    () =>
      trips.filter((t) => {
        const st = tripStatus(t);
        return st === "done" || st === "cancelled";
      }),
    [trips]
  );
  const getPropertyImage = (appointment) => {
    const explicit = String(appointment?.propertyImage || "").trim();
    if (explicit) return explicit;
    const matchedProperty = properties.find((p) => String(p.id) === String(appointment?.propertyId));
    return withImage(matchedProperty || { id: appointment?.propertyId, title: appointment?.propertyTitle, location: appointment?.location });
  };
  const handlePropertyImageError = (event, propertyLike) => {
    applyPropertyImageFallback(event.currentTarget, propertyLike || { title: "Property" });
  };

  const usernameExists = (uname) => users.some((u) => cleanUsername(u.username) === cleanUsername(uname));
  const currentTabLabel = navItems.find((item) => item.id === tab)?.label || "Dashboard";

  const saveUsers = (next) => {
    saveArray("allUsers", next);
    setUsers(next);
  };
  const saveApps = (next) => {
    saveArray("allAppointments", next);
    setApps(next);
  };
  const saveMeets = (next) => {
    saveArray("officeMeets", next);
    setMeets(next);
  };
  const saveTrips = (next) => {
    saveArray("allTrips", next);
    setTrips(next);
  };
  const saveProps = (next) => {
    saveArray("allProperties", next);
    setProperties(next);
  };
  const saveReviews = (next) => {
    saveArray("allReviews", next);
    setReviews(next);
  };

  return (
    <DashboardLayout
      suiteLabel="Admin Suite"
      profileName={user?.fullName || "Admin"}
      profileRole="Administrator"
      navItems={navItems}
      activeTab={tab}
      onTabChange={setTab}
    >
        <section className="agent-hero">
          <div>
            <h1>{currentTabLabel}</h1>
            <p>Admin Dashboard</p>
          </div>
        </section>

        {tab === "dashboard" && (
          <>
            <section className="agent-stats-grid">
              <StatCard label="Users" value={users.length} icon="bi-people" />
              <StatCard label="Pending Appointments" value={pendingApps.length} icon="bi-calendar2-week" />
              <StatCard label="Pending Office Meets" value={pendingMeets.length} icon="bi-building" />
              <StatCard label="Reviews" value={reviews.length} icon="bi-star" />
            </section>

            <section className="agent-split-grid">
              <article className="agent-panel">
                <div className="agent-panel-head">
                  <h3>Latest Appointments</h3>
                  <span className="badge badge-soft">{apps.length}</span>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead><tr><th>Property</th><th>Customer</th><th>Agent</th><th>Date/Time</th><th>Status</th></tr></thead>
                    <tbody>
                      {apps.slice().reverse().slice(0, 8).map((a) => (
                        <tr key={a.id}>
                          <td>{a.propertyTitle}</td>
                          <td>@{a.customer}</td>
                          <td>@{a.agent}</td>
                          <td>{a.date} {a.time}</td>
                          <td><span className={statusBadgeClass(a.status)}>{a.status || "pending"}</span></td>
                        </tr>
                      ))}
                      {!apps.length && <tr><td colSpan="5" className="text-muted">No appointments yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="agent-panel">
                <div className="agent-panel-head">
                  <h3>Office Meet Requests</h3>
                  <span className="badge badge-soft">{meets.length}</span>
                </div>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead><tr><th>Requester</th><th>Date/Time</th><th>Mode</th><th>Status</th></tr></thead>
                    <tbody>
                      {meets.slice().reverse().slice(0, 8).map((m) => (
                        <tr key={m.id}>
                          <td>
                            <div className="fw-bold">{m.fullName || m.customer || m.requestedBy || "-"}</div>
                            <div className="small muted">@{m.customer || m.requestedBy || "-"}</div>
                          </td>
                          <td>{m.date} {m.time}</td>
                          <td>{m.mode === "virtual" ? "Virtual" : "In Office"}</td>
                          <td><span className={statusBadgeClass(m.status)}>{m.status || "pending"}</span></td>
                        </tr>
                      ))}
                      {!meets.length && <tr><td colSpan="4" className="text-muted">No office meet requests yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        )}

        {tab === "users" && (
          <section className="agent-split-grid">
            <article className="agent-panel">
              <div className="agent-panel-head"><h3>Create Agent Account</h3></div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const uname = cleanUsername(agentForm.username);
                  const pwd = String(agentForm.password || "").trim();
                  const fullName = cleanText(agentForm.fullName, 80) || uname;
                  const phone = cleanPhone(agentForm.phone);
                  const email = cleanEmail(agentForm.email);

                  if (!uname || !pwd || !fullName || !phone || !email) {
                    feedback.notify("All fields are required.", "error");
                    return;
                  }
                  if (!isValidUsername(uname)) {
                    feedback.notify("Invalid username. Use 3-32 letters, numbers, ., _, -.", "error");
                    return;
                  }
                  if (!isStrongEnoughPassword(pwd, 6)) {
                    feedback.notify("Password must be at least 6 characters.", "error");
                    return;
                  }
                  if (!isValidPhone(phone)) {
                    feedback.notify("Invalid phone format.", "error");
                    return;
                  }
                  if (!isValidEmail(email)) {
                    feedback.notify("Invalid email format.", "error");
                    return;
                  }
                  if (usernameExists(uname)) {
                    feedback.notify("Username already exists.", "error");
                    return;
                  }

                  saveUsers([
                    ...users,
                    {
                      id: createEntityId("USR"),
                      username: uname,
                      password: pwd,
                      role: "agent",
                      fullName,
                      phone,
                      email,
                      photoUrl: ""
                    }
                  ]);
                  setAgentForm({ username: "", password: "", fullName: "", phone: "", email: "" });
                  feedback.notify("Agent account created successfully.", "success");
                }}
              >
                <div className="row g-2">
                  <div className="col-12"><input className="form-control" placeholder="Username" value={agentForm.username} onChange={(e) => setAgentForm((s) => ({ ...s, username: e.target.value }))} /></div>
                  <div className="col-12"><input className="form-control" placeholder="Password" value={agentForm.password} onChange={(e) => setAgentForm((s) => ({ ...s, password: e.target.value }))} /></div>
                  <div className="col-12"><input className="form-control" placeholder="Full Name" value={agentForm.fullName} onChange={(e) => setAgentForm((s) => ({ ...s, fullName: e.target.value }))} /></div>
                  <div className="col-md-6"><input className="form-control" placeholder="Phone" value={agentForm.phone} onChange={(e) => setAgentForm((s) => ({ ...s, phone: e.target.value }))} /></div>
                  <div className="col-md-6"><input className="form-control" placeholder="Email" value={agentForm.email} onChange={(e) => setAgentForm((s) => ({ ...s, email: e.target.value }))} /></div>
                </div>
                <button className="btn btn-dark w-100 mt-3">Create Agent</button>
              </form>
            </article>

            <article className="agent-panel">
              <div className="agent-panel-head"><h3>All Users</h3><span className="badge badge-soft">{users.length}</span></div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead><tr><th>Username</th><th>Role</th><th>Full Name</th><th>Phone</th><th>Email</th><th></th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>@{u.username}</td>
                        <td><span className="badge badge-soft">{u.role}</span></td>
                        <td>{u.fullName}</td>
                        <td>{u.phone}</td>
                        <td>{u.email}</td>
                        <td className="text-end">
                          {u.role !== "admin" ? (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                feedback.askConfirm({
                                  title: "Delete User",
                                  message: `Delete user @${u.username} and related records?`,
                                  confirmText: "Delete",
                                  variant: "danger",
                                  onConfirm: () => {
                                    saveUsers(users.filter((x) => x.id !== u.id));
                                    saveProps(properties.filter((p) => p.agent !== u.username));
                                    saveApps(apps.filter((a) => a.agent !== u.username && a.customer !== u.username));
                                    saveMeets(meets.filter((m) => m.agent !== u.username && m.customer !== u.username && m.requestedBy !== u.username && m.assignedAgent !== u.username));
                                    saveTrips(trips.filter((t) => t.agent !== u.username));
                                    saveReviews(reviews.filter((r) => r.agent !== u.username && r.customer !== u.username));
                                    feedback.notify(`User @${u.username} deleted.`, "success");
                                  }
                                });
                              }}
                            >
                              Delete
                            </button>
                          ) : (
                            <span className="small muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!users.length && <tr><td colSpan="6" className="text-muted">No users found.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="small muted mt-2">Platform counts: {agents.length} agents | {customers.length} customers</div>
            </article>
          </section>
        )}

        {tab === "properties" && (
          <section className="agent-panel">
            <div className="agent-panel-head"><h3>All Properties</h3><span className="badge badge-soft">{properties.length}</span></div>
            <section className="agent-search-wrap">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input
                  className="form-control"
                  placeholder="Search properties by title, location, agent..."
                  value={propertyQuery}
                  onChange={(e) => setPropertyQuery(e.target.value)}
                />
              </div>
            </section>
            <div className="agent-property-grid full">
              {filteredProperties.slice().reverse().map((p) => {
                const rawStatus = String(p.status || "available").toLowerCase();
                const isAvailable = rawStatus === "available";
                const statusKey = isAvailable ? "available" : "unavailable";
                return (
                <article key={p.id} className="agent-property-card">
                  <img
                    src={withImage(p)}
                    alt={p.title || "Property"}
                    onError={(e) => handlePropertyImageError(e, p)}
                  />
                  <div className="agent-property-body">
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <h4>{p.title}</h4>
                      <span className={`badge badge-soft status-${statusKey}`}>
                        {isAvailable ? "available" : "not available"}
                      </span>
                    </div>
                    <p><i className="bi bi-geo-alt"></i> {p.location}</p>
                    <strong>PHP {money(p.price)}</strong>
                    <div className="agent-property-meta">
                      <span><i className="bi bi-person-badge"></i> @{p.agent}</span>
                      <span><i className="bi bi-door-open"></i> {Number(p.bedrooms || 0)} bed</span>
                      <span><i className="bi bi-droplet"></i> {Number(p.bathrooms || 0)} bath</span>
                      <span><i className="bi bi-aspect-ratio"></i> {Number(p.areaSqft || 0)} sqft</span>
                    </div>
                    <div className="agent-property-actions">
                      <Link className="btn btn-outline-dark btn-sm w-100" to={`/properties/${p.id}`}>
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
                );
              })}
              {!filteredProperties.length && (
                <div className="agent-empty large">
                  <i className="bi bi-buildings"></i>
                  <p>No matching properties found.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "appointments" && (
          <section className="agent-panel">
            <div className="agent-panel-head"><h3>All Appointments</h3><span className="badge badge-soft">{apps.length}</span></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Property</th><th>Customer</th><th>Agent</th><th>Date/Time</th><th>Status</th></tr></thead>
                <tbody>
                  {apps.slice().reverse().map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="appointment-property-cell">
                          <img
                            className="appointment-property-thumb"
                            src={getPropertyImage(a)}
                            alt={a.propertyTitle || "Property"}
                            onError={(e) => handlePropertyImageError(e, { id: a.propertyId, title: a.propertyTitle, location: a.location })}
                          />
                          <div>
                            <div className="fw-bold">{a.propertyTitle}</div>
                            <div className="small muted">{a.location}</div>
                          </div>
                        </div>
                      </td>
                      <td>@{a.customer}</td>
                      <td>@{a.agent}</td>
                      <td>{a.date} {a.time}</td>
                      <td><span className={statusBadgeClass(a.status)}>{a.status || "pending"}</span></td>
                    </tr>
                  ))}
                  {!apps.length && <tr><td colSpan="5" className="text-muted">No appointments yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "reviews" && (
          <>
            <section className="agent-stats-grid reviews-stats-grid">
              <article className="agent-stat-card">
                <div className="agent-stat-top"><span>Total Reviews</span><i className="bi bi-chat-left-text"></i></div>
                <strong>{reviews.length}</strong>
              </article>
              <article className="agent-stat-card">
                <div className="agent-stat-top"><span>Average Rating</span><i className="bi bi-star-fill"></i></div>
                <strong>{reviews.length ? `${avgReviewRating.toFixed(1)}/5` : "-"}</strong>
              </article>
              <article className="agent-stat-card">
                <div className="agent-stat-top"><span>Needs Action</span><i className="bi bi-exclamation-circle"></i></div>
                <strong>{pendingReviewCount}</strong>
              </article>
              <article className="agent-stat-card">
                <div className="agent-stat-top"><span>Low Ratings</span><i className="bi bi-emoji-frown"></i></div>
                <strong>{lowRatingCount}</strong>
              </article>
            </section>

            <section className="agent-panel">
              <div className="reviews-toolbar split">
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                  <input
                    className="form-control"
                    placeholder="Search by property, comment, customer, agent..."
                    value={reviewQuery}
                    onChange={(e) => setReviewQuery(e.target.value)}
                  />
                </div>
                <div className="reviews-toolbar-right">
                  <select className="form-select reviews-filter-select" value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
                    <option value="all">All Reviews</option>
                    <option value="pending">Needs Action</option>
                    <option value="addressed">Addressed</option>
                    <option value="low">Low Rating (1-2)</option>
                    <option value="high">High Rating (4-5)</option>
                    <option value="pinned">Pinned Insights</option>
                  </select>
                  <select className="form-select reviews-filter-select" value={reviewAgentFilter} onChange={(e) => setReviewAgentFilter(e.target.value)}>
                    <option value="all">All Agents</option>
                    {reviewAgents.map((agent) => (
                      <option key={agent} value={agent}>@{agent}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="reviews-modern-grid">
                {filteredReviews.map((reviewData) => {
                  const addressed = Boolean(reviewData.addressedAt);
                  return (
                    <article key={reviewData.id} className={`review-modern-card ${addressed ? "review-addressed" : "review-pending"}`}>
                      <div className="review-modern-media">
                        <img
                          className="review-modern-thumb"
                          src={getPropertyImage(reviewData)}
                          alt={reviewData.propertyTitle || "Property"}
                          onError={(e) => handlePropertyImageError(e, { id: reviewData.propertyId, title: reviewData.propertyTitle, location: reviewData.location })}
                        />
                      </div>
                      <div className="review-modern-body">
                        <div className="review-modern-top">
                          <div>
                            <div className="fw-bold">{reviewData.propertyTitle || "Property"}</div>
                            <div className="small muted">{reviewData.location || "-"} | Agent: @{reviewData.agent || "-"}</div>
                          </div>
                          <div className="small muted">{reviewData.createdAt ? new Date(reviewData.createdAt).toLocaleString() : "-"}</div>
                        </div>
                        <div className="review-stars">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <i
                              key={n}
                              className={`bi ${n <= Number(reviewData?.rating || 0) ? "bi-star-fill" : "bi-star"} me-1`}
                              aria-hidden="true"
                            ></i>
                          ))}
                        </div>
                        <div className="small review-comment">{reviewData?.comment || "-"}</div>
                        <div className="review-modern-actions">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={`badge badge-soft ${addressed ? "status-done" : "status-pending"}`}>{addressed ? "addressed" : "needs action"}</span>
                            <span className="small muted">Customer: @{reviewData.customer || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!filteredReviews.length && (
                  <div className="agent-empty">
                    <i className="bi bi-star"></i>
                    <p>No reviews found for the current filters.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "office-meets" && (
          <section className="agent-panel">
            <div className="agent-panel-head"><h3>All Office Meet Requests</h3><span className="badge badge-soft">{meets.length}</span></div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Requester</th><th>Date/Time</th><th>Mode</th><th>Status</th></tr></thead>
                <tbody>
                  {meets.slice().reverse().map((m) => {
                    const st = m.status || "pending";
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="fw-bold">{m.fullName || m.customer || m.requestedBy || "-"}</div>
                          <div className="small muted">{m.email || "-"}</div>
                          <div className="small muted">@{m.customer || m.requestedBy || "-"}</div>
                        </td>
                        <td>{m.date} {m.time}</td>
                        <td>{m.mode === "virtual" ? "Virtual" : "In Office"}</td>
                        <td><span className={statusBadgeClass(st)}>{st}</span></td>
                      </tr>
                    );
                  })}
                  {!meets.length && <tr><td colSpan="4" className="text-muted">No office meet requests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "trips" && (
          <section className="agent-panel">
            <div className="trip-page-head">
              <div>
                <h3>All Trips</h3>
                <p>Monitor all scheduled property tours.</p>
              </div>
              <span className="badge badge-soft">{trips.length}</span>
            </div>

            <div className="trip-section-title">Upcoming Tours</div>
            <div className="trip-list-stack">
              {upcomingAdminTrips.slice().reverse().map((t) => {
                const status = tripStatus(t);
                const statusLabel =
                  status === "done" ? "Completed" :
                    status === "in-progress" ? "In Progress" :
                      status === "cancelled" ? "Cancelled" : "Scheduled";
                const selected = (Array.isArray(t.propertyIds) ? t.propertyIds : [])
                  .map((pid) => properties.find((p) => String(p.id) === String(pid)))
                  .filter(Boolean);
                return (
                  <article className="trip-item-card" key={t.id}>
                    <div className="trip-item-main">
                      <div className="trip-item-top">
                        <div className="trip-item-title-row">
                          <i className="bi bi-car-front"></i>
                          <strong>{t.title || "Property Tour"}</strong>
                          <span className={`trip-status-chip ${status}`}>{statusLabel}</span>
                        </div>
                        <div className="trip-item-meta">
                          <span><i className="bi bi-person"></i> Agent: @{t.agent || "-"}</span>
                          <span><i className="bi bi-person"></i> Customer: {t.customer ? `@${t.customer}` : "-"}</span>
                          <span><i className="bi bi-calendar3"></i> {t.date || "-"} {t.time || ""}</span>
                        </div>
                      </div>

                      <div className="trip-item-label">PROPERTIES:</div>
                      <div className="trip-chip-row">
                        {selected.length ? selected.map((p) => (
                          <span key={p.id} className="trip-property-chip"><span>{p.title}</span></span>
                        )) : <span className="small muted">No properties selected.</span>}
                      </div>

                      {t.notes ? <div className="trip-notes-box">{t.notes}</div> : null}
                    </div>
                  </article>
                );
              })}
              {!upcomingAdminTrips.length && <div className="agent-empty"><i className="bi bi-car-front"></i><p>No upcoming tours.</p></div>}
            </div>

            <div className="trip-section-title mt-3">Past Tours</div>
            <div className="trip-list-stack">
              {pastAdminTrips.slice().reverse().map((t) => {
                const status = tripStatus(t);
                const statusLabel = status === "cancelled" ? "Cancelled" : "Completed";
                return (
                  <article className="trip-item-card trip-item-compact" key={t.id}>
                    <div className="trip-item-title-row">
                      <i className="bi bi-car-front"></i>
                      <strong>{t.title || "Property Tour"}</strong>
                      <span className={`trip-status-chip ${status}`}>{statusLabel}</span>
                    </div>
                    <div className="small muted">{t.date || "-"} {t.time || ""}</div>
                  </article>
                );
              })}
              {!trips.length ? (
                <div className="agent-empty large trip-empty-clean">
                  <i className="bi bi-car-front"></i>
                  <h4>No trips available</h4>
                  <p>Trips scheduled by agents will appear here.</p>
                </div>
              ) : !pastAdminTrips.length ? (
                <div className="agent-empty"><i className="bi bi-clock-history"></i><p>No past tours yet.</p></div>
              ) : null}
            </div>
          </section>
        )}

        <UIFeedback
          toasts={feedback.toasts}
          closeToast={feedback.closeToast}
          confirmState={feedback.confirmState}
          cancelConfirm={feedback.cancelConfirm}
          confirm={feedback.confirm}
        />

    </DashboardLayout>
  );
}
