import type { Layout, Role } from "../anatomy/layout";
import type { Cell } from "../anatomy/projections";

interface Props {
  layout: Layout;
  pre: Cell | null;
  post: Cell | null;
}

/**
 * Overlay layer: a small filled circle at every endpoint of the selected
 * presynaptic / postsynaptic cell. Rendered inside the diagram's SVG so it
 * shares the layout's coordinate space; ignores the pointer so the anatomy
 * underneath stays interactive.
 */
export function EndpointMarkers({ layout, pre, post }: Props) {
  return (
    <g className="endpoint-layer" pointerEvents="none">
      <Markers layout={layout} cell={pre} role="pre" />
      <Markers layout={layout} cell={post} role="post" />
    </g>
  );
}

function Markers({ layout, cell, role }: { layout: Layout; cell: Cell | null; role: Role }) {
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
