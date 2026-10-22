import { useCallback, useEffect, useState } from "react";
import { analysisApi } from "../api/client.js";
import { ErrorState, Skeleton } from "./ui.jsx";

/** Resumen general del mercado (IPC, S&P 500, VIX, USD/MXN). */
export function MarketAnalysisCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    analysisApi
      .market()
      .then((result) => setData(result))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function generate() {
    setGenerating(true);
    setError(null);
    analysisApi
      .generateMarket()
      .then((result) => setData(result))
      .catch((err) => setError(err))
      .finally(() => setGenerating(false));
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <h2 className="panel__title">Resumen del mercado</h2>
        <button
          type="button"
          className="btn"
          onClick={generate}
          disabled={generating}
        >
          {generating ? "Generando…" : data ? "Regenerar" : "Generar"}
        </button>
      </header>

      <div className="panel__body market-card__text" aria-busy={loading || undefined}>
        {error && !data && (
          <ErrorState
            title="No se pudo cargar el resumen"
            message={error.message}
            onRetry={load}
          />
        )}

        {!error && loading && !data && <Skeleton />}

        {data && (
          <>
            <div className="analysis__badges">
              <span className="badge badge--neutral">
                Apetito: {data.mood}
              </span>
            </div>
            {data.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </>
        )}

        {!error && !loading && !data && (
          <p>
            Genera un resumen con el estado del IPC, S&amp;P 500, VIX y el tipo
            de cambio.
          </p>
        )}
      </div>
    </section>
  );
}
