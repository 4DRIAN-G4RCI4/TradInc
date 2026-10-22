import { useApi } from "../hooks/useApi.js";
import { newsApi } from "../api/client.js";
import { timeAgo } from "../utils/format.js";
import { EmptyState, ErrorState, Skeleton } from "./ui.jsx";

/** Noticias financieras; puede filtrarse por el nombre de la empresa seleccionada. */
export function NewsFeed({ filter, onClearFilter, refreshTick }) {
  const { data, loading, error, reload } = useApi(
    () => newsApi.list(filter),
    [filter, refreshTick]
  );

  const items = data ?? [];

  return (
    <section className="panel">
      <header className="panel__header">
        <h2 className="panel__title">Noticias</h2>
        {filter && (
          <span className="news__filter">
            Filtrando por “{filter}”
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={onClearFilter}
              aria-label="Quitar filtro de noticias"
            >
              ✕
            </button>
          </span>
        )}
      </header>

      <div className="panel__body panel__body--flush" aria-busy={loading || undefined}>
        {error && (
          <ErrorState
            title="No se pudieron cargar las noticias"
            message={error.message}
            onRetry={reload}
          />
        )}

        {loading && items.length === 0 && !error && (
          <div className="panel__body" aria-hidden="true">
            <Skeleton />
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <EmptyState
            title="Sin noticias"
            message={
              filter
                ? `No hay noticias recientes que mencionen “${filter}”.`
                : "No hay noticias disponibles en este momento."
            }
          />
        )}

        {items.length > 0 && (
          <ul className="news">
            {items.map((item, index) => (
              <li className="news__item" key={`${item.link}-${index}`}>
                {item.image && (
                  <img
                    className="news__thumb"
                    src={item.image}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.remove();
                    }}
                  />
                )}
                <div className="news__body">
                  <h3 className="news__title">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>
                  <p className="news__meta">
                    {item.source}
                    {item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ""}
                  </p>
                  {item.excerpt && <p className="news__excerpt">{item.excerpt}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
