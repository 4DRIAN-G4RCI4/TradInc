import { useCallback, useEffect, useMemo, useState } from "react";
import { marketApi } from "./api/client.js";
import { useApi } from "./hooks/useApi.js";
import { Header } from "./components/Header.jsx";
import { TickerBar } from "./components/TickerBar.jsx";
import { Watchlist } from "./components/Watchlist.jsx";
import { DetailPanel } from "./components/DetailPanel.jsx";
import { MarketAnalysisCard } from "./components/MarketAnalysisCard.jsx";
import { NewsFeed } from "./components/NewsFeed.jsx";
import { EmptyState, Panel } from "./components/ui.jsx";

const WATCHLIST_KEY = "tradinc.watchlist";
const SELECTED_KEY = "tradinc.selected";
const REFRESH_INTERVAL_MS = 60_000;

function loadStoredWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [watchlist, setWatchlist] = useState(loadStoredWatchlist);
  const [selected, setSelected] = useState(
    () => localStorage.getItem(SELECTED_KEY) || null
  );
  const [newsFilterOn, setNewsFilterOn] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Símbolos por defecto del backend la primera vez (watchlist sin guardar).
  const defaults = useApi(() => marketApi.symbols(), [], {
    enabled: watchlist === null,
  });
  useEffect(() => {
    if (watchlist === null && defaults.data) setWatchlist(defaults.data);
  }, [defaults.data, watchlist]);

  const symbolsKey = (watchlist ?? []).join(",");
  const quotes = useApi(() => marketApi.top(watchlist), [symbolsKey, refreshTick], {
    enabled: watchlist !== null && watchlist.length > 0,
  });
  const ticker = useApi(() => marketApi.global(), [refreshTick]);

  const refresh = useCallback((silent = false) => {
    if (!silent) {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 1200);
    }
    setRefreshTick((n) => n + 1);
    setLastUpdated(new Date());
  }, []);

  // Actualización automática de cotizaciones cada 60 s.
  useEffect(() => {
    const id = setInterval(() => refresh(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Persistencia de la watchlist y del valor seleccionado.
  useEffect(() => {
    if (watchlist !== null) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist]);
  useEffect(() => {
    if (selected) localStorage.setItem(SELECTED_KEY, selected);
  }, [selected]);

  // Selección inicial: el primer valor de la watchlist.
  useEffect(() => {
    if (!selected && watchlist && watchlist.length > 0) {
      setSelected(watchlist[0]);
    }
  }, [selected, watchlist]);

  // Al cambiar de empresa se restablece el filtro de noticias.
  useEffect(() => {
    setNewsFilterOn(true);
  }, [selected]);

  function handlePick(item) {
    setWatchlist((prev) => {
      const base = prev ?? [];
      return base.includes(item.symbol) ? base : [...base, item.symbol];
    });
    setSelected(item.symbol);
  }

  function handleRemove(symbol) {
    setWatchlist((prev) => (prev ?? []).filter((s) => s !== symbol));
    if (selected === symbol) setSelected(null);
  }

  const quotesBySymbol = useMemo(() => {
    const map = new Map();
    for (const quote of quotes.data ?? []) map.set(quote.symbol, quote);
    return map;
  }, [quotes.data]);

  const rows = useMemo(
    () =>
      (watchlist ?? [])
        .map((symbol) => quotesBySymbol.get(symbol))
        .filter(Boolean),
    [watchlist, quotesBySymbol]
  );

  const selectedQuote = selected ? quotesBySymbol.get(selected) : null;
  const newsFilter =
    selected && newsFilterOn ? selectedQuote?.name ?? null : null;

  return (
    <div className="app">
      <Header
        onPickSymbol={handlePick}
        onRefresh={() => refresh(false)}
        refreshing={refreshing}
        lastUpdated={
          lastUpdated
            ? lastUpdated.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null
        }
      />

      <TickerBar
        indices={ticker.data ?? []}
        loading={ticker.loading}
        error={ticker.error}
      />

      <main className="layout">
        <div className="col">
          <Panel
            title="Watchlist"
            flush
            actions={
              <span className="header__status num">
                {rows.length} {rows.length === 1 ? "valor" : "valores"}
              </span>
            }
          >
            <Watchlist
              quotes={rows}
              loading={quotes.loading}
              error={quotes.error}
              selected={selected}
              onSelect={setSelected}
              onRemove={handleRemove}
              onRetry={quotes.reload}
            />
          </Panel>

          <MarketAnalysisCard />

          <NewsFeed
            filter={newsFilter}
            onClearFilter={() => setNewsFilterOn(false)}
            refreshTick={refreshTick}
          />
        </div>

        <div className="col">
          {selected ? (
            <DetailPanel symbol={selected} refreshTick={refreshTick} />
          ) : (
            <Panel title="Detalle">
              <EmptyState
                title="Selecciona una empresa"
                message="Elige un valor de la watchlist o busca uno nuevo para ver su ficha completa."
              />
            </Panel>
          )}
        </div>
      </main>

      <footer className="footer">
        Datos de Yahoo Finance · Noticias de El Financiero, El Economista y
        Yahoo Finance. Esto no constituye asesoría financiera.
      </footer>
    </div>
  );
}
