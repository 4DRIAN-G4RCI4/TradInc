import { Router } from "express";
import { getNews } from "../services/news.service.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = (req.query.symbol || req.query.q || "").toString().slice(0, 60).trim();
    res.json(await getNews(filter || null));
  } catch (err) {
    next(err);
  }
});

export default router;
