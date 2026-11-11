import { buildArbor } from "../anatomy/arbors";
import type { Layout, Role } from "../anatomy/layout";
import type { Cell } from "../anatomy/projections";

interface Props {
  layout: Layout;
  pre: Cell | null;
  post: Cell | null;
}

/**
 * Overlay layer for the selected presynaptic / postsynaptic cell: schematic
 * lines connecting the cell's endpoints, with a small filled circle at each
 * endpoint on top. Rendered inside the diagram's SVG so it shares the layout's
 * coordinate space; ignores the pointer so the anatomy underneath stays
 * interactive.
 */
export function EndpointMarkers({ layout, pre, post }: Props) {
  return (
    <g className="endpoint-layer" pointerEvents="none">
      <Lines layout={layout} cell={pre} role="pre" />
      <Lines layout={layout} cell={post} role="post" />
      <Dots layout={layout} cell={pre} role="pre" />
      <Dots layout={layout} cell={post} role="post" />
    </g>
  );
}

function Lines({ layout, cell, role }: { layout: Layout; cell: Cell | null; role: Role }) {
  if (!cell) return null;
  const paths = buildArbor(layout, cell, role);
  return (
    <g className={`arbor ${role}`}>
      {/* Dark halo first so the line stays legible over the coloured cells. */}
      {paths.map((d, i) => (
        <path key={`h${i}`} className="arbor-halo" d={d} />
      ))}
      {paths.map((d, i) => (
        <path key={`l${i}`} className="arbor-line" d={d} />
      ))}
    </g>
  );
}

function Dots({ layout, cell, role }: { layout: Layout; cell: Cell | null; role: Role }) {
  if (!cell) return null;
  const ids = [...cell.subunits.PB, ...cell.subunits.EB];
  return (
    <g className={`endpoints ${role}`}>
      {ids.map((id) => {
        const p = layout.subunitIndex.get(id)?.endpoints[role];
        return p ? <circle key={id} className="endpoint" cx={p.x} cy={p.y} r={4.5} /> : null;
      })}
    </g>
  );
}
