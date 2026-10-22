import { Router } from "express";
import {
  getQuotes,
  getQuote,
  getHistory,
  getProfile,
  searchSymbols,
  getGlobalIndices,
  RANGE_KEYS,
} from "../services/yahoo.service.js";
import { DEFAULT_SYMBOLS } from "../config.js";
import { clampNumber } from "../utils/formatters.js";

const router = Router();

router.get("/top", async (req, res, next) => {
  try {
    const raw = (req.query.symbols || "").toString();
    const symbols = raw
      ? raw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 30)
      : DEFAULT_SYMBOLS;
    const quotes = await getQuotes(symbols);
    res.json(quotes);
  } catch (err) {
    next(err);
  }
});

router.get("/global", async (req, res, next) => {
  try {
    res.json(await getGlobalIndices());
  } catch (err) {
    next(err);
  }
});

router.get("/symbols", (req, res) => {
  res.json(DEFAULT_SYMBOLS);
});

router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().slice(0, 60).trim();
    if (!q) return res.json([]);
    res.json(await searchSymbols(q));
  } catch (err) {
    next(err);
  }
});

router.get("/:symbol/history", async (req, res, next) => {
  try {
    const range = (req.query.range || "1mo").toString();
    if (!RANGE_KEYS.includes(range)) {
      return res
        .status(400)
        .json({ error: { message: "Rango inválido", code: "BAD_RANGE" } });
    }
    const symbol = req.params.symbol.toUpperCase();
    res.json(await getHistory(symbol, range));
  } catch (err) {
    next(err);
  }
});

router.get("/:symbol/profile", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    res.json(await getProfile(symbol));
  } catch (err) {
    next(err);
  }
});

router.get("/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    res.json(await getQuote(symbol));
  } catch (err) {
    next(err);
  }
});

export default router;
