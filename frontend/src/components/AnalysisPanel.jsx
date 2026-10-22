import { useCallback, useEffect, useState } from "react";
import { analysisApi } from "../api/client.js";
import { formatNumber, formatPercent } from "../utils/format.js";
import { ErrorState, Skeleton } from "./ui.jsx";

function Cell({ label, value }) {
  return (
    <div className="analysis__cell">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const TREND_TONE = {
  "fuertemente alcista": "up",
  alcista: "up",
  "lateral / neutral": "flat",
  bajista: "down",
  "fuertemente bajista": "down",
};

const SENTIMENT_TONE = { positivo: "up", neutral: "flat", negativo: "down" };

/**
 * Análisis técnico de una empresa. El backend cachea el resultado:
 * GET devuelve null si aún no se ha generado; POST lo genera.
 */
export function AnalysisPanel({ symbol, name }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    analysisApi
      .symbol(symbol)
      .then((result) => setData(result))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  function generate() {
    setGenerating(true);
    setError(null);
    analysisApi
      .generateSymbol(symbol)
      .then((result) => setData(result))
      .catch((err) => setError(err))
      .finally(() => setGenerating(false));
  }

  if (loading && !data) {
    return (
      <div className="panel__body" aria-busy="true">
        <Skeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo cargar el análisis"
        message={error.message}
        onRetry={load}
      />
    );
  }

  return (
    <div className="panel__body">
      <div className="analysis__head">
        <h3 className="panel__title">Análisis técnico</h3>
        <button
          type="button"
          className="btn btn--primary"
          onClick={generate}
          disabled={generating}
        >
          {generating
            ? "Generando…"
            : data
            ? "Regenerar análisis"
            : "Generar análisis"}
        </button>
      </div>

      {data ? (
        <>
          <div className="analysis__badges">
            <span className={`badge badge--${TREND_TONE[data.trend] || "flat"}`}>
              Tendencia: {data.trend}
            </span>
            <span
              className={`badge badge--${SENTIMENT_TONE[data.sentiment] || "flat"}`}
            >
              Noticias: {data.sentiment}
            </span>
          </div>

          <dl className="analysis__grid">
            <Cell label="Precio" value={formatNumber(data.indicators.price)} />
            <Cell
              label="Var. día"
              value={formatPercent(data.indicators.changePercent)}
            />
            <Cell label="RSI (14)" value={formatNumber(data.indicators.rsi14, 1)} />
            <Cell label="MA 50" value={formatNumber(data.indicators.ma50)} />
            <Cell label="MA 200" value={formatNumber(data.indicators.ma200)} />
            <Cell
              label="Posición 52s"
              value={
                data.indicators.rangePosition === null
                  ? "—"
                  : `${data.indicators.rangePosition}%`
              }
            />
            <Cell label="P/U" value={formatNumber(data.indicators.pe)} />
            <Cell label="Valoración" value={data.indicators.valuation} />
          </dl>

          <div className="analysis__text">
            {data.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="analysis__footer">
            <span>
              Generado {new Date(data.generatedAt).toLocaleString("es-MX")}
            </span>
          </div>
        </>
      ) : (
        <p className="analysis__text">
          Aún no hay análisis para {name}. Genera uno con indicadores técnicos
          (MA 7/25/50/200 y RSI) más el tono de las noticias recientes.
        </p>
      )}

      <p className="analysis__disclaimer">
        {data?.disclaimer || "Esto no constituye asesoría financiera. DYOR."}
      </p>
    </div>
  );
}
