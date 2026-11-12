import type { ReactNode } from "react";
import type { Arborization } from "../anatomy/kernels";
import type { Layout, Role } from "../anatomy/layout";
import { ColorLegend } from "./ColorLegend";
import { EllipsoidBody } from "./EllipsoidBody";
import { ProtocerebralBridge } from "./ProtocerebralBridge";
import type { SubunitInteraction } from "./interaction";

interface Props extends SubunitInteraction {
  layout: Layout;
  /** Kernel-based arborization of the selected pre/post cells, shaded into the subunits. */
  arborization: Arborization;
  /**
   * Roles whose shading is a single isolated kernel rather than the cell's whole
   * arborization; drawn in white instead of the role's colour.
   */
  isolated: Record<Role, boolean>;
  /**
   * Overlay slot (neurons, contacts, ...). Rendered on top of the anatomy in
   * the same SVG user-space, so overlays can use `layout.subunitIndex` anchors.
   */
  overlay?: (layout: Layout) => ReactNode;
}

export function CentralComplexView({ layout, arborization, isolated, overlay, ...interaction }: Props) {
  const className = ["cx-svg", isolated.pre && "isolate-pre", isolated.post && "isolate-post"]
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      className={className}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Schematic of the protocerebral bridge and ellipsoid body"
      onClick={() => interaction.onSelect(null)}
    >
      <line
        className="midline"
        x1={layout.midlineX}
        x2={layout.midlineX}
        y1={20}
        y2={layout.height - 20}
      />
      <ProtocerebralBridge pb={layout.pb} arborization={arborization} {...interaction} />
      <EllipsoidBody eb={layout.eb} arborization={arborization} {...interaction} />
      {overlay?.(layout)}
      <ColorLegend layout={layout} isolated={isolated} />
    </svg>
  );
}
