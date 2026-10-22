/** Piezas de UI compartidas: estados, badges y paneles. */

export function Skeleton({ className = "" }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Panel({ title, actions, children, flush = false, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel__header">
          <h2 className="panel__title">{title}</h2>
          {actions}
        </header>
      )}
      <div className={`panel__body ${flush ? "panel__body--flush" : ""}`}>
        {children}
      </div>
    </section>
  );
}

export function ErrorState({ title = "Algo salió mal", message, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      {message && <p className="state__message">{message}</p>}
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state" role="status">
      <p className="state__title">{title}</p>
      {message && <p className="state__message">{message}</p>}
      {action}
    </div>
  );
}

const ARROWS = { up: "▲", down: "▼", flat: "■" };

/** Incluye flecha y signo: el color no es el único indicador (accesibilidad). */
export function ChangeBadge({ direction, text, large = false }) {
  return (
    <span className={`badge badge--${direction} ${large ? "badge--lg" : ""}`}>
      <span aria-hidden="true">{ARROWS[direction]}</span>
      {text}
    </span>
  );
}
