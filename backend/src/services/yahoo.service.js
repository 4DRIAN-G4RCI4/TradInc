import axios from "axios";
import { getOrFetch } from "./cache.service.js";
import { config, GLOBAL_INDICES } from "../config.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

const QUERY1 = "https://query1.finance.yahoo.com";

const http = axios.create({
  timeout: 12000,
  headers: { "User-Agent": UA, Accept: "application/json,text/plain,*/*" },
});

// ---------------------------------------------------------------------------
// Autenticación (cookie + crumb) requerida por los endpoints v7/v10 de Yahoo.
// Se renueva automáticamente cuando expira o tras un 401/403.
// ---------------------------------------------------------------------------
let authCache = { crumb: null, cookie: null, ts: 0 };
const AUTH_TTL = 30 * 60 * 1000;

function parseSetCookie(headers) {
  const raw = headers["set-cookie"] || [];
  return raw.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}

async function refreshAuth() {
  const parts = [];
  for (const url of ["https://fc.yahoo.com", "https://finance.yahoo.com"]) {
    try {
      const res = await http.get(url, { validateStatus: () => true });
      const c = parseSetCookie(res.headers);
      if (c) parts.push(c);
    } catch {
      /* noop */
    }
  }
  const cookie = parts.join("; ");

  let crumb = null;
  try {
    const res = await http.get(`${QUERY1}/v1/test/getcrumb`, {
      headers: cookie ? { Cookie: cookie } : {},
      validateStatus: () => true,
    });
    if (
      res.status === 200 &&
      typeof res.data === "string" &&
      res.data.trim() &&
      !res.data.includes("<")
    ) {
      crumb = res.data.trim();
    }
  } catch {
    /* noop */
  }

  authCache = { crumb, cookie, ts: Date.now() };
  return authCache;
}

async function getAuth() {
  if (authCache.crumb && Date.now() - authCache.ts < AUTH_TTL) return authCache;
  return refreshAuth();
}

/**
 * GET a Yahoo con manejo de auth y reintento único ante 401/403.
 */
async function yahooGet(url, { auth = false, params = {} } = {}) {
  const run = async () => {
    const headers = {};
    let q = { ...params };
    if (auth) {
      const a = await getAuth();
      if (a.cookie) headers.Cookie = a.cookie;
      if (a.crumb) q.crumb = a.crumb;
    }
    return http.get(url, { params: q, headers, validateStatus: () => true });
  };

  let res = await run();
  if (auth && (res.status === 401 || res.status === 403)) {
    await refreshAuth();
    res = await run();
  }

  if (res.status === 404) {
    const err = new Error("Símbolo no encontrado");
    err.status = 404;
    err.code = "SYMBOL_NOT_FOUND";
    throw err;
  }
  if (res.status === 429) {
    const err = new Error("Yahoo Finance limitó las solicitudes, intenta de nuevo");
    err.status = 503;
    err.code = "UPSTREAM_RATE_LIMITED";
    throw err;
  }
  if (res.status !== 200) {
    const err = new Error("Error consultando Yahoo Finance");
    err.status = 502;
    err.code = "UPSTREAM_ERROR";
    throw err;
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function round(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function normalizeQuote(q) {
  if (!q || !q.symbol) return null;
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: round(q.regularMarketPrice, 4),
    change: round(q.regularMarketChange, 4),
    changePercent: round(q.regularMarketChangePercent, 4),
    previousClose: round(q.regularMarketPreviousClose, 4),
    open: round(q.regularMarketOpen, 4),
    dayHigh: round(q.regularMarketDayHigh, 4),
    dayLow: round(q.regularMarketDayLow, 4),
    volume: q.regularMarketVolume ?? null,
    marketCap: q.marketCap ?? null,
    currency: q.currency || "MXN",
    exchange: q.fullExchangeName || q.exchange || "",
    quoteType: q.quoteType || "EQUITY",
    fiftyTwoWeekHigh: round(q.fiftyTwoWeekHigh, 4),
    fiftyTwoWeekLow: round(q.fiftyTwoWeekLow, 4),
    yearChangePercent: round(q.fiftyTwoWeekChangePercent, 4),
    pe: round(q.trailingPE, 2),
    eps: round(q.epsTrailingTwelveMonths, 2),
    dividendYield: round(q.trailingAnnualDividendYield, 6),
  };
}

function normalizeChartMeta(m) {
  if (!m || !m.symbol) return null;
  return {
    symbol: m.symbol,
    name: m.shortName || m.longName || m.symbol,
    price: round(m.regularMarketPrice, 4),
    change: round(
      m.fulldayChange ?? m.regularMarketPrice - m.chartPreviousClose,
      4
    ),
    changePercent: round(
      m.regularMarketChangePercent ?? m.fulldayChangePercent,
      4
    ),
    previousClose: round(m.chartPreviousClose, 4),
    open: null,
    dayHigh: round(m.regularMarketDayHigh, 4),
    dayLow: round(m.regularMarketDayLow, 4),
    volume: m.regularMarketVolume ?? null,
    marketCap: null,
    currency: m.currency || "MXN",
    exchange: m.fullExchangeName || m.exchangeName || "",
    quoteType: m.instrumentType || "EQUITY",
    fiftyTwoWeekHigh: round(m.fiftyTwoWeekHigh, 4),
    fiftyTwoWeekLow: round(m.fiftyTwoWeekLow, 4),
    yearChangePercent: null,
    pe: null,
    eps: null,
    dividendYield: null,
  };
}

async function getQuoteFromChart(symbol) {
  const data = await yahooGet(
    `${QUERY1}/v8/finance/chart/${encodeURIComponent(symbol)}`,
    { params: { interval: "1d", range: "1d" } }
  );
  const meta = data?.chart?.result?.[0]?.meta;
  const quote = normalizeChartMeta(meta);
  if (!quote || quote.price === null) {
    const err = new Error(`Sin datos para el símbolo ${symbol}`);
    err.status = 404;
    err.code = "SYMBOL_NOT_FOUND";
    throw err;
  }
  return quote;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function getQuotes(symbols) {
  const key = `quotes:${symbols.join(",")}`;
  return getOrFetch(key, config.cache.quotes, async () => {
    let results = [];
    try {
      const data = await yahooGet(`${QUERY1}/v7/finance/quote`, {
        auth: true,
        params: { symbols: symbols.join(",") },
      });
      results = data?.quoteResponse?.result || [];
    } catch {
      results = [];
    }

    if (!results.length) {
      const settled = await Promise.allSettled(
        symbols.map((s) => getQuoteFromChart(s))
      );
      return settled
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value);
    }

    return results.map(normalizeQuote).filter((q) => q && q.price !== null);
  });
}

export async function getQuote(symbol) {
  const [quote] = await getQuotes([symbol]);
  if (!quote) {
    const err = new Error(`Sin datos para el símbolo ${symbol}`);
    err.status = 404;
    err.code = "SYMBOL_NOT_FOUND";
    throw err;
  }
  return quote;
}

const RANGE_MAP = {
  "1d": { range: "1d", interval: "5m" },
  "5d": { range: "5d", interval: "30m" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "6mo": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
};

export const RANGE_KEYS = Object.keys(RANGE_MAP);

export async function getHistory(symbol, range = "1mo") {
  const key = RANGE_MAP[range] ? range : "1mo";
  return getOrFetch(`history:${symbol}:${key}`, config.cache.history, async () => {
    const { range: yRange, interval } = RANGE_MAP[key];
    const data = await yahooGet(
      `${QUERY1}/v8/finance/chart/${encodeURIComponent(symbol)}`,
      { params: { interval, range: yRange, includePrePost: "false" } }
    );

    const result = data?.chart?.result?.[0];
    if (!result) {
      const err = new Error(`Sin histórico para ${symbol}`);
      err.status = 404;
      err.code = "NO_HISTORY";
      throw err;
    }

    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const candles = timestamps
      .map((t, i) => ({
        time: t,
        open: round(q.open?.[i], 4),
        high: round(q.high?.[i], 4),
        low: round(q.low?.[i], 4),
        close: round(q.close?.[i], 4),
        volume: q.volume?.[i] ?? 0,
      }))
      .filter(
        (c) =>
          c.open !== null &&
          c.high !== null &&
          c.low !== null &&
          c.close !== null
      );

    if (candles.length === 0) {
      const err = new Error(`Sin histórico para ${symbol}`);
      err.status = 404;
      err.code = "NO_HISTORY";
      throw err;
    }

    return { symbol, range: key, interval, source: "yahoo", candles };
  });
}

export async function getProfile(symbol) {
  return getOrFetch(`profile:${symbol}`, config.cache.profile, async () => {
    const data = await yahooGet(
      `${QUERY1}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
      { auth: true, params: { modules: "assetProfile,summaryDetail,financialData,price" } }
    );
    const r = data?.quoteSummary?.result?.[0] || {};
    const p = r.assetProfile || {};
    const s = r.summaryDetail || {};
    const f = r.financialData || {};
    const price = r.price || {};
    return {
      symbol,
      name: price.longName || price.shortName || symbol,
      sector: p.sector || null,
      industry: p.industry || null,
      country: p.country || null,
      website: p.website || null,
      employees: p.fullTimeEmployees ?? null,
      summary: p.longBusinessSummary || null,
      dividendRate: s.dividendRate ?? null,
      dividendYield: s.dividendYield ?? null,
      beta: s.beta ?? null,
      priceToBook: s.priceToBook ?? null,
      trailingPE: s.trailingPE ?? null,
      marketCap: s.marketCap ?? price.marketCap ?? null,
      profitMargins: f.profitMargins ?? null,
      returnOnEquity: f.returnOnEquity ?? null,
      debtToEquity: f.debtToEquity ?? null,
    };
  });
}

export async function searchSymbols(query) {
  const q = query.trim();
  return getOrFetch(`search:${q.toLowerCase()}`, config.cache.search, async () => {
    const data = await yahooGet(`${QUERY1}/v1/finance/search`, {
      params: { q, quotesCount: 12, newsCount: 0 },
    });
    return (data?.quotes || [])
      .filter((item) => item.symbol && item.quoteType !== "OPTION")
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange || item.exchDisp || "",
        quoteType: item.quoteType || "",
      }));
  });
}

export async function getGlobalIndices() {
  return getOrFetch("global:indices", config.cache.global, async () => {
    const symbols = GLOBAL_INDICES.map((i) => i.symbol);

    let bySymbol = new Map();
    try {
      const data = await yahooGet(`${QUERY1}/v7/finance/quote`, {
        auth: true,
        params: { symbols: symbols.join(",") },
      });
      for (const q of data?.quoteResponse?.result || []) {
        bySymbol.set(q.symbol, normalizeQuote(q));
      }
    } catch {
      bySymbol = new Map();
    }

    // Rellena los que falten con el endpoint de chart (funciona sin crumb).
    await Promise.all(
      symbols
        .filter((s) => !bySymbol.has(s))
        .map(async (s) => {
          try {
            bySymbol.set(s, await getQuoteFromChart(s));
          } catch {
            /* noop */
          }
        })
    );

    return GLOBAL_INDICES.map((meta) => {
      const q = bySymbol.get(meta.symbol);
      return {
        symbol: meta.symbol,
        label: meta.label,
        price: q?.price ?? null,
        change: q?.change ?? null,
        changePercent: q?.changePercent ?? null,
      };
    });
  });
}
