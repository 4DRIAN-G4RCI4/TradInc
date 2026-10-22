import NodeCache from "node-cache";

const cache = new NodeCache({ checkperiod: 60, useClones: false, stdTTL: 300 });

// Dedupe de peticiones concurrentes idénticas.
const inFlight = new Map();

/**
 * Devuelve el valor cacheado o ejecuta `fn` y lo guarda.
 * Las peticiones concurrentes con la misma clave comparten una sola promesa.
 */
export async function getOrFetch(key, ttl, fn) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const value = await fn();
      cache.set(key, value, ttl);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function getStats() {
  return cache.getStats();
}

export default cache;
