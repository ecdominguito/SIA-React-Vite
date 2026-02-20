import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { safeArray } from "../lib/storage.js";
import { withImage, money, autoPropertyImage } from "../lib/dashboardUtils.js";

export default function PublicProperties() {
  const [query, setQuery] = useState("");
  const allProps = useMemo(() => safeArray("allProperties"), []);
  const handleImageError = (event, property) => {
    const image = event.currentTarget;
    if (!image || image.dataset.fallbackApplied === "1") return;
    image.dataset.fallbackApplied = "1";
    image.src = autoPropertyImage(property);
  };
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProps;
    return allProps.filter((p) => [p.title, p.location, p.description, p.agent].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [allProps, query]);

  return (
    <div className="public-shell">
      <header className="public-topbar">
        <div className="public-wrap">
          <div className="public-brand">
            <i className="bi bi-buildings"></i>
            <strong>RealEstate Pro</strong>
          </div>
          <div className="public-actions">
            <Link className="btn btn-outline-dark btn-sm" to="/">Home</Link>
            <Link className="btn btn-outline-dark btn-sm" to="/register">Register</Link>
            <Link className="btn btn-dark btn-sm" to="/login">Login</Link>
          </div>
        </div>
      </header>

      <main className="public-wrap">
        <section className="public-hero compact">
          <h1>Browse Properties</h1>
          <p>Public preview of available listings.</p>
          <input
            className="form-control public-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, location, description..."
          />
        </section>

        <section className="public-list-grid">
          {items.map((p) => (
            <article key={p.id} className="public-property-card">
              <img src={withImage(p)} alt={p.title || "Property"} onError={(event) => handleImageError(event, p)} />
              <div className="public-property-body">
                <div className="fw-bold">{p.title}</div>
                <div className="small muted">{p.location}</div>
                <div className="small muted">Agent: @{p.agent || "-"}</div>
                <div className="public-price">PHP {money(p.price)}</div>
                <Link className="btn btn-outline-dark btn-sm" to={`/properties/${p.id}`}>View details</Link>
              </div>
            </article>
          ))}
          {!items.length && (
            <div className="agent-empty large">
              <i className="bi bi-search"></i>
              <p>No matching properties found.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
