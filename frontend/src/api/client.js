/**
 * Cliente HTTP para la API de TradInc.
 *
 * En desarrollo, Vite hace proxy de /api hacia http://localhost:4000.
 * En producción se define VITE_API_URL (p. ej. la URL del backend en Render);
 * si no se define, se asume que la API vive en el mismo origen.
 */

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, code = "ERROR", status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request(path, { method = "GET", params, body } = {}) {
  const url = new URL(`${API_BASE}/api${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor", "NETWORK_ERROR");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      err?.message || `Error ${res.status}`,
      err?.code || "ERROR",
      res.status
    );
  }
  return data;
}

export const marketApi = {
  top: (symbols) =>
    request("/market/top", {
      params: symbols?.length ? { symbols: symbols.join(",") } : {},
    }),
  global: () => request("/market/global"),
  symbols: () => request("/market/symbols"),
  search: (q) => request("/market/search", { params: { q } }),
  quote: (symbol) => request(`/market/${encodeURIComponent(symbol)}`),
  history: (symbol, range) =>
    request(`/market/${encodeURIComponent(symbol)}/history`, {
      params: { range },
    }),
  profile: (symbol) =>
    request(`/market/${encodeURIComponent(symbol)}/profile`),
};

export const newsApi = {
  list: (filter) => request("/news", { params: filter ? { symbol: filter } : {} }),
};

export const analysisApi = {
  symbol: (symbol) => request(`/analysis/${encodeURIComponent(symbol)}`),
  generateSymbol: (symbol) =>
    request(`/analysis/${encodeURIComponent(symbol)}`, { method: "POST" }),
  market: () => request("/analysis/market"),
  generateMarket: () => request("/analysis/market", { method: "POST" }),
};
