export function formatUsd(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs < 1 ? (abs < 0.01 ? 6 : 4) : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}
