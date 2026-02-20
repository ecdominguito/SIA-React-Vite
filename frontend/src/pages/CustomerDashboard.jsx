import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, safeArray, saveArray, setCurrentUser as persistCurrentUser, subscribeKeys } from "../lib/storage.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import UIFeedback from "../components/UIFeedback.jsx";
import {
  applyPropertyImageFallback,
  makePropertyFallbackImage,
  money,
  statusBadgeClass,
  tripAttendees,
  tripStatus,
  withImage
} from "../lib/dashboardUtils.js";
import useUiFeedback from "../lib/useUiFeedback.js";
import { pushNotification } from "../lib/notificationUtils.js";
import {
  cleanEmail,
  cleanPhone,
  cleanText,
  createEntityId,
  isFutureOrNowSlot,
  isValidEmail,
  isValidPhone,
  normalizeDateTimeInput
} from "../lib/inputUtils.js";

const MEET_REASON_TEMPLATES = [
  "Financing consultation",
  "Schedule property visit plan",
  "Contract and offer discussion",
  "Investment advice"
];

export default function CustomerDashboard() {
  const user = getCurrentUser();

  const [tab, setTab] = useState("browse");

  const [properties, setProperties] = useState([]);
  const [apps, setApps] = useState([]);
  const [trips, setTrips] = useState([]);
  const [meets, setMeets] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [q, setQ] = useState("");
  const [booking, setBooking] = useState({ propertyId: "", date: "", time: "" });
  const [bookingStep, setBookingStep] = useState(1);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || ""
  });
  const [meetForm, setMeetForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    date: "",
    time: "",
    reason: "",
    mode: "office"
  });
  const [reviewForm, setReviewForm] = useState({
    rating: "0",
    comment: ""
  });
  const [reviewTargetId, setReviewTargetId] = useState("");
  const feedback = useUiFeedback();

  const refreshAll = () => {
    setProperties(safeArray("allProperties"));
    setApps(safeArray("allAppointments"));
    setTrips(safeArray("allTrips"));
    setMeets(safeArray("officeMeets"));
    setReviews(safeArray("allReviews"));
  };

  useEffect(() => {
    refreshAll();
    return subscribeKeys(["allProperties", "allAppointments", "allTrips", "officeMeets", "allReviews"], refreshAll);
  }, []);

  const myApps = useMemo(() => apps.filter((a) => a.customer === user?.username), [apps, user]);

  const filteredProps = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return properties;
    return properties.filter((p) =>
      [p.title, p.location, p.description, p.agent].filter(Boolean).join(" ").toLowerCase().includes(s)
    );
  }, [properties, q]);

  const myPending = useMemo(() => myApps.filter((a) => (a.status || "pending") === "pending"), [myApps]);
  const selectedBookingProperty = useMemo(
    () => properties.find((p) => String(p.id) === String(booking.propertyId)),
    [properties, booking.propertyId]
  );
  const saveAppsLocal = (next) => {
    saveArray("allAppointments", next);
    setApps(next);
  };
  const saveTripsLocal = (next) => {
    saveArray("allTrips", next);
    setTrips(next);
  };
  const saveMeetsLocal = (next) => {
    saveArray("officeMeets", next);
    setMeets(next);
  };
  const saveReviewsLocal = (next) => {
    saveArray("allReviews", next);
    setReviews(next);
  };
  const notifyRoles = ({ roles = [], includeUsers = [], title = "Notification", message = "", type = "general", meta = {} }) => {
    const users = safeArray("allUsers");
    const roleSet = new Set((roles || []).map((r) => String(r || "").toLowerCase()));
    const recipients = new Set((includeUsers || []).map((u) => String(u || "").trim()).filter(Boolean));

    users.forEach((u) => {
      const role = String(u?.role || "").toLowerCase();
      const username = String(u?.username || "").trim();
      if (roleSet.has(role) && username) recipients.add(username);
    });

    recipients.forEach((to) => {
      if (to === user?.username) return;
      pushNotification({ to, type, title, message, meta });
    });
  };

  const myReviews = useMemo(
    () => reviews.filter((r) => r.customer === user?.username).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [reviews, user]
  );
  const sortedTrips = useMemo(
    () => trips.slice().sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`)),
    [trips]
  );
  const myTrips = useMemo(
    () => sortedTrips.filter((t) => t.customer === user?.username || tripAttendees(t).includes(user?.username)),
    [sortedTrips, user]
  );
  const upcomingTrips = useMemo(
    () => sortedTrips.filter((t) => {
      const st = tripStatus(t);
      return st !== "done" && st !== "cancelled";
    }),
    [sortedTrips]
  );
  const pastTrips = useMemo(
    () => myTrips.filter((t) => {
      const st = tripStatus(t);
      return st === "done" || st === "cancelled";
    }),
    [myTrips]
  );
  const reviewedAppointmentIds = useMemo(
    () => new Set(myReviews.map((r) => String(r.appointmentId))),
    [myReviews]
  );
  const reviewEligibleApps = useMemo(
    () => myApps.filter((a) => (a.status || "pending") === "done" && !reviewedAppointmentIds.has(String(a.id))),
    [myApps, reviewedAppointmentIds]
  );
  const avgMyRating = useMemo(() => {
    if (!myReviews.length) return 0;
    const total = myReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    return total / myReviews.length;
  }, [myReviews]);

  const navItems = [
    { id: "browse", label: "Home", icon: "bi-house-door" },
    { id: "appointments", label: "Appointments", icon: "bi-calendar2-check" },
    { id: "meets", label: "Office Meets", icon: "bi-building" },
    { id: "trips", label: "Trips", icon: "bi-map" },
    { id: "reviews", label: "Reviews", icon: "bi-star" },
    { id: "profile", label: "Profile", icon: "bi-person-circle" }
  ];
  const currentTabLabel = navItems.find((item) => item.id === tab)?.label || "Dashboard";

  const resetBookingFlow = () => {
    setBooking({ propertyId: "", date: "", time: "" });
    setBookingStep(1);
  };

  const submitReviewForAppointment = (appointment) => {
    const appointmentId = String(appointment?.id || "");
    if (!appointmentId || !appointment) {
      feedback.notify("Invalid appointment.", "error");
      return;
    }
    if ((appointment.status || "pending") !== "done") {
      feedback.notify("Only completed appointments can be reviewed.", "error");
      return;
    }
    if (reviewedAppointmentIds.has(appointmentId)) {
      feedback.notify("You already reviewed this appointment.", "error");
      return;
    }
    const comment = cleanText(reviewForm.comment, 500);
    const rating = Number(reviewForm.rating || 0);
    if (!comment) {
      feedback.notify("Please add a comment.", "error");
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      feedback.notify("Please select a rating from 1 to 5 stars.", "error");
      return;
    }
    const newReview = {
      id: createEntityId("REV"),
      appointmentId,
      propertyId: appointment.propertyId || "",
      propertyImage: appointment.propertyImage || getPropertyImage(appointment),
      propertyTitle: appointment.propertyTitle || "",
      location: appointment.location || "",
      agent: appointment.agent || "",
      customer: user.username,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    saveReviewsLocal([newReview, ...reviews]);
    setReviewForm({ rating: "0", comment: "" });
    setReviewTargetId("");
    feedback.notify("Review submitted.", "success");
  };

  const startBookingForProperty = (propertyId) => {
    setBooking({ propertyId: String(propertyId), date: "", time: "" });
    setBookingStep(1);
  };

  const handlePropertyImageError = (e, propertyLike) => {
    applyPropertyImageFallback(e.currentTarget, propertyLike || { title: "Property" });
  };

  const getPropertyImage = (item) => {
    const explicit = String(item?.propertyImage || item?.imageUrl || "").trim();
    if (explicit) return explicit;
    const matched =
      properties.find((p) => String(p.id) === String(item?.propertyId)) ||
      properties.find((p) => p.title === item?.propertyTitle && p.location === item?.location);
    const resolved = withImage(
      matched || {
        id: item?.propertyId,
        title: item?.propertyTitle,
        location: item?.location,
        imageUrl: ""
      }
    );
    return resolved || makePropertyFallbackImage(item?.propertyTitle || "Property");
  };

  return (
    <DashboardLayout
      suiteLabel="Customer Suite"
      profileName={user?.fullName || "Customer"}
      profileRole="Customer"
      navItems={navItems}
      activeTab={tab}
      onTabChange={setTab}
    >
        <section className="agent-hero">
          <div>
            <h1>{currentTabLabel}</h1>
            <p>Customer Dashboard</p>
          </div>
        </section>

        {tab === "browse" && (
          <>
            <section className="agent-search-wrap">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input className="form-control" placeholder="Search listings by title, location, description, agent..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </section>

            <section className="agent-property-grid full">
              {filteredProps.map((p) => {
                const rawStatus = String(p.status || "available").toLowerCase();
                const isAvailable = rawStatus === "available";
                const statusKey = isAvailable ? "available" : "unavailable";
                return (
                <article key={p.id} className="agent-property-card">
                  <img
                    src={withImage(p)}
                    alt={p.title}
                    onError={(e) => handlePropertyImageError(e, p)}
                  />
                  <div className="agent-property-body">
                    <div className="d-flex justify-content-between gap-2 align-items-center">
                      <h4>{p.title}</h4>
                      <span className={`badge badge-soft status-${statusKey}`}>
                        {isAvailable ? "available" : "not available"}
                      </span>
                    </div>
                    <p><i className="bi bi-geo-alt"></i> {p.location}</p>
                    <div className="small muted">Agent: @{p.agent || "-"}</div>
                    <strong>PHP {money(p.price)}</strong>
                    <div className="agent-property-actions">
                      <Link className="btn btn-outline-dark btn-sm customer-property-action" to={`/properties/${p.id}`}>
                        Details
                      </Link>
                      <button
                        className="btn btn-dark btn-sm customer-property-action"
                        onClick={() => startBookingForProperty(p.id)}
                        disabled={!isAvailable}
                        title={isAvailable ? "Book this property" : "This property is not available"}
                      >
                        {isAvailable ? "Book This Property" : "Not Available"}
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
              {!filteredProps.length && <div className="agent-empty large"><i className="bi bi-house-door"></i><p>No matching listings.</p></div>}
            </section>

            {!!booking.propertyId && !!selectedBookingProperty && (
              <section className="shop-booking-modal-wrap" onClick={resetBookingFlow}>
                <article className="shop-booking-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="shop-booking-head">
                    <h4>{selectedBookingProperty.title}</h4>
                    <button className="btn btn-outline-dark btn-sm" onClick={resetBookingFlow}>Close</button>
                  </div>
                  <div className="small muted mb-2"><i className="bi bi-geo-alt"></i> {selectedBookingProperty.location} | Agent: @{selectedBookingProperty.agent}</div>

                  <div className="appointment-steps" aria-label="Appointment booking progress">
                    <div className={bookingStep >= 1 ? "active" : ""}>1. Property</div>
                    <div className={bookingStep >= 2 ? "active" : ""}>2. Schedule</div>
                    <div className={bookingStep >= 3 ? "active" : ""}>3. Review</div>
                  </div>

                  <div className="shop-booking-step-body">
                  {bookingStep === 1 && (
                    <div className="row g-2 shop-booking-step">
                      <div className="col-12">
                        <div className="appointment-review-card">
                          <div className="fw-bold">{selectedBookingProperty.title}</div>
                          <div className="small muted">{selectedBookingProperty.location}</div>
                          <div className="small muted">Agent: @{selectedBookingProperty.agent}</div>
                        </div>
                      </div>
                      <div className="col-12 d-flex gap-2 mt-2 shop-booking-actions">
                        <button className="btn btn-dark" onClick={() => setBookingStep(2)}>Next: Schedule</button>
                        <button className="btn btn-outline-dark" onClick={resetBookingFlow}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="row g-2 shop-booking-step">
                      <div className="col-md-6">
                        <label className="form-label">Date</label>
                        <input type="date" className="form-control" value={booking.date} onChange={(e) => setBooking((b) => ({ ...b, date: e.target.value }))} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Time</label>
                        <input type="time" className="form-control" value={booking.time} onChange={(e) => setBooking((b) => ({ ...b, time: e.target.value }))} />
                      </div>
                      <div className="col-12 d-flex gap-2 mt-2 shop-booking-actions">
                        <button className="btn btn-outline-dark" onClick={() => setBookingStep(1)}>Back</button>
                        <button
                          className="btn btn-dark"
                          onClick={() => {
                            if (!booking.date || !booking.time) {
                              feedback.notify("Set both date and time.", "error");
                              return;
                            }
                            if (!isFutureOrNowSlot(booking.date, booking.time)) {
                              feedback.notify("Appointment schedule must be now or in the future.", "error");
                              return;
                            }
                            setBookingStep(3);
                          }}
                        >
                          Next: Review
                        </button>
                      </div>
                    </div>
                  )}

                  {bookingStep === 3 && (
                    <div className="row g-2 shop-booking-step">
                      <div className="col-12">
                        <div className="appointment-review-card">
                          <div className="fw-bold">Review Appointment</div>
                          <div className="small"><span className="muted">Property:</span> {selectedBookingProperty.title || "(unknown)"}</div>
                          <div className="small"><span className="muted">Location:</span> {selectedBookingProperty.location || "-"}</div>
                          <div className="small"><span className="muted">Agent:</span> @{selectedBookingProperty.agent || "-"}</div>
                          <div className="small"><span className="muted">Schedule:</span> {booking.date} at {booking.time}</div>
                        </div>
                      </div>
                      <div className="col-12 d-flex gap-2 mt-2 shop-booking-actions">
                        <button className="btn btn-outline-dark" onClick={() => setBookingStep(2)}>Back</button>
                        <button className="btn btn-dark" onClick={() => {
                          if (!booking.propertyId || !booking.date || !booking.time) {
                            feedback.notify("Please complete the booking form.", "error");
                            return;
                          }
                          if (!isFutureOrNowSlot(booking.date, booking.time)) {
                            feedback.notify("Appointment schedule must be now or in the future.", "error");
                            return;
                          }
                          const pid = String(booking.propertyId);
                          const duplicate = apps.some((a) => a.customer === user.username && String(a.propertyId) === pid && a.date === booking.date && a.time === booking.time);
                          if (duplicate) {
                            feedback.notify("You already have a booking with the same property/date/time.", "error");
                            return;
                          }
                          saveAppsLocal([
                            {
                              id: createEntityId("APP"),
                              propertyId: pid,
                              propertyImage: getPropertyImage(selectedBookingProperty),
                              propertyTitle: selectedBookingProperty?.title || "(unknown)",
                              location: selectedBookingProperty?.location || "",
                              agent: selectedBookingProperty?.agent || "",
                              customer: user.username,
                              date: booking.date,
                              time: booking.time,
                              status: "pending"
                            },
                            ...apps
                          ]);
                          notifyRoles({
                            roles: ["admin"],
                            includeUsers: [selectedBookingProperty?.agent],
                            type: "appointment",
                            title: "New Appointment Request",
                            message: `Customer @${user.username} requested ${selectedBookingProperty?.title || "a property"} on ${booking.date} at ${booking.time}.`,
                            meta: {
                              customer: user.username,
                              agent: selectedBookingProperty?.agent || "",
                              propertyId: pid,
                              propertyTitle: selectedBookingProperty?.title || "",
                              date: booking.date,
                              time: booking.time
                            }
                          });
                          resetBookingFlow();
                          feedback.notify("Appointment request submitted.", "success");
                        }}>Submit Appointment</button>
                      </div>
                    </div>
                  )}
                  </div>
                </article>
              </section>
            )}
          </>
        )}

        {tab === "appointments" && (
          <section className="agent-panel appointment-status-panel">
            <div className="agent-panel-head">
              <h3>Booking Status</h3>
              <div className="appointment-status-badges">
                <span className="badge badge-soft">{myPending.length} pending</span>
                <span className="badge badge-soft">{reviewEligibleApps.length} to review</span>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle appointment-status-table">
                <thead><tr><th>Property</th><th>Date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {myApps.map((a) => {
                    const canReview = (a.status || "pending") === "done" && !reviewedAppointmentIds.has(String(a.id));
                    const isReviewing = reviewTargetId === String(a.id);
                    const appointmentImage = getPropertyImage(a);
                    return (
                      <React.Fragment key={a.id}>
                        <tr>
                          <td>
                            <div className="appointment-property-cell">
                              <img
                                className="appointment-property-thumb"
                                src={appointmentImage}
                                alt={a.propertyTitle || "Property"}
                                onError={(e) => {
                                  handlePropertyImageError(e, { id: a.propertyId, title: a.propertyTitle, location: a.location });
                                }}
                              />
                              <div>
                                <div className="fw-bold">{a.propertyTitle}</div>
                                <div className="small muted">{a.location}</div>
                              </div>
                            </div>
                          </td>
                          <td><div className="small fw-bold">{a.date}</div><div className="small muted">{a.time}</div></td>
                          <td><span className={statusBadgeClass(a.status)}>{a.status || "pending"}</span></td>
                          <td className="text-end">
                            {(a.status || "pending") === "pending" ? (
                              <button className="btn btn-outline-dark btn-sm" onClick={() => {
                                feedback.askConfirm({
                                  title: "Cancel Appointment",
                                  message: "Cancel this pending appointment?",
                                  confirmText: "Cancel appointment",
                                  variant: "danger",
                                  onConfirm: () => {
                                    saveAppsLocal(apps.filter((x) => x.id !== a.id));
                                    feedback.notify("Appointment cancelled.", "success");
                                  }
                                });
                              }}>Cancel</button>
                            ) : canReview ? (
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => {
                                  setReviewTargetId((prev) => (prev === String(a.id) ? "" : String(a.id)));
                                  setReviewForm({ rating: "0", comment: "" });
                                }}
                              >
                                {isReviewing ? "Close Review" : "Review Now"}
                              </button>
                            ) : <span className="small muted">-</span>}
                          </td>
                        </tr>
                        {isReviewing && (
                          <tr>
                            <td colSpan="4">
                              <div className="appointment-review-inline">
                                <div className="row g-2">
                                  <div className="col-12">
                                    <label className="form-label">Stars</label>
                                    <div className="review-rating-preview" aria-label={`Selected rating ${reviewForm.rating} out of 5`}>
                                      {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                          key={n}
                                          type="button"
                                          className="review-star-btn"
                                          onClick={() =>
                                            setReviewForm((s) => ({
                                              ...s,
                                              rating: Number(s.rating || 0) === n ? "0" : String(n)
                                            }))
                                          }
                                          aria-label={`${n} star${n > 1 ? "s" : ""}`}
                                        >
                                          <i
                                            className={`bi ${n <= Number(reviewForm.rating || 0) ? "bi-star-fill" : "bi-star"} me-1`}
                                            aria-hidden="true"
                                          ></i>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label">Comment</label>
                                    <textarea
                                      className="form-control"
                                      rows="3"
                                      placeholder="Share your experience..."
                                      value={reviewForm.comment}
                                      onChange={(e) => setReviewForm((s) => ({ ...s, comment: e.target.value }))}
                                    ></textarea>
                                  </div>
                                  <div className="col-12 d-flex gap-2 mt-1">
                                    <button className="btn btn-dark btn-sm" onClick={() => submitReviewForAppointment(a)}>Submit Review</button>
                                    <button className="btn btn-outline-dark btn-sm" onClick={() => setReviewTargetId("")}>Cancel</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!myApps.length && <tr><td colSpan="4" className="text-muted">No appointments yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "reviews" && (
          <section className="agent-panel reviews-list-panel">
            <div className="agent-panel-head">
              <h3>My Reviews</h3>
              <span className="badge badge-soft">{myReviews.length}</span>
            </div>
            <div className="reviews-meta-row">
              <span className="small muted">Average Rating</span>
              <strong>{avgMyRating ? `${avgMyRating.toFixed(1)}/5` : "-"}</strong>
            </div>
            <div className="reviews-modern-grid">
              {myReviews.map((reviewData) => {
                return (
                  <article key={reviewData.id} className="review-modern-card">
                    <div className="review-modern-media">
                      <img
                        className="review-modern-thumb"
                        src={getPropertyImage(reviewData)}
                        alt={reviewData.propertyTitle || "Property"}
                        onError={(e) => {
                          handlePropertyImageError(e, { id: reviewData.propertyId, title: reviewData.propertyTitle, location: reviewData.location });
                        }}
                      />
                    </div>
                    <div className="review-modern-body">
                      <div className="review-modern-top">
                        <div>
                          <div className="fw-bold">{reviewData.propertyTitle || "Property"}</div>
                          <div className="small muted">{reviewData.location || "-"}</div>
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
                        <span className="badge badge-soft status-done">reviewed</span>
                        <span className="small muted">Agent: @{reviewData.agent || "-"}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!myReviews.length && <div className="agent-empty"><i className="bi bi-star"></i><p>No reviews yet. Review completed appointments from the Appointments page.</p></div>}
            </div>
          </section>
        )}

        {tab === "trips" && (
          <section className="agent-panel">
            <div className="trip-page-head">
              <div>
                <h3>My Trips</h3>
                <p>View your scheduled property tours.</p>
              </div>
            </div>

            <div className="trip-section-title">Upcoming Tours</div>
            <div className="trip-list-stack">
              {upcomingTrips.map((t) => {
                const status = tripStatus(t);
                const statusLabel = status === "in-progress" ? "In Progress" : "Scheduled";
                const attendees = tripAttendees(t);
                const joined = attendees.includes(user.username);
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
                          <span><i className="bi bi-calendar3"></i> {t.date || "-"} {t.time || ""}</span>
                        </div>
                      </div>
                      <div className="trip-item-label">PROPERTIES TO VISIT:</div>
                      <div className="trip-chip-row">
                        {selected.length ? selected.map((p) => (
                          <span key={p.id} className="trip-property-chip">
                            <span>{p.title}</span>
                          </span>
                        )) : <span className="small muted">No properties selected.</span>}
                      </div>
                      {t.notes ? <div className="trip-notes-box">{t.notes}</div> : null}
                    </div>
                    <div className="trip-item-actions">
                      {joined ? (
                        <button
                          className="btn btn-outline-dark btn-sm"
                          onClick={() => {
                            saveTripsLocal(trips.map((x) =>
                              x.id === t.id
                                ? (() => {
                                    const nextAttendees = tripAttendees(x).filter((m) => m !== user.username);
                                    const currentCustomer = String(x.customer || "").trim();
                                    const clearCustomer = currentCustomer === user.username && nextAttendees.length === 0;
                                    return {
                                      ...x,
                                      attendees: nextAttendees,
                                      customer: clearCustomer ? "" : x.customer
                                    };
                                  })()
                                : x
                            ));
                            feedback.notify("You left the trip.", "success");
                          }}
                        >
                          Leave Trip
                        </button>
                      ) : (
                        <button
                          className="btn btn-dark btn-sm"
                          onClick={() => {
                            saveTripsLocal(trips.map((x) =>
                              x.id === t.id
                                ? (() => {
                                    const nextAttendees = Array.from(new Set([...tripAttendees(x), user.username]));
                                    const currentCustomer = String(x.customer || "").trim();
                                    return {
                                      ...x,
                                      attendees: nextAttendees,
                                      customer: currentCustomer || user.username
                                    };
                                  })()
                                : x
                            ));
                            feedback.notify("You joined the trip.", "success");
                          }}
                        >
                          Join Trip
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {!upcomingTrips.length && <div className="agent-empty"><i className="bi bi-car-front"></i><p>No upcoming tours.</p></div>}
            </div>

            <div className="trip-section-title mt-3">Past Tours</div>
            <div className="trip-list-stack">
              {pastTrips.map((t) => {
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
              {!pastTrips.length && <div className="agent-empty"><i className="bi bi-clock-history"></i><p>No past tours yet.</p></div>}
            </div>
          </section>
        )}

        {tab === "meets" && (
          <>
            <section className="agent-panel meets-unified-panel">
              <div className="office-meet-form-panel unique-meet meets-form-wrap">
                <div className="agent-panel-head">
                  <h3>Build Office Meet Request</h3>
                </div>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Meeting Mode</label>
                    <div className="meet-mode-group">
                      <button
                        type="button"
                        className={meetForm.mode === "office" ? "active" : ""}
                        onClick={() => setMeetForm((s) => ({ ...s, mode: "office" }))}
                      >
                        <i className="bi bi-building"></i>In Office
                      </button>
                      <button
                        type="button"
                        className={meetForm.mode === "virtual" ? "active" : ""}
                        onClick={() => setMeetForm((s) => ({ ...s, mode: "virtual" }))}
                      >
                        <i className="bi bi-camera-video"></i>Virtual
                      </button>
                    </div>
                  </div>
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={meetForm.fullName} onChange={(e) => setMeetForm((s) => ({ ...s, fullName: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={meetForm.email} onChange={(e) => setMeetForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preferred Date</label>
                  <input className="form-control" type="date" value={meetForm.date} onChange={(e) => setMeetForm((s) => ({ ...s, date: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preferred Time</label>
                  <input className="form-control" type="time" value={meetForm.time} onChange={(e) => setMeetForm((s) => ({ ...s, time: e.target.value }))} />
                </div>
                <div className="col-12">
                  <label className="form-label">Reason</label>
                  <div className="meet-reason-quick">
                    {MEET_REASON_TEMPLATES.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setMeetForm((s) => ({ ...s, reason: s.reason ? `${s.reason} | ${item}` : item }))}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <textarea className="form-control" rows="4" value={meetForm.reason} onChange={(e) => setMeetForm((s) => ({ ...s, reason: e.target.value }))}></textarea>
                </div>
                <div className="col-12">
                  <button
                    className="btn btn-dark w-100"
                    onClick={() => {
                      const fullName = cleanText(meetForm.fullName, 80);
                      const email = cleanEmail(meetForm.email);
                      const reason = cleanText(meetForm.reason, 600);
                      const { date, time } = normalizeDateTimeInput(meetForm.date, meetForm.time);
                      if (!fullName || !email || !date || !time || !reason) {
                        feedback.notify("Please complete all office meet fields.", "error");
                        return;
                      }
                      if (!isValidEmail(email)) {
                        feedback.notify("Please provide a valid email.", "error");
                        return;
                      }
                      if (!isFutureOrNowSlot(date, time)) {
                        feedback.notify("Meet schedule must be now or in the future.", "error");
                        return;
                      }
                      const newMeet = {
                        id: createEntityId("MEET"),
                        title: "Customer Office Meet Request",
                        fullName,
                        email,
                        date,
                        time,
                        reason,
                        mode: meetForm.mode,
                        customer: user.username,
                        requestedBy: user.username,
                        requestedRole: "customer",
                        status: "pending"
                      };
                      saveMeetsLocal([newMeet, ...meets]);
                      notifyRoles({
                        roles: ["admin", "agent"],
                        type: "office-meet",
                        title: "New Office Meet Request",
                        message: `Customer @${user.username} requested a ${meetForm.mode === "virtual" ? "virtual" : "in-office"} meet on ${date} at ${time}.`,
                        meta: {
                          customer: user.username,
                          mode: meetForm.mode,
                          date,
                          time
                        }
                      });
                      setMeetForm((s) => ({ ...s, date: "", time: "", reason: "", mode: "office" }));
                      feedback.notify("Office meet request submitted.", "success");
                    }}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
              </div>
            </section>
          </>
        )}

        {tab === "profile" && (
          <section className="agent-panel customer-profile-panel">
            <div className="customer-profile-head">
              <div className="d-flex align-items-center gap-3">
                <span className="agent-avatar customer-profile-avatar">
                  {(profileForm.fullName || user?.username || "C").charAt(0).toUpperCase()}
                </span>
                <div>
                  <h3>{profileForm.fullName || "-"}</h3>
                  <div className="small muted">@{user?.username} | Customer</div>
                </div>
              </div>
              <div className="customer-profile-meta">
                <span><i className="bi bi-envelope"></i> {profileForm.email || "-"}</span>
                <span><i className="bi bi-telephone"></i> {profileForm.phone || "-"}</span>
              </div>
            </div>

            <form
              className="customer-profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fullName = cleanText(profileForm.fullName, 80);
                const phone = cleanPhone(profileForm.phone);
                const email = cleanEmail(profileForm.email);
                if (!fullName || !phone || !email) {
                  feedback.notify("Full name, phone, and email are required.", "error");
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

                const users = safeArray("allUsers");
                const idx = users.findIndex((u) => u.id === user?.id || u.username === user?.username);
                if (idx < 0) {
                  feedback.notify("Unable to update profile. User not found.", "error");
                  return;
                }

                const updatedUser = {
                  ...users[idx],
                  fullName,
                  phone,
                  email
                };
                const nextUsers = [...users];
                nextUsers[idx] = updatedUser;
                saveArray("allUsers", nextUsers);

                persistCurrentUser({
                  id: updatedUser.id,
                  username: updatedUser.username,
                  role: updatedUser.role,
                  fullName: updatedUser.fullName,
                  phone: updatedUser.phone,
                  email: updatedUser.email,
                  photoUrl: updatedUser.photoUrl || ""
                });

                feedback.notify("Profile updated successfully.", "success");
              }}
            >
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={profileForm.fullName} onChange={(e) => setProfileForm((s) => ({ ...s, fullName: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={profileForm.phone} onChange={(e) => setProfileForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={profileForm.email} onChange={(e) => setProfileForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="col-12 d-flex gap-2 mt-1">
                  <button className="btn btn-dark">Save Profile</button>
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setProfileForm({
                      fullName: user?.fullName || "",
                      phone: user?.phone || "",
                      email: user?.email || ""
                    })}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
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

