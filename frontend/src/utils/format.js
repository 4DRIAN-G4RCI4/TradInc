/** Formateadores compartidos (es-MX, moneda MXN por defecto). */

const NBSP = "\u00A0";

export function safe(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function decimalsFor(value) {
  const abs = Math.abs(value);
  if (abs === 0 || abs >= 1) return 2;
  return 4;
}

export function formatPrice(value, currency = "MXN") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const digits = decimalsFor(value);
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${safe(value, digits)}${NBSP}${currency}`;
  }
}

export function formatNumber(value, digits = 2) {
  return safe(value, digits);
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** 1.2 bill. / 345 mil M / 12.3 M — convención es-MX. */
export function formatCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}${NBSP}bill.`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}${NBSP}mil${NBSP}M`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}${NBSP}M`;
  if (abs >= 1e3) return new Intl.NumberFormat("es-MX").format(Math.round(value));
  return safe(value, abs < 10 ? 2 : 0);
}

export function formatInt(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-MX").format(Math.round(value));
}

export function timeAgo(iso) {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 90) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(then));
}

const INTRADAY_RANGES = new Set(["1d", "5d"]);

export function formatCandleTime(unixSeconds, range) {
  if (!unixSeconds) return "";
  const date = new Date(unixSeconds * 1000);
  if (INTRADAY_RANGES.has(range)) {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function directionOf(change) {
  if (change === null || change === undefined || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}
