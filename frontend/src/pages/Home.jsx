import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { safeArray } from "../lib/storage.js";
import { withImage, money, applyPropertyImageFallback } from "../lib/dashboardUtils.js";

export default function Home() {
  const allFeatured = useMemo(() => safeArray("allProperties"), []);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allFeatured.length / pageSize));
  const [currentPage, setCurrentPage] = useState(1);
  const featured = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFeatured.slice(start, start + pageSize);
  }, [allFeatured, currentPage]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, idx) => idx + 1), [totalPages]);
  const handleImageError = (event, property) => {
    applyPropertyImageFallback(event.currentTarget, property || {});
  };

  return (
    <div className="public-shell public-home-shell">
      <header className="public-topbar public-home-topbar">
        <div className="public-wrap">
          <div className="public-brand">
            <i className="bi bi-building"></i>
            <strong>RealEstate Pro</strong>
          </div>
          <div className="public-actions public-home-actions">
            <Link className="btn btn-outline-dark btn-sm" to="/login">Sign in</Link>
            <Link className="btn btn-dark btn-sm" to="/register">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="public-wrap public-home-main">
        <section className="public-hero public-home-hero">
          <span className="public-home-kicker">Trusted Real Estate Platform</span>
          <h1>Find a Home You Will Love, Faster</h1>
          <p>
            Discover verified listings, compare real options, and book your viewing in minutes.
            From first search to final decision, RealEstate Pro helps you move with confidence.
          </p>
          <div className="public-home-trust-list" aria-label="Why choose RealEstate Pro">
            <span>Verified Listings</span>
            <span>Fast Viewing Requests</span>
            <span>Trusted Agents</span>
          </div>
        </section>

        <section className="public-home-featured">
          <div className="public-home-featured-head">
            <h2>Featured Properties</h2>
            <p>Handpicked homes and high-demand units available now.</p>
          </div>
          <div className="public-home-property-grid">
            {featured.map((property) => (
              <article key={property.id} className="public-home-property-card">
                <img
                  src={withImage(property)}
                  alt={property.title || "Property"}
                  onError={(event) => handleImageError(event, property)}
                />
                <div className="public-home-property-body">
                  <h3>{property.title || "Property Listing"}</h3>
                  <p>{property.location || "-"}</p>
                  <div className="small muted">Agent: @{property.agent || "-"}</div>
                  <div className="public-home-property-foot">
                    <strong>PHP {money(property.price)}</strong>
                    <Link className="btn btn-dark btn-sm" to={`/properties/${property.id}`}>View</Link>
                  </div>
                </div>
              </article>
            ))}
            {!featured.length && (
              <div className="public-home-empty">
                <i className="bi bi-house"></i>
                <p>No featured properties yet.</p>
              </div>
            )}
          </div>
          {allFeatured.length > pageSize && (
            <div className="public-home-pagination">
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <div className="public-home-page-list" aria-label="Featured properties pages">
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`btn btn-sm ${page === currentPage ? "btn-dark" : "btn-outline-dark"}`}
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="public-home-footer">
        <div className="public-wrap public-home-footer-wrap">
          <div className="public-brand public-home-footer-brand">
            <i className="bi bi-building"></i>
            <strong>RealEstate Pro</strong>
          </div>
          <small>(c) 2024 RealEstate Pro. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
}
