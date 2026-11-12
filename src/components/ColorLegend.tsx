import type { Layout } from "../anatomy/layout";

const ENTRIES = [
  { className: "pre", label: "Presynaptic (output kernel)" },
  { className: "overlap", label: "Overlap (min of both)" },
  { className: "post", label: "Postsynaptic (input kernel)" },
] as const;

const PAD = 10;
const ROW = 20;
const SWATCH = 12;
const WIDTH = 188;
const MARGIN = 14;
const HEIGHT = PAD * 2 + ENTRIES.length * ROW + 16;

/** Static key for the band colors, anchored to the bottom-left corner of the diagram. */
export function ColorLegend({ layout }: { layout: Layout }) {
  const x = MARGIN;
  const y = layout.height - MARGIN - HEIGHT;
  return (
    <g className="color-legend" transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect className="legend-box" width={WIDTH} height={HEIGHT} rx={6} />
      {ENTRIES.map((e, i) => (
        <g key={e.className} transform={`translate(${PAD} ${PAD + i * ROW})`}>
          <rect className={`legend-swatch ${e.className}`} width={SWATCH} height={SWATCH} rx={2} y={2} />
          <text className="legend-label" x={SWATCH + 8} y={SWATCH}>
            {e.label}
          </text>
        </g>
      ))}
      <text className="legend-note" x={PAD} y={HEIGHT - PAD + 2}>
        Intensity = relative arborization
      </text>
    </g>
  );
}
