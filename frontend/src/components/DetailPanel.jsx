import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi.js";
import { marketApi } from "../api/client.js";
import {
  directionOf,
  formatCompact,
  formatNumber,
  formatPercent,
  formatPrice,
} from "../utils/format.js";
import { ChangeBadge, ErrorState, Skeleton } from "./ui.jsx";
import { StockChart } from "./StockChart.jsx";
import { AnalysisPanel } from "./AnalysisPanel.jsx";

function Stat({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="panel__body" aria-hidden="true">
      <Skeleton />
    </div>
  );
}

/** Ficha completa de una empresa: precio, gráfica, estadísticas y análisis. */
export function DetailPanel({ symbol, refreshTick }) {
  const [range, setRange] = useState("1mo");
  useEffect(() => {
    setRange("1mo");
  }, [symbol]);

  const quote = useApi(() => marketApi.quote(symbol), [symbol, refreshTick]);
  const history = useApi(() => marketApi.history(symbol, range), [symbol, range]);
  const profile = useApi(() => marketApi.profile(symbol), [symbol]);

  if (quote.loading && !quote.data) {
    return (
      <section className="panel" aria-busy="true">
        <DetailSkeleton />
      </section>
    );
  }

  if (quote.error && !quote.data) {
    return (
      <section className="panel">
        <ErrorState
          title={`No se pudo cargar ${symbol}`}
          message={quote.error.message}
          onRetry={quote.reload}
        />
      </section>
    );
  }

  const data = quote.data;
  if (!data) return null;
  const direction = directionOf(data.changePercent);

  const range52Position =
    data.fiftyTwoWeekHigh && data.fiftyTwoWeekLow && data.fiftyTwoWeekHigh > data.fiftyTwoWeekLow
      ? ((data.price - data.fiftyTwoWeekLow) / (data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow)) * 100
      : null;

  return (
    <section className="panel" aria-busy={quote.loading || undefined}>
      <div className="quote-header">
        <div>
          <h2>{data.name}</h2>
          <p className="quote-header__meta">
            {data.symbol}
            {data.exchange ? ` · ${data.exchange}` : ""}
          </p>
        </div>
        <div>
          <p className="quote-header__price">{formatPrice(data.price, data.currency)}</p>
          <p className="quote-header__change">
            <ChangeBadge
              direction={direction}
              text={formatPercent(data.changePercent)}
              large
            />
            <span className="quote-header__absolute num">
              {data.change !== null && data.change > 0 ? "+" : ""}
              {formatNumber(data.change)} {data.currency}
            </span>
          </p>
        </div>
      </div>

      {range52Position !== null && (
        <div className="range52">
          <div className="range52__track">
            <span
              className="range52__marker"
              style={{ left: `${Math.min(100, Math.max(0, range52Position))}%` }}
              title={`Posición en el rango de 52 semanas: ${range52Position.toFixed(0)}%`}
            />
          </div>
          <div className="range52__labels">
            <span>Mín. 52s {formatPrice(data.fiftyTwoWeekLow, data.currency)}</span>
            <span>Máx. 52s {formatPrice(data.fiftyTwoWeekHigh, data.currency)}</span>
          </div>
        </div>
      )}

      {history.error ? (
        <ErrorState
          title="Sin histórico disponible"
          message={history.error.message}
          onRetry={history.reload}
        />
      ) : (
        <StockChart
          history={history.data}
          currency={data.currency}
          range={range}
          onRangeChange={setRange}
        />
      )}

      <dl className="stats">
        <Stat label="Apertura" value={formatPrice(data.open, data.currency)} />
        <Stat label="Mín. día" value={formatPrice(data.dayLow, data.currency)} />
        <Stat label="Máx. día" value={formatPrice(data.dayHigh, data.currency)} />
        <Stat label="Cierre ant." value={formatPrice(data.previousClose, data.currency)} />
        <Stat label="Volumen" value={formatCompact(data.volume)} />
        <Stat label="Cap. mercado" value={formatCompact(data.marketCap)} />
        <Stat label="P/U" value={formatNumber(data.pe)} />
        <Stat label="EPS" value={formatNumber(data.eps)} />
        <Stat
          label="Var. 52 sem."
          value={
            data.yearChangePercent === null
              ? "—"
              : formatPercent(data.yearChangePercent)
          }
        />
        <Stat
          label="Rend. dividendo"
          value={
            data.dividendYield === null || data.dividendYield === undefined
              ? "—"
              : `${(data.dividendYield * 100).toFixed(2)}%`
          }
        />
      </dl>

      {profile.data && (profile.data.summary || profile.data.sector) && (
        <details className="profile">
          <summary>Acerca de {data.name}</summary>
          <div className="profile__chips">
            {profile.data.sector && <span className="chip">{profile.data.sector}</span>}
            {profile.data.industry && <span className="chip">{profile.data.industry}</span>}
            {profile.data.employees && (
              <span className="chip">
                {formatCompact(profile.data.employees)} empleados
              </span>
            )}
            {profile.data.beta !== null && profile.data.beta !== undefined && (
              <span className="chip">Beta {formatNumber(profile.data.beta)}</span>
            )}
          </div>
          {profile.data.summary && (
            <p className="profile__summary">{profile.data.summary}</p>
          )}
        </details>
      )}

      <AnalysisPanel symbol={symbol} name={data.name} />
    </section>
  );
}
