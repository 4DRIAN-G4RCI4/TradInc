import { directionOf, formatNumber, formatPercent } from "../utils/format.js";
import { ChangeBadge, Skeleton } from "./ui.jsx";

/** Barra de índices globales: IPC, S&P 500, Nasdaq, VIX y USD/MXN. */
export function TickerBar({ indices, loading, error }) {
  return (
    <section className="ticker" aria-label="Índices globales">
      {loading && indices.length === 0 &&
        Array.from({ length: 5 }, (_, i) => (
          <span className="ticker__item" key={i}>
            <Skeleton />
          </span>
        ))}

      {error && indices.length === 0 && (
        <span className="ticker__label">Índices no disponibles</span>
      )}

      {indices.map((item) => {
        const direction = directionOf(item.changePercent);
        return (
          <div className="ticker__item" key={item.symbol}>
            <span className="ticker__label">{item.label}</span>
            <span className="ticker__price num">{formatNumber(item.price)}</span>
            {item.changePercent !== null && (
              <ChangeBadge
                direction={direction}
                text={formatPercent(item.changePercent)}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
