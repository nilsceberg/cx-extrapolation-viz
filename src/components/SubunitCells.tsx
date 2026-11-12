import type { Role, Subunit, Unit } from "../anatomy/layout";
import type { Arborization } from "../anatomy/kernels";
import { subunitHandlers, type SubunitInteraction } from "./interaction";

interface Props {
  units: Unit[];
  interaction: SubunitInteraction;
  arborization: Arborization;
}

const ROLES: Role[] = ["pre", "post"];

/**
 * The clickable cells of a neuropil. Each subunit is drawn in layers:
 *   1. a neutral background (so the kernel reads against a clean base),
 *   2. each half's kernel shading (opacity = relative arborization),
 *   3. the interactive cell itself: transparent, so it only supplies the
 *      border and the mouse/keyboard target,
 *   4. the divider along the split and the hover highlight.
 * The selection frame goes on top of everything so neighbours can't cover it.
 */
export function SubunitCells({ units, interaction, arborization }: Props) {
  const subunits = units.flatMap((u) => u.subunits);
  const selected = subunits.find((s) => s.id === interaction.selected?.id);

  return (
    <>
      {subunits.map((s) => (
        <g key={s.id}>
          <path className="bg" d={s.path} />
          {ROLES.map((role) => (
            <path
              key={`kernel-${role}`}
              className={`half ${role}`}
              d={s.halves[role]}
              style={{ fillOpacity: arborization[role]?.get(s.id) ?? 0 }}
            />
          ))}
          <path className="subunit" d={s.path} {...subunitHandlers(s, interaction)} />
          <path className="divider" d={s.divider} />
          {isHovered(s, interaction) && <path className="subunit-hover" d={s.path} />}
        </g>
      ))}
      {selected && <path className="subunit-frame" d={selected.path} />}
    </>
  );
}

const isHovered = (s: Subunit, { hovered }: SubunitInteraction) => hovered?.id === s.id;
