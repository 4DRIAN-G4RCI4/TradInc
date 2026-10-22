import { Router } from "express";
import {
  generateAnalysis,
  getCachedAnalysis,
  generateMarketAnalysis,
  getCachedMarketAnalysis,
} from "../services/analysis.service.js";

const router = Router();

router.get("/market", async (req, res, next) => {
  try {
    res.json(await getCachedMarketAnalysis());
  } catch (err) {
    next(err);
  }
});

router.post("/market", async (req, res, next) => {
  try {
    res.json(await generateMarketAnalysis());
  } catch (err) {
    next(err);
  }
});

router.get("/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    res.json(await getCachedAnalysis(symbol));
  } catch (err) {
    next(err);
  }
});

router.post("/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    res.json(await generateAnalysis(symbol));
  } catch (err) {
    next(err);
  }
});

export default router;
