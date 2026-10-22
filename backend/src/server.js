import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { getStats } from "./services/cache.service.js";
import marketRoutes from "./routes/market.routes.js";
import newsRoutes from "./routes/news.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// CORS: si no hay orígenes configurados, se permite cualquier origen.
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "32kb" }));

// Cabeceras de seguridad.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
  next();
});

// Rate limit global.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: "Demasiadas solicitudes", code: "RATE_LIMITED" } },
  })
);

// Rate limit estricto para búsqueda y análisis.
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Demasiadas solicitudes", code: "RATE_LIMITED" } },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", cache: getStats() });
});

app.use("/api/market/search", strictLimiter);
app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);

app.get("/api/analysis/market", strictLimiter);
app.use("/api/analysis", strictLimiter, analysisRoutes);

// 404 JSON.
app.use((req, res) => {
  res.status(404).json({ error: { message: "Recurso no encontrado", code: "NOT_FOUND" } });
});

// Manejador de errores central.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? "INTERNAL_ERROR" : "ERROR");
  const message =
    status === 500 ? "Error interno del servidor" : err.message;
  if (status === 500) console.error("[error]", err);
  res.status(status).json({ error: { message, code } });
});

app.listen(config.port, () => {
  console.log(`TradInc backend escuchando en http://localhost:${config.port}`);
});
