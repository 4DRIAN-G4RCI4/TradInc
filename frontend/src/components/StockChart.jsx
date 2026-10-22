import { useEffect, useMemo, useRef, useState } from "react";
import { formatCandleTime, formatPrice } from "../utils/format.js";

const HEIGHT = 300;
const VOLUME_HEIGHT = 40;
const PAD = { top: 10, right: 60, bottom: 20, left: 4 };

function useElementWidth(fallback = 720) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next) setWidth(Math.max(280, Math.round(next)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Gráfica de línea con histograma de volumen, cruzamiento al pasar el cursor
 * y navegación por teclado (flechas ←/→, Esc para limpiar).
 */
export function StockChart({ history, currency = "MXN", range, onRangeChange }) {
  const [wrapRef, width] = useElementWidth();
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  const candles = history?.candles ?? [];

  const model = useMemo(() => {
    if (candles.length < 2) return null;
    const plotW = Math.max(60, width - PAD.left - PAD.right);
    const plotH = HEIGHT - PAD.top - PAD.bottom - VOLUME_HEIGHT;

    let min = Infinity;
    let max = -Infinity;
    let maxVolume = 0;
    for (const candle of candles) {
      min = Math.min(min, candle.low ?? candle.close);
      max = Math.max(max, candle.high ?? candle.close);
      maxVolume = Math.max(maxVolume, candle.volume || 0);
    }
    const padding = (max - min) * 0.06 || Math.abs(max) * 0.01 || 1;
    min -= padding;
    max += padding;

    const xFor = (i) => PAD.left + (i / (candles.length - 1)) * plotW;
    const yFor = (value) => PAD.top + (1 - (value - min) / (max - min)) * plotH;

    const line = candles
      .map((c, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(c.close).toFixed(1)}`)
      .join(" ");
    const area = `${line} L${xFor(candles.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${PAD.left},${(PAD.top + plotH).toFixed(1)} Z`;

    const gridLines = Array.from({ length: 4 }, (_, i) => {
      const value = min + ((max - min) * (i + 0.5)) / 4;
      return { value, y: yFor(value) };
    });

    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    const color = last >= first ? "var(--up)" : "var(--down)";
    const colorSoft = last >= first ? "var(--up-soft)" : "var(--down-soft)";

    return { plotW, plotH, xFor, yFor, line, area, gridLines, color, colorSoft, maxVolume };
  }, [candles, width]);

  function indexFromClientX(clientX) {
    const svg = svgRef.current;
    if (!svg || !model) return null;
    const rect = svg.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const x = ratio * width - PAD.left;
    const index = Math.round((x / model.plotW) * (candles.length - 1));
    return Math.min(candles.length - 1, Math.max(0, index));
  }

  function handleKeyDown(event) {
    if (candles.length < 2) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setHoverIndex((current) => {
        const base = current === null ? candles.length - 1 : current;
        const delta = event.key === "ArrowRight" ? 1 : -1;
        return Math.min(candles.length - 1, Math.max(0, base + delta));
      });
    } else if (event.key === "Escape") {
      setHoverIndex(null);
    }
  }

  const hovered = hoverIndex !== null ? candles[hoverIndex] : null;
  const totalChange =
    candles.length >= 2
      ? ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100
      : null;

  const ariaLabel = candles.length
    ? `Gráfica de ${history.symbol}, rango ${range}. ${candles.length} puntos, variación del periodo ${totalChange?.toFixed(2)}%. Último cierre ${candles[candles.length - 1].close}. Usa las flechas para inspeccionar valores.`
    : "Gráfica sin datos";

  return (
    <div className="chart">
      <div className="panel__header">
        <h2 className="panel__title">Gráfica</h2>
        <div className="chart__toolbar" role="group" aria-label="Rango de la gráfica">
          {["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"].map((key) => (
            <button
              key={key}
              type="button"
              className="chart__range"
              aria-pressed={range === key}
              onClick={() => onRangeChange(key)}
            >
              {key.replace("mo", "M").replace("y", "A")}
            </button>
          ))}
        </div>
      </div>

      <div className="chart__wrap" ref={wrapRef}>
        <svg
          ref={svgRef}
          className="chart__svg"
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={ariaLabel}
          onPointerMove={(event) => setHoverIndex(indexFromClientX(event.clientX))}
          onPointerLeave={() => setHoverIndex(null)}
          onKeyDown={handleKeyDown}
        >
          {model && (
            <>
              {model.gridLines.map((grid) => (
                <g key={grid.y.toFixed(1)}>
                  <line
                    className="chart__grid"
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={grid.y}
                    y2={grid.y}
                  />
                  <text className="chart__axis-label" x={width - PAD.right + 6} y={grid.y + 3}>
                    {grid.value.toFixed(2)}
                  </text>
                </g>
              ))}

              <path d={model.area} fill={model.colorSoft} />
              <path
                d={model.line}
                fill="none"
                stroke={model.color}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />

              {candles.map((candle, i) => {
                if (!candle.volume || model.maxVolume === 0) return null;
                const barH = (candle.volume / model.maxVolume) * VOLUME_HEIGHT;
                return (
                  <rect
                    key={i}
                    x={model.xFor(i) - 1}
                    y={HEIGHT - PAD.bottom - barH}
                    width={2}
                    height={barH}
                    fill="var(--surface-3)"
                  />
                );
              })}

              {[0, candles.length - 1].map((i) => (
                <text
                  key={`label-${i}`}
                  className="chart__axis-label"
                  x={model.xFor(i)}
                  y={HEIGHT - 4}
                  textAnchor={i === 0 ? "start" : "end"}
                >
                  {formatCandleTime(candles[i].time, range)}
                </text>
              ))}

              {hovered && (
                <g>
                  <line
                    x1={model.xFor(hoverIndex)}
                    x2={model.xFor(hoverIndex)}
                    y1={PAD.top}
                    y2={HEIGHT - PAD.bottom}
                    stroke="var(--border-strong)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={model.xFor(hoverIndex)}
                    cy={model.yFor(hovered.close)}
                    r={3.5}
                    fill={model.color}
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                </g>
              )}
            </>
          )}
        </svg>

        {hovered && model && (
          <div
            className="chart__tooltip"
            style={{
              left: `${Math.min(
                Math.max(model.xFor(hoverIndex) + 12, 8),
                width - 170
              )}px`,
              top: `${Math.max(model.yFor(hovered.close) - 52, 4)}px`,
            }}
          >
            <span className="chart__tooltip-time">
              {formatCandleTime(hovered.time, range)}
            </span>
            {formatPrice(hovered.close, currency)}
            {hovered.volume ? ` · Vol. ${hovered.volume.toLocaleString("es-MX")}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
