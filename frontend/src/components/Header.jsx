import { SearchBar } from "./SearchBar.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function Header({ onPickSymbol, onRefresh, refreshing, lastUpdated }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          T
        </span>
        <h1>
          TradInc{" "}
          <span className="brand__tag">· análisis bursátil</span>
        </h1>
      </div>

      <SearchBar onPick={onPickSymbol} />

      <span className="header__spacer" />

      {lastUpdated && (
        <span className="header__status num" aria-live="polite">
          Actualizado {lastUpdated}
        </span>
      )}
      <button
        type="button"
        className="btn"
        onClick={onRefresh}
        disabled={refreshing}
      >
        {refreshing ? "Actualizando…" : "Actualizar"}
      </button>

      <ThemeToggle />
    </header>
  );
}
