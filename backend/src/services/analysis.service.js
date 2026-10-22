import { getQuote, getHistory, getProfile } from "./yahoo.service.js";
import { getNews } from "./news.service.js";
import { getOrFetch } from "./cache.service.js";
import { config } from "../config.js";

const POSITIVE_WORDS = [
  "sube", "crece", "gana", "récord", "record", "alza", "impulsa", "supera",
  "optimista", "expansión", "expansion", "utilidad", "beneficio", "mejora",
  "recupera", "repunta", "aumenta", "fuerte", "oportunidad", "upgrade",
  "beat", "surge", "rally", "gain", "bullish", "outperform",
];

const NEGATIVE_WORDS = [
  "cae", "baja", "pierde", "desploma", "pérdida", "perdida", "débil", "debil",
  "caída", "caida", "riesgo", "recorte", "desacelera", "contracción", "contraccion",
  "preocupación", "preocupacion", "deuda", "sanciones", "down", "plunge",
  "bearish", "underperform", "downgrade", "miss", "loss", "decline", "drop",
];

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return 100 - 100 / (1 + rs);
}

function pctChange(from, to) {
  if (!from || !to) return null;
  return ((to - from) / from) * 100;
}

function trendLabel(score) {
  if (score >= 3) return "fuertemente alcista";
  if (score >= 1) return "alcista";
  if (score <= -3) return "fuertemente bajista";
  if (score <= -1) return "bajista";
  return "lateral / neutral";
}

function scoreSentiment(texts) {
  const joined = texts.join(" ").toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) if (joined.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (joined.includes(w)) score -= 1;
  return score;
}

function sentimentLabel(score) {
  if (score >= 2) return "positivo";
  if (score <= -2) return "negativo";
  return "neutral";
}

function valuationLabel(pe) {
  if (pe === null || pe === undefined || pe <= 0) return "no disponible";
  if (pe < 10) return "atractiva (múltiplo bajo)";
  if (pe <= 20) return "razonable";
  if (pe <= 35) return "exigente";
  return "elevada (múltiplo alto)";
}

function buildCoinAnalysis(quote, profile, candles, news) {
  const closes = candles.map((c) => c.close);
  const ma7 = sma(closes, 7);
  const ma25 = sma(closes, 25);
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const price = quote.price;

  const high52 = quote.fiftyTwoWeekHigh;
  const low52 = quote.fiftyTwoWeekLow;
  const rangePos =
    high52 && low52 && high52 > low52
      ? ((price - low52) / (high52 - low52)) * 100
      : null;

  let score = 0;
  if (ma50 && price > ma50) score += 1;
  if (ma50 && price < ma50) score -= 1;
  if (ma200 && price > ma200) score += 1;
  if (ma200 && price < ma200) score -= 1;
  if (ma25 && ma50 && ma25 > ma50) score += 1;
  if (ma25 && ma50 && ma25 < ma50) score -= 1;
  if (quote.changePercent > 1) score += 0.5;
  if (quote.changePercent < -1) score -= 0.5;

  const trend = trendLabel(Math.round(score));

  const headlines = news.slice(0, 12).map((n) => `${n.title} ${n.excerpt}`);
  const sentScore = scoreSentiment(headlines);
  const sentiment = sentimentLabel(sentScore);

  const currency = quote.currency || "MXN";
  const fmt = (v) => (v === null || v === undefined ? "N/D" : v.toFixed(2));

  const paragraphs = [
    `En la sesión más reciente, ${quote.name} (${quote.symbol}) cotiza en ${fmt(
      price
    )} ${currency}, con una variación diaria de ${fmt(
      quote.changePercent
    )}%. El rango de 52 semanas va de ${fmt(low52)} a ${fmt(high52)}${
      rangePos !== null
        ? `, ubicando el precio en el ${rangePos.toFixed(0)}% de ese rango`
        : ""
    }.`,
    `El panorama técnico es ${trend}. El precio ${
      ma50
        ? `se encuentra ${price > ma50 ? "por encima" : "por debajo"} de su media móvil de 50 sesiones (${fmt(ma50)})`
        : "no cuenta con suficientes datos para su media de 50 sesiones"
    }${
      ma200
        ? ` y ${price > ma200 ? "por encima" : "por debajo"} de la de 200 sesiones (${fmt(ma200)})`
        : ""
    }${
      rsi14 !== null
        ? `. El RSI(14) se sitúa en ${rsi14.toFixed(1)} (${
            rsi14 > 70
              ? "zona de sobrecompra"
              : rsi14 < 30
              ? "zona de sobreventa"
              : "zona neutral"
          })`
        : ""
    }.`,
    `En cuanto a valoración, el múltiplo precio/utilidad (P/U o P/E) ${
      quote.pe ? `es de ${fmt(quote.pe)}, una valoración ${valuationLabel(quote.pe)}` : "no está disponible"
    }${
      profile && profile.sector ? `. La empresa opera en el sector ${profile.sector}` : ""
    }. El tono de las noticias recientes es ${sentiment}.`,
    `Esto no constituye asesoría financiera. Realiza tu propio análisis (DYOR) y considera tu perfil de riesgo antes de invertir.`,
  ];

  return {
    symbol: quote.symbol,
    name: quote.name,
    generatedAt: new Date().toISOString(),
    trend,
    sentiment,
    score,
    indicators: {
      price,
      currency,
      changePercent: quote.changePercent,
      ma7: ma7 ? Number(ma7.toFixed(2)) : null,
      ma25: ma25 ? Number(ma25.toFixed(2)) : null,
      ma50: ma50 ? Number(ma50.toFixed(2)) : null,
      ma200: ma200 ? Number(ma200.toFixed(2)) : null,
      rsi14: rsi14 !== null ? Number(rsi14.toFixed(1)) : null,
      high52,
      low52,
      rangePosition: rangePos !== null ? Number(rangePos.toFixed(1)) : null,
      pe: quote.pe,
      valuation: valuationLabel(quote.pe),
    },
    paragraphs,
    disclaimer: "Esto no constituye asesoría financiera. DYOR.",
  };
}

export async function generateAnalysis(symbol) {
  return getOrFetch(`analysis:${symbol}`, config.cache.analysis, async () => {
    // `quote` se resuelve primero: su nombre alimenta el filtro de noticias.
    const quote = await getQuote(symbol);
    const [history, profile, news] = await Promise.all([
      getHistory(symbol, "1y"),
      getProfile(symbol).catch(() => null),
      getNews(quote.name || symbol).catch(() => []),
    ]);
    return buildCoinAnalysis(quote, profile, history.candles, news);
  });
}

export async function getCachedAnalysis(symbol) {
  const { default: cache } = await import("./cache.service.js");
  return cache.get(`analysis:${symbol}`) || null;
}

export async function generateMarketAnalysis() {
  return getOrFetch("analysis:market", config.cache.analysis, async () => {
    const { getGlobalIndices } = await import("./yahoo.service.js");
    const indices = await getGlobalIndices();
    const ipc = indices.find((i) => i.symbol === "^MXX");
    const sp = indices.find((i) => i.symbol === "^GSPC");
    const vix = indices.find((i) => i.symbol === "^VIX");
    const fx = indices.find((i) => i.symbol === "MXN=X");

    const mood =
      (vix && vix.price && vix.price > 25) || (sp && sp.changePercent < -1)
        ? "de aversión al riesgo"
        : sp && sp.changePercent > 0.5
        ? "positivo"
        : "mixto";

    const fmt = (v) => (v === null || v === undefined ? "N/D" : v.toFixed(2));

    const paragraphs = [
      `El IPC mexicano cotiza en ${fmt(ipc?.price)} puntos (${fmt(
        ipc?.changePercent
      )}%), mientras que el S&P 500 se ubica en ${fmt(
        sp?.price
      )} (${fmt(sp?.changePercent)}%). El tipo de cambio USD/MXN es de ${fmt(
        fx?.price
      )}.`,
      `El nivel del VIX (${fmt(vix?.price)}) y el desempeño de los índices sugieren un apetito de mercado ${mood}.`,
      `Esto no constituye asesoría financiera. Realiza tu propio análisis (DYOR).`,
    ];

    return {
      generatedAt: new Date().toISOString(),
      mood,
      indices,
      paragraphs,
      disclaimer: "Esto no constituye asesoría financiera. DYOR.",
    };
  });
}

export async function getCachedMarketAnalysis() {
  const { default: cache } = await import("./cache.service.js");
  return cache.get("analysis:market") || null;
}
