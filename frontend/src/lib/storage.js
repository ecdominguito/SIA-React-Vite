export function safeArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function emitStorageUpdate(key) {
  try {
    window.dispatchEvent(new CustomEvent("ls:update", { detail: { key } }));
  } catch {
    // ignore
  }
}

export function saveArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
  emitStorageUpdate(key);
}

export function seedDefaultData() {
  let users = safeArray("allUsers");
  if (users.length === 0) {
    users = [
      { id: 1, username: "admin", password: "admin123", role: "admin", fullName: "System Admin", phone: "09123456789", email: "admin@email.com", photoUrl: "" },
      { id: 2, username: "agent", password: "agent123", role: "agent", fullName: "Demo Agent", phone: "09999999999", email: "agent@email.com", photoUrl: "" },
      { id: 3, username: "customer", password: "customer123", role: "customer", fullName: "Demo Customer", phone: "09888888888", email: "customer@email.com", photoUrl: "" }
    ];
    saveArray("allUsers", users);
  }

  let props = safeArray("allProperties");
  if (props.length === 0) {
    props = [
      { id: 101, title: "2BR Condo - Downtown", description: "Near mall, clean and modern condo.", price: 25000, location: "Davao City", agent: "agent", imageUrl: "" }
    ];
    saveArray("allProperties", props);
  }

  if (!localStorage.getItem("allAppointments")) saveArray("allAppointments", []);
  if (!localStorage.getItem("officeMeets")) saveArray("officeMeets", []);
  if (!localStorage.getItem("allTrips")) saveArray("allTrips", []);
  if (!localStorage.getItem("allReviews")) saveArray("allReviews", []);
  if (!localStorage.getItem("allNotifications")) saveArray("allNotifications", []);
}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser")); } catch { return null; }
}
export function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  emitStorageUpdate("currentUser");
}
export function clearCurrentUser() {
  localStorage.removeItem("currentUser");
  emitStorageUpdate("currentUser");
}

/**
 * Subscribe to updates for one or more keys.
 * Triggers for:
 * - Same-tab writes via saveArray/setCurrentUser (CustomEvent)
 * - Other-tab writes via native "storage" event
 * - Tab focus (useful after refresh/returning to tab)
 */
export function subscribeKeys(keys, onUpdate) {
  const set = new Set([].concat(keys || []));
  const handleCustom = (e) => {
    const k = e?.detail?.key;
    if (!k || set.has(k)) onUpdate(k);
  };
  const handleStorage = (e) => {
    const k = e?.key;
    if (!k || set.has(k)) onUpdate(k);
  };
  const handleFocus = () => onUpdate(null);

  window.addEventListener("ls:update", handleCustom);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("ls:update", handleCustom);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleFocus);
  };
}
