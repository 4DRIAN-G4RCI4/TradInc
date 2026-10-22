import { useCallback, useEffect, useState } from "react";

/**
 * Hook genérico de obtención de datos.
 * `deps` controla cuándo se reconsulta; `reload()` fuerza una nueva consulta.
 */
export function useApi(fetcher, deps, { enabled = true } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({ data: prev.data, loading: false, error }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt, enabled]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}

/** Devuelve el valor retrasado para patrones de búsqueda con debounce. */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
