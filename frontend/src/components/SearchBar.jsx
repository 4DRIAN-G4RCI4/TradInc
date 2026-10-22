import { useEffect, useId, useRef, useState } from "react";
import { marketApi } from "../api/client.js";
import { useDebouncedValue } from "../hooks/useApi.js";

/**
 * Buscador de símbolos (combobox con navegación por teclado).
 * onPick recibe { symbol, name, exchange, quoteType }.
 */
export function SearchBar({ onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebouncedValue(query.trim(), 300);
  const containerRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setOpen(false);
      return undefined;
    }
    let cancelled = false;
    marketApi
      .search(debounced)
      .then((items) => {
        if (cancelled) return;
        setResults(items);
        setActiveIndex(-1);
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setActiveIndex(-1);
        setOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Cierra el listado al hacer clic fuera.
  useEffect(() => {
    function handleOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function pick(item) {
    onPick(item);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(results[activeIndex >= 0 ? activeIndex : 0]);
    }
  }

  return (
    <div className="search" ref={containerRef}>
      <label htmlFor="search-input" className="visually-hidden">
        Buscar empresa o símbolo bursátil
      </label>
      <input
        id="search-input"
        className="input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        placeholder="Buscar empresa o símbolo… (ej. WALMEX, Apple)"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul className="search__results" role="listbox" id={listId}>
          {results.length === 0 && (
            <li className="search__hint" role="presentation">
              Sin resultados para “{debounced}”
            </li>
          )}
          {results.map((item, index) => (
            <li
              key={item.symbol}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className="search__option"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(item);
              }}
            >
              <span className="search__symbol">{item.symbol}</span>
              <span className="search__name">{item.name}</span>
              <span className="search__exchange">{item.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
