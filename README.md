# TradInc

Dashboard de análisis bursátil: acciones de la BMV + mercados globales, con datos en
tiempo casi real de **Yahoo Finance** y noticias financieras por RSS.

## Estructura

| Carpeta     | Descripción                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- |
| `backend/`  | API Express: cotizaciones, histórico, perfil, búsqueda, noticias y análisis técnico (`:4000`)   |
| `frontend/` | Dashboard React + Vite: watchlist, gráfica, análisis y noticias (`:5173`)                       |

## Requisitos

- Node.js 18 o superior
- Conexión a internet (el backend consulta Yahoo Finance y feeds RSS)

## Puesta en marcha

```bash
npm run install:all   # instala dependencias de raíz, backend y frontend
npm run dev           # arranca backend (:4000) y frontend (:5173) en paralelo
```

Luego abre <http://localhost:5173>.

También puedes levantar cada parte por separado:

```bash
npm run dev:backend
npm run dev:frontend
```

## Endpoints principales

- `GET /api/health` — estado y estadísticas de caché
- `GET /api/market/top?symbols=WALMEX.MX,...` — cotizaciones (watchlist por defecto si no se envía)
- `GET /api/market/global` — IPC, S&P 500, Nasdaq, VIX y USD/MXN
- `GET /api/market/search?q=...` — búsqueda de símbolos
- `GET /api/market/:symbol` · `/history?range=1mo` · `/profile` — ficha e histórico
- `GET /api/news?symbol=...` — noticias RSS (filtrables por empresa)
- `GET|POST /api/analysis/:symbol` y `/api/analysis/market` — análisis técnico (GET lee caché, POST genera)

## Configuración

| Variable       | Dónde              | Descripción                                                                  |
| -------------- | ------------------ | ---------------------------------------------------------------------------- |
| `PORT`         | backend            | Puerto de la API (por defecto `4000`)                                          |
| `CORS_ORIGINS` | backend            | Orígenes permitidos, separados por coma. Vacío = cualquier origen               |
| `VITE_API_URL` | frontend (build)   | URL del backend en producción. Vacío = mismo origen (en dev Vite hace proxy)   |

Copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a
`frontend/.env` si necesitas ajustarlas en local. Los `.env` nunca se versionan.

## Despliegue

El frontend va a **Netlify** y el backend a **Render**; cada uno tiene su archivo
de configuración en la raíz.

### Backend (Render)

`render.yaml` define el servicio (`rootDir: backend`, health check en
`/api/health`). Tras crear el Blueprint, define en el dashboard de Render:

- `CORS_ORIGINS` = la URL pública de Netlify (p. ej. `https://tradinc.netlify.app`)

### Frontend (Netlify)

`netlify.toml` define el build (`base: frontend`, `publish: dist`) y el redirect
de SPA. En las variables de entorno del sitio define:

- `VITE_API_URL` = la URL pública de Render (p. ej. `https://tradinc-api.onrender.com`)

> En el plan gratuito de Render el servicio se duerme por inactividad: la primera
> petición tras un rato puede tardar unos segundos en responder.

## Aviso

Los datos tienen demoras y pueden ser incorrectos. Nada de esto constituye
asesoría financiera.
