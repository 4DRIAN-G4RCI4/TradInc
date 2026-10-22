import { directionOf, formatCompact, formatPercent, formatPrice } from "../utils/format.js";
import { ChangeBadge, EmptyState, ErrorState, Skeleton } from "./ui.jsx";

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td>
        <Skeleton />
      </td>
      <td>
        <Skeleton />
      </td>
      <td>
        <Skeleton />
      </td>
      <td className="col-hide-sm">
        <Skeleton />
      </td>
      <td />
    </tr>
  );
}

/** Tabla de seguimiento de empresas. Las filas se seleccionan con clic o Tab + Enter. */
export function Watchlist({ quotes, loading, error, selected, onSelect, onRemove, onRetry }) {
  if (error && quotes.length === 0) {
    return (
      <ErrorState
        title="No se pudieron cargar las cotizaciones"
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (!loading && quotes.length === 0) {
    return (
      <EmptyState
        title="Watchlist vacía"
        message="Usa el buscador de arriba para agregar empresas a tu lista de seguimiento."
      />
    );
  }

  return (
    <table className="watchlist">
      <caption className="visually-hidden">
        Cotizaciones de tu lista de seguimiento
      </caption>
      <thead>
        <tr>
          <th scope="col">Empresa</th>
          <th scope="col">Precio</th>
          <th scope="col">Var. día</th>
          <th scope="col" className="col-hide-sm">
            Cap. mercado
          </th>
          <th scope="col">
            <span className="visually-hidden">Quitar</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {loading &&
          quotes.length === 0 &&
          Array.from({ length: 8 }, (_, i) => <SkeletonRow key={`sk-${i}`} />)}

        {quotes.map((quote) => {
          const direction = directionOf(quote.changePercent);
          const isSelected = quote.symbol === selected;
          return (
            <tr
              key={quote.symbol}
              className={isSelected ? "is-selected" : undefined}
              onClick={() => onSelect(quote.symbol)}
            >
              <td>
                <button
                  type="button"
                  className="cell-symbol"
                  aria-current={isSelected || undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(quote.symbol);
                  }}
                >
                  {quote.symbol}
                </button>
                <span className="cell-name" title={quote.name}>
                  {quote.name}
                </span>
              </td>
              <td className="cell-price num">
                {formatPrice(quote.price, quote.currency)}
              </td>
              <td>
                <ChangeBadge
                  direction={direction}
                  text={formatPercent(quote.changePercent)}
                />
              </td>
              <td className="col-hide-sm num">{formatCompact(quote.marketCap)}</td>
              <td>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  aria-label={`Quitar ${quote.symbol} de la watchlist`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(quote.symbol);
                  }}
                >
                  ✕
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
