/**
 * Geometry for the central-complex schematic.
 *
 * Everything here is pure: given the parsed neuropil data, `buildLayout`
 * returns the shapes and anchor points of the protocerebral bridge (PB) and
 * ellipsoid body (EB) in a single SVG user-space.
 *
 * Two levels of structure are laid out:
 *   - Unit    : a PB glomerulus or EB wedge (drawn as a common outline)
 *   - Subunit : one of the two halves of a unit (the clickable cells)
 *
 * Rendering components only draw what they are given, and the neuron-overlay
 * layer can look up anchor points via `subunitIndex` without re-deriving any
 * geometry.
 */

import type { NeuropilName, Neuropils, Side, UnitSpec } from "./neuropils";

export interface Point {
  x: number;
  y: number;
}

export interface Subunit {
  /** Name as used in the data files, e.g. "R9L" or "c2R". */
  id: string;
  neuropil: NeuropilName;
  /** Parent unit id, e.g. "R9" or "c2". */
  unitId: string;
  side: Side;
  /** Hemisphere of the parent unit (PB only). */
  hemisphere: Side | null;
  /** SVG path of the cell, in layout space. */
  path: string;
  /** Anchor for overlays/labels. */
  center: Point;
}

export interface Unit {
  id: string;
  neuropil: NeuropilName;
  number: number;
  hemisphere: Side | null;
  /** Text shown next to / inside the unit. */
  label: string;
  /** Common outline around both subunits. */
  outline: string;
  labelPos: Point;
  center: Point;
  subunits: [Subunit, Subunit];
}

export interface Layout {
  width: number;
  height: number;
  midlineX: number;
  pb: {
    units: Unit[];
    /** Backbone through the PB, drawn behind the glomeruli. */
    spine: string;
    labelPos: Point;
  };
  eb: {
    center: Point;
    innerRadius: number;
    outerRadius: number;
    units: Unit[];
    labelPos: Point;
  };
  /** Lookup of every subunit by its data-file name. */
  subunitIndex: ReadonlyMap<string, Subunit>;
}

// --- tunable look-and-feel constants (SVG user units) ---------------------

const MARGIN = 50;
const MIN_WIDTH = 800;

// PB
const GLOM_WIDTH = 36;
const GLOM_HEIGHT = 52;
const GLOM_GAP = 8;
const MIDLINE_GAP = 18;
/** How far the lateral ends of the PB sag relative to the midline. */
const PB_DROP = 56;
const PB_TOP = 130;
/** Outline sits this far outside the subunits. */
const PB_OUTLINE_PAD = 2.5;

// EB
const EB_INNER_R = 85;
const EB_OUTER_R = 175;
/** Gap between neighbouring wedges, in degrees. */
const EB_WEDGE_GAP_DEG = 3;
const EB_OUTLINE_PAD = 2.5;
/** Angle (clockwise from 12 o'clock) at which the first subunit starts: 180 = 6 o'clock. */
const EB_START_DEG = 180;

// --- helpers ---------------------------------------------------------------

const rad = (deg: number) => (deg * Math.PI) / 180;
const f = (n: number) => n.toFixed(2);

/** Polar -> cartesian where 0deg is 12 o'clock and angles run clockwise. */
function polar(c: Point, r: number, deg: number): Point {
  return { x: c.x + r * Math.sin(rad(deg)), y: c.y - r * Math.cos(rad(deg)) };
}

function annularSector(c: Point, r0: number, r1: number, a0: number, a1: number): string {
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  const p0 = polar(c, r1, a0);
  const p1 = polar(c, r1, a1);
  const p2 = polar(c, r0, a1);
  const p3 = polar(c, r0, a0);
  return [
    `M ${f(p0.x)} ${f(p0.y)}`,
    `A ${r1} ${r1} 0 ${largeArc} 1 ${f(p1.x)} ${f(p1.y)}`,
    `L ${f(p2.x)} ${f(p2.y)}`,
    `A ${r0} ${r0} 0 ${largeArc} 0 ${f(p3.x)} ${f(p3.y)}`,
    "Z",
  ].join(" ");
}

/** Polygon path for a rectangle given in local coords, rotated about `origin`. */
function rotatedRect(
  origin: Point,
  angleDeg: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { path: string; center: Point } {
  const cos = Math.cos(rad(angleDeg));
  const sin = Math.sin(rad(angleDeg));
  const map = (x: number, y: number): Point => ({
    x: origin.x + x * cos - y * sin,
    y: origin.y + x * sin + y * cos,
  });
  const pts = [map(x0, y0), map(x1, y0), map(x1, y1), map(x0, y1)];
  return {
    path: pts.map((p, i) => `${i ? "L" : "M"} ${f(p.x)} ${f(p.y)}`).join(" ") + " Z",
    center: map((x0 + x1) / 2, (y0 + y1) / 2),
  };
}

function toUnit(
  spec: UnitSpec,
  label: string,
  outline: string,
  labelPos: Point,
  center: Point,
  subunits: Pick<Subunit, "path" | "center">[],
): Unit {
  const [a, b] = spec.subunits.map((s, i) => ({
    id: s.id,
    neuropil: spec.neuropil,
    unitId: spec.id,
    side: s.side,
    hemisphere: spec.hemisphere,
    ...subunits[i],
  }));
  return {
    id: spec.id,
    neuropil: spec.neuropil,
    number: spec.number,
    hemisphere: spec.hemisphere,
    label,
    outline,
    labelPos,
    center,
    subunits: [a, b],
  };
}

// --- builders --------------------------------------------------------------

function buildPB(specs: UnitSpec[]) {
  const n = specs.length;
  const pitch = GLOM_WIDTH + GLOM_GAP;
  // The midline falls where the hemisphere changes (R -> L in file order).
  const split = Math.max(
    0,
    specs.findIndex((u, i) => i > 0 && u.hemisphere !== specs[i - 1].hemisphere),
  );
  const totalSpan = n * pitch + MIDLINE_GAP;
  const width = Math.max(MIN_WIDTH, totalSpan + 2 * MARGIN);
  const left = (width - totalSpan) / 2;
  const midlineX = left + split * pitch + MIDLINE_GAP / 2;

  // Parabola y = PB_TOP + k * dx^2, with the farthest tip dropping by PB_DROP.
  const farthest = Math.max(midlineX - left, left + totalSpan - midlineX);
  const k = PB_DROP / (farthest * farthest);
  const spineY = (x: number) => PB_TOP + k * (x - midlineX) ** 2;

  const units = specs.map((spec, i) => {
    const x0 = left + i * pitch + (i >= split ? MIDLINE_GAP : 0);
    const cx = x0 + GLOM_WIDTH / 2;
    const center: Point = { x: cx, y: spineY(cx) };
    const angle = (Math.atan(2 * k * (cx - midlineX)) * 180) / Math.PI;
    const hw = GLOM_WIDTH / 2;
    const hh = GLOM_HEIGHT / 2;

    const cells = [
      rotatedRect(center, angle, -hw, -hh, 0, hh),
      rotatedRect(center, angle, 0, -hh, hw, hh),
    ];
    const outline = rotatedRect(
      center,
      angle,
      -hw - PB_OUTLINE_PAD,
      -hh - PB_OUTLINE_PAD,
      hw + PB_OUTLINE_PAD,
      hh + PB_OUTLINE_PAD,
    ).path;

    return toUnit(
      spec,
      spec.id,
      outline,
      { x: center.x, y: center.y + hh + 18 },
      center,
      cells,
    );
  });

  const spinePts: string[] = [];
  const steps = 40;
  for (let s = 0; s <= steps; s++) {
    const x = left + (totalSpan * s) / steps;
    spinePts.push(`${s === 0 ? "M" : "L"} ${f(x)} ${f(spineY(x))}`);
  }

  return { units, spine: spinePts.join(" "), width, midlineX };
}

function buildEB(specs: UnitSpec[], center: Point) {
  const unitStep = 360 / specs.length;
  const mid = (EB_INNER_R + EB_OUTER_R) / 2;
  return specs.map((spec, i) => {
    const start = EB_START_DEG + i * unitStep;
    const end = start + unitStep;
    const a0 = start + EB_WEDGE_GAP_DEG / 2;
    const a1 = end - EB_WEDGE_GAP_DEG / 2;
    const half = (a0 + a1) / 2;

    const cells = [
      [a0, half],
      [half, a1],
    ].map(([s, e]) => ({
      path: annularSector(center, EB_INNER_R, EB_OUTER_R, s, e),
      center: polar(center, mid, (s + e) / 2),
    }));

    // Pad the outline outward so it frames the cells instead of overlapping them.
    const angPad = (EB_OUTLINE_PAD / EB_OUTER_R) * (180 / Math.PI);
    const outline = annularSector(
      center,
      EB_INNER_R - EB_OUTLINE_PAD,
      EB_OUTER_R + EB_OUTLINE_PAD,
      a0 - angPad,
      a1 + angPad,
    );

    return toUnit(
      spec,
      String(spec.number),
      outline,
      polar(center, EB_OUTER_R + 16, (a0 + a1) / 2),
      polar(center, mid, (a0 + a1) / 2),
      cells,
    );
  });
}

export function buildLayout(neuropils: Neuropils): Layout {
  const pb = buildPB(neuropils.PB);

  const pbBottom = PB_TOP + PB_DROP + GLOM_HEIGHT / 2 + 40;
  const ebCenter: Point = { x: pb.midlineX, y: pbBottom + 60 + EB_OUTER_R };
  const ebUnits = buildEB(neuropils.EB, ebCenter);

  const subunitIndex = new Map<string, Subunit>();
  for (const u of [...pb.units, ...ebUnits]) {
    for (const s of u.subunits) subunitIndex.set(s.id, s);
  }

  return {
    width: pb.width,
    height: ebCenter.y + EB_OUTER_R + MARGIN + 10,
    midlineX: pb.midlineX,
    pb: {
      units: pb.units,
      spine: pb.spine,
      labelPos: { x: pb.midlineX, y: PB_TOP - GLOM_HEIGHT / 2 - 36 },
    },
    eb: {
      center: ebCenter,
      innerRadius: EB_INNER_R,
      outerRadius: EB_OUTER_R,
      units: ebUnits,
      labelPos: { x: pb.midlineX, y: ebCenter.y - EB_OUTER_R - 48 },
    },
    subunitIndex,
  };
}

/** Anchor point for a subunit — where overlays should attach contacts. */
export function anchor(subunit: Subunit): Point {
  return subunit.center;
}
