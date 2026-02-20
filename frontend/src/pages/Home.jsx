import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="public-shell public-home-shell">
      <header className="public-topbar public-home-topbar">
        <div className="public-wrap">
          <div className="public-brand">
            <i className="bi bi-building"></i>
            <strong>RealEstate Pro</strong>
          </div>
          <div className="public-actions public-home-actions">
            <Link className="public-link-minimal" to="/login">
              Sign in
            </Link>
            <Link className="btn btn-dark btn-sm" to="/register">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="public-wrap public-home-main">
        <section className="public-hero public-home-hero">
          <h1>Find Your Perfect Property with Ease</h1>
          <p>
            Streamline your real estate journey with our comprehensive property management platform.
            Browse listings, schedule viewings, and connect with agents seamlessly.
          </p>
          <div className="public-cta-row">
            <Link className="btn btn-dark" to="/properties">
              Start Browsing <i className="bi bi-arrow-right ms-1"></i>
            </Link>
            <Link className="btn btn-outline-dark" to="/login">Sign In</Link>
          </div>
        </section>

        <section className="public-home-features">
          <h2>Everything You Need</h2>
          <div className="public-home-feature-grid">
            <article className="public-home-feature-card">
              <div className="public-home-feature-icon"><i className="bi bi-building"></i></div>
              <h3>Property Listings</h3>
              <p>Browse through our extensive collection of properties with detailed information and photos.</p>
            </article>
            <article className="public-home-feature-card">
              <div className="public-home-feature-icon"><i className="bi bi-calendar-check"></i></div>
              <h3>Easy Scheduling</h3>
              <p>Book property viewings at your convenience with our intuitive scheduling system.</p>
            </article>
            <article className="public-home-feature-card">
              <div className="public-home-feature-icon"><i className="bi bi-people"></i></div>
              <h3>Expert Agents</h3>
              <p>Connect with experienced real estate agents who will guide you through every step.</p>
            </article>
          </div>
        </section>

        <section className="public-home-cta">
          <article className="public-home-cta-card">
            <i className="bi bi-shield public-home-cta-icon"></i>
            <h2>Ready to Find Your Dream Home?</h2>
            <p>Join thousands of satisfied customers who found their perfect property through our platform.</p>
            <Link className="btn btn-light btn-sm" to="/register">
              Create Free Account <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </article>
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
