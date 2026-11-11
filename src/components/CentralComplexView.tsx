import type { ReactNode } from "react";
import type { Layout } from "../anatomy/layout";
import { EllipsoidBody } from "./EllipsoidBody";
import { ProtocerebralBridge } from "./ProtocerebralBridge";
import type { SubunitInteraction } from "./interaction";

interface Props extends SubunitInteraction {
  layout: Layout;
  /**
   * Overlay slot (neurons, contacts, ...). Rendered on top of the anatomy in
   * the same SVG user-space, so overlays can use `layout.subunitIndex` anchors.
   */
  overlay?: (layout: Layout) => ReactNode;
}

export function CentralComplexView({ layout, overlay, ...interaction }: Props) {
  return (
    <svg
      className="cx-svg"
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
      <ProtocerebralBridge pb={layout.pb} {...interaction} />
      <EllipsoidBody eb={layout.eb} {...interaction} />
      {overlay?.(layout)}
    </svg>
  );
}
