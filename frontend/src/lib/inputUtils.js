const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/i;
const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;

export function cleanText(value, maxLen = 240) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function cleanEmail(value) {
  return cleanText(value, 120).toLowerCase();
}

export function cleanUsername(value) {
  return cleanText(value, 40).replace(/\s+/g, "").toLowerCase();
}

export function cleanPhone(value) {
  return cleanText(value, 30);
}

export function isValidEmail(value) {
  return EMAIL_RE.test(cleanEmail(value));
}

export function isValidUsername(value) {
  return USERNAME_RE.test(cleanUsername(value));
}

export function isValidPhone(value) {
  return PHONE_RE.test(cleanPhone(value));
}

export function isStrongEnoughPassword(value, min = 6) {
  return String(value || "").trim().length >= min;
}

export function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function createEntityId(prefix = "ID") {
  const upperPrefix = String(prefix || "ID").toUpperCase();
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${upperPrefix}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    }
  } catch {
    // noop fallback below
  }
  const rand = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `${upperPrefix}-${rand}`;
}

export function isFutureOrNowSlot(dateValue, timeValue) {
  const date = String(dateValue || "");
  const time = String(timeValue || "");
  if (!date || !time) return false;
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() >= Date.now();
}

export function normalizeDateTimeInput(dateValue, timeValue) {
  return {
    date: String(dateValue || "").trim(),
    time: String(timeValue || "").trim()
  };
}
