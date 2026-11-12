import type { Layout } from "../anatomy/layout";
import type { Arborization } from "../anatomy/kernels";
import { unitOutlineClass, type SubunitInteraction } from "./interaction";
import { SubunitCells } from "./SubunitCells";

interface Props extends SubunitInteraction {
  pb: Layout["pb"];
  arborization: Arborization;
}

export function ProtocerebralBridge({ pb, arborization, ...interaction }: Props) {
  return (
    <g className="pb" aria-label="Protocerebral bridge">
      <path className="pb-spine" d={pb.spine} />
      <SubunitCells units={pb.units} interaction={interaction} arborization={arborization} />
      {/* Outlines are drawn after the cells so they frame them; they ignore the pointer. */}
      {pb.units.map((u) => (
        <path key={u.id} className={unitOutlineClass(u, interaction)} d={u.outline} />
      ))}
      {pb.units.map((u) => (
        <text
          key={u.id}
          className="unit-label"
          x={u.labelPos.x}
          y={u.labelPos.y}
          textAnchor="middle"
        >
          {u.label}
        </text>
      ))}
      <text className="structure-label" x={pb.labelPos.x} y={pb.labelPos.y} textAnchor="middle">
        Protocerebral bridge
      </text>
    </g>
  );
}
