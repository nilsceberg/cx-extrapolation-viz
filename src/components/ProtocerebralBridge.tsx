import type { Layout } from "../anatomy/layout";
import {
  subunitClass,
  subunitHandlers,
  unitOutlineClass,
  type SubunitInteraction,
} from "./interaction";

interface Props extends SubunitInteraction {
  pb: Layout["pb"];
}

export function ProtocerebralBridge({ pb, ...interaction }: Props) {
  return (
    <g className="pb" aria-label="Protocerebral bridge">
      <path className="pb-spine" d={pb.spine} />
      {pb.units.flatMap((u) =>
        u.subunits.map((s) => (
          <path
            key={s.id}
            className={subunitClass(s, interaction)}
            d={s.path}
            {...subunitHandlers(s, interaction)}
          />
        )),
      )}
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
