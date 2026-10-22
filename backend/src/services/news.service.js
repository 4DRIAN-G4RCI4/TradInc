import Parser from "rss-parser";
import { getOrFetch } from "./cache.service.js";
import { config, NEWS_FEEDS } from "../config.js";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; TradInc/1.0)" },
});

function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  const html = item["content:encoded"] || item.content || item.summary || "";
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (match) return match[1];
  if (item.media && item.media.$ && item.media.$.url) return item.media.$.url;
  return null;
}

function excerpt(text = "") {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

async function fetchFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => ({
      title: item.title || "Sin título",
      link: item.link || "",
      source: feed.title || new URL(url).hostname,
      publishedAt: item.isoDate || item.pubDate || null,
      excerpt: excerpt(item.contentSnippet || item.content || item.summary || ""),
      image: extractImage(item),
    }));
  } catch {
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = (item.title || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Sufijos societarios y ruido que no aportan al emparejamiento de noticias.
const COMPANY_STOPWORDS = new Set([
  "sab", "sa", "s", "a", "b", "de", "cv", "c", "v", "sa de cv", "sab de cv",
  "grupo", "gpo", "corp", "corporacion", "corporación", "company", "co",
  "inc", "ltd", "plc", "holding", "holdings", "the", "del", "la", "el",
  // Geográficos y genéricos: por sí solos traen noticias no relacionadas.
  "mexico", "mexicano", "mexicana", "nacional", "internacional", "global",
  "financiero", "banco", "bank", "industrias", "industrial", "comercial",
]);

// Términos demasiado comunes para filtrar por sí solos: solo cuentan
// si la noticia también menciona otro término de la empresa.
const WEAK_TERMS = new Set(["america", "continental", "puerto", "sureste", "pacifico"]);

/** Quita acentos para comparar "México" con "Mexico". */
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Convierte "WAL-MART DE MEXICO SAB DE CV" en términos útiles
 * (["wal-mart", "walmart", "mexico"]) para buscar en los titulares.
 */
function buildSearchTerms(filter) {
  const normalized = normalizeText(filter.trim());
  if (!normalized) return [];

  // El símbolo bursátil (WALMEX.MX) se reduce a su raíz: "walmex".
  const asTicker = normalized.split(".")[0];

  const words = normalized
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 3 && !COMPANY_STOPWORDS.has(w));

  const terms = new Set(words);
  // "wal-mart" también debe encontrar "walmart".
  for (const w of words) {
    if (w.includes("-")) terms.add(w.replace(/-/g, ""));
  }
  if (asTicker.length >= 3 && !COMPANY_STOPWORDS.has(asTicker)) {
    terms.add(asTicker);
  }
  return [...terms];
}

export async function getNews(coinFilter = null) {
  const all = await getOrFetch("news:all", config.cache.news, async () => {
    const batches = await Promise.all(NEWS_FEEDS.map(fetchFeed));
    const merged = batches.flat();
    merged.sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return db - da;
    });
    return dedupe(merged).slice(0, 60);
  });

  if (!coinFilter) return all.slice(0, 30);

  const terms = buildSearchTerms(coinFilter);
  if (terms.length === 0) return all.slice(0, 30);

  const strong = terms.filter((t) => !WEAK_TERMS.has(t));
  const weak = terms.filter((t) => WEAK_TERMS.has(t));

  const filtered = all.filter((item) => {
    const haystack = normalizeText(`${item.title} ${item.excerpt}`);
    if (strong.some((term) => haystack.includes(term))) return true;
    // Sin términos fuertes, exigimos al menos dos débiles coincidiendo
    // (p. ej. "América" + "Móvil") para evitar falsos positivos.
    if (strong.length === 0 && weak.length >= 2) {
      return weak.filter((term) => haystack.includes(term)).length >= 2;
    }
    return false;
  });
  return filtered.slice(0, 30);
}
