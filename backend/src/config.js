import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // TTLs de caché en segundos
  cache: {
    quotes: 60,
    history: 300,
    profile: 3600,
    news: 600,
    analysis: 900,
    global: 120,
    search: 600,
  },
};

// Watchlist por defecto: empresas mexicanas (BMV) + referencias globales.
export const DEFAULT_SYMBOLS = [
  "WALMEX.MX",
  "AMXB.MX",
  "GFNORTEO.MX",
  "FEMSAUBD.MX",
  "GMEXICOB.MX",
  "CEMEXCPO.MX",
  "BIMBOA.MX",
  "AC.MX",
  "ASURB.MX",
  "GAPB.MX",
  "KIMBERA.MX",
  "ORBIA.MX",
  "TLEVISACPO.MX",
  "LIVEPOLC-1.MX",
];

// Referencias de mercado global que se muestran en la barra de estadísticas.
export const GLOBAL_INDICES = [
  { symbol: "^MXX", label: "IPC México" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "MXN=X", label: "USD/MXN" },
];

export const NEWS_FEEDS = [
  "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml",
  "https://www.eleconomista.com.mx/rss.xml",
  "https://finance.yahoo.com/news/rssindex",
];
