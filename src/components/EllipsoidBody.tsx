import type { Layout } from "../anatomy/layout";
import type { Arborization } from "../anatomy/kernels";
import { unitOutlineClass, type SubunitInteraction } from "./interaction";
import { SubunitCells } from "./SubunitCells";

interface Props extends SubunitInteraction {
  eb: Layout["eb"];
  arborization: Arborization;
}

export function EllipsoidBody({ eb, arborization, ...interaction }: Props) {
  const { center, innerRadius } = eb;
  return (
    <g className="eb" aria-label="Ellipsoid body">
      <SubunitCells units={eb.units} interaction={interaction} arborization={arborization} />
      {eb.units.map((u) => (
        <path key={u.id} className={unitOutlineClass(u, interaction)} d={u.outline} />
      ))}
      {eb.units.map((u) => (
        <text
          key={u.id}
          className="unit-label"
          x={u.labelPos.x}
          y={u.labelPos.y}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {u.label}
        </text>
      ))}
      <circle className="eb-canal" cx={center.x} cy={center.y} r={innerRadius - 12} />
      <text className="structure-label" x={eb.labelPos.x} y={eb.labelPos.y} textAnchor="middle">
        Ellipsoid body
      </text>
    </g>
  );
}
