import type { KeyboardEvent } from "react";
import type { Subunit, Unit } from "../anatomy/layout";

/** Shared hover/selection plumbing for the clickable subunit cells. */
export interface SubunitInteraction {
  hovered: Subunit | null;
  selected: Subunit | null;
  onHover: (subunit: Subunit | null) => void;
  onSelect: (subunit: Subunit | null) => void;
}

export function subunitClass(subunit: Subunit, { hovered, selected }: SubunitInteraction): string {
  const classes = [
    "subunit",
    `hemi-${subunit.hemisphere ?? "none"}`,
    `side-${subunit.side}`,
  ];
  if (hovered?.id === subunit.id) classes.push("hovered");
  if (selected?.id === subunit.id) classes.push("selected");
  return classes.join(" ");
}

export function unitOutlineClass(unit: Unit, { hovered, selected }: SubunitInteraction): string {
  const classes = ["unit-outline"];
  if (hovered?.unitId === unit.id) classes.push("hovered");
  if (selected?.unitId === unit.id) classes.push("selected");
  return classes.join(" ");
}

export function subunitHandlers(subunit: Subunit, { onHover, onSelect }: SubunitInteraction) {
  return {
    tabIndex: 0,
    role: "button" as const,
    "aria-label": `Subunit ${subunit.id}`,
    onMouseEnter: () => onHover(subunit),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(subunit),
    onBlur: () => onHover(null),
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(subunit);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(subunit);
      }
    },
  };
}
