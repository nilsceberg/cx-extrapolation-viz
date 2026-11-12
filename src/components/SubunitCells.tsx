import type { Unit } from "../anatomy/layout";
import type { Arborization } from "../anatomy/kernels";
import { subunitClass, subunitHandlers, type SubunitInteraction } from "./interaction";

interface Props {
  units: Unit[];
  interaction: SubunitInteraction;
  arborization: Arborization;
}

/**
 * The clickable cells of a neuropil. Each subunit is drawn as
 *   1. the interactive base cell (hemisphere tint),
 *   2. its two halves, shaded by the selected cells' arborization kernels
 *      (opacity = relative arborization, 0 = transparent),
 *   3. a divider along the split.
 * The selection frame goes on top of everything so neighbours can't cover it.
 */
export function SubunitCells({ units, interaction, arborization }: Props) {
  const subunits = units.flatMap((u) => u.subunits);
  const selected = subunits.find((s) => s.id === interaction.selected?.id);

  return (
    <>
      {subunits.map((s) => (
        <g key={s.id}>
          <path className={subunitClass(s, interaction)} d={s.path} {...subunitHandlers(s, interaction)} />
          <path
            className="half pre"
            d={s.halves.pre}
            style={{ fillOpacity: arborization.pre.get(s.id) ?? 0 }}
          />
          <path
            className="half post"
            d={s.halves.post}
            style={{ fillOpacity: arborization.post.get(s.id) ?? 0 }}
          />
          <path className="divider" d={s.divider} />
        </g>
      ))}
      {selected && <path className="subunit-frame" d={selected.path} />}
    </>
  );
}
