import { useEffect, useMemo, useRef, useState } from 'react';

/** "Nice" axis maximum: 1, 2, 2.5 or 5 × 10^k at or above the data max. */
function niceMax(v) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Single-series column chart (SVG, no chart library).
 * Design rules: one hue, columns ≤ 24px with a 4px rounded top and square
 * baseline, recessive gridlines, values in text colours (never the series colour),
 * hover/focus tooltip with a hit area larger than the mark.
 */
export default function ColumnChart({ data, format = String, height = 220, ariaLabel }) {
  const [wrapRef, width] = useWidth();
  const [active, setActive] = useState(null);

  const pad = { top: 12, right: 8, bottom: 28, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, band * 0.6);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const columnPath = (x, v) => {
    const top = y(v);
    const h = pad.top + innerH - top;
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    const bottom = pad.top + innerH;
    return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${bottom} Z`;
  };

  const tip = active !== null ? data[active] : null;
  const tipX = active !== null ? pad.left + band * active + band / 2 : 0;

  return (
    <div className="chart" ref={wrapRef}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {/* gridlines + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-gridline" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {format(t, true)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = pad.left + band * i + (band - barW) / 2;
          return (
            <g key={d.label + i}>
              <path className={active === i ? 'chart-col active' : 'chart-col'} d={columnPath(x, d.value)} />
              <text className="chart-axis" x={pad.left + band * i + band / 2} y={height - 8} textAnchor="middle">
                {d.label}
              </text>
              {/* hit target: the whole band, keyboard focusable */}
              <rect
                className="chart-hit"
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                tabIndex={0}
                aria-label={`${d.label}: ${format(d.value)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      {tip && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(tipX, 70), width - 70), top: Math.max(0, y(tip.value) - 52) }}
          role="status"
        >
          <span className="muted small">{tip.fullLabel || tip.label}</span>
          <strong>{format(tip.value)}</strong>
          {tip.sub && <span className="muted small">{tip.sub}</span>}
        </div>
      )}
    </div>
  );
}
