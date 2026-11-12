/**
 * Geometry for the central-complex schematic.
 *
 * Everything here is pure: given the parsed neuropil data, `buildLayout`
 * returns the shapes and anchor points of the protocerebral bridge (PB) and
 * ellipsoid body (EB) in a single SVG user-space.
 *
 * Two levels of structure are laid out:
 *   - Unit    : a PB glomerulus or EB wedge (drawn as a common outline)
 *   - Subunit : one of the two halves of a unit (the clickable cells), itself
 *               split into three bands: presynaptic / overlap / postsynaptic
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
  /**
   * The cell split in three along the neuropil's tangent: pre = upper band in
   * the PB / outer band in the EB, post = lower band / inner band, and the
   * overlap band between them. Each band is shaded by its own quantity.
   */
  bands: Record<Band, string>;
  /** Lines along the two splits between the bands. */
  divider: string;
  /** Anchor for overlays/labels. */
  center: Point;
  /**
   * Where to mark a cell's endpoint in this subunit. Pre- and postsynaptic
   * markers use different spots so both stay visible when they coincide.
   */
  endpoints: Record<Role, Point>;
}

export type Role = "pre" | "post";
/** The three bands of a subunit: the two roles plus their overlap in the middle. */
export type Band = Role | "overlap";

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
    /** y of a role's "track" (a curve parallel to the bridge) at horizontal position x. */
    trackY: (role: Role, x: number) => number;
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
  /** Subunits of each neuropil in spatial (file) order; kernel offsets count along this order. */
  order: Record<NeuropilName, Subunit[]>;
}

// --- tunable look-and-feel constants (SVG user units) ---------------------

const MARGIN = 50;
const MIN_WIDTH = 800;

// PB
const GLOM_WIDTH = 36;
const GLOM_HEIGHT = 72;
const GLOM_GAP = 8;
const MIDLINE_GAP = 18;
/** How far the lateral ends of the PB sag relative to the midline. */
const PB_DROP = 56;
const PB_TOP = 130;
/** Outline sits this far outside the subunits. */
const PB_OUTLINE_PAD = 2.5;
/** Pre/post tracks run this far above/below the bridge's spine (fraction of glomerulus half-height): the centre of the outer thirds. */
const PB_TRACK_FRACTION = 2 / 3;

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
export function polar(c: Point, r: number, deg: number): Point {
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
): { path: string; center: Point; at: (x: number, y: number) => Point } {
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
    at: map,
  };
}

function toUnit(
  spec: UnitSpec,
  label: string,
  outline: string,
  labelPos: Point,
  center: Point,
  subunits: Pick<Subunit, "path" | "bands" | "divider" | "center" | "endpoints">[],
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
  // MIDLINE_GAP is the full edge-to-edge gap between the innermost glomeruli of
  // the two hemispheres; it replaces (rather than adds to) the regular gap there.
  const extraAtMidline = MIDLINE_GAP - GLOM_GAP;
  const totalSpan = n * pitch - GLOM_GAP + extraAtMidline;
  const width = Math.max(MIN_WIDTH, totalSpan + 2 * MARGIN);
  const left = (width - totalSpan) / 2;
  // Right edge of the last glomerulus before the split, plus half the gap.
  const midlineX = left + split * pitch - GLOM_GAP + MIDLINE_GAP / 2;

  // Parabola y = PB_TOP + k * dx^2, with the farthest tip dropping by PB_DROP.
  const farthest = Math.max(midlineX - left, left + totalSpan - midlineX);
  const k = PB_DROP / (farthest * farthest);
  const spineY = (x: number) => PB_TOP + k * (x - midlineX) ** 2;
  const trackY = (role: Role, x: number) =>
    spineY(x) + (role === "pre" ? -1 : 1) * GLOM_HEIGHT * 0.5 * PB_TRACK_FRACTION;

  const units = specs.map((spec, i) => {
    const x0 = left + i * pitch + (i >= split ? extraAtMidline : 0);
    const cx = x0 + GLOM_WIDTH / 2;
    const center: Point = { x: cx, y: spineY(cx) };
    const angle = (Math.atan(2 * k * (cx - midlineX)) * 180) / Math.PI;
    const hw = GLOM_WIDTH / 2;
    const hh = GLOM_HEIGHT / 2;

    const cells = [
      [-hw, 0],
      [0, hw],
    ].map(([x0, x1]) => {
      const r = rotatedRect(center, angle, x0, -hh, x1, hh);
      const t = hh / 3; // each band is a third of the height
      const band = (y0: number, y1: number) => rotatedRect(center, angle, x0, y0, x1, y1).path;
      const line = (y: number) => {
        const a = r.at(x0, y);
        const b = r.at(x1, y);
        return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`;
      };
      // Markers sit exactly on the role's track so lines along the bridge pass through them.
      const x = center.x + (x0 + x1) / 2;
      return {
        path: r.path,
        bands: { pre: band(-hh, -t), overlap: band(-t, t), post: band(t, hh) },
        divider: `${line(-t)} ${line(t)}`,
        center: r.center,
        endpoints: {
          pre: { x, y: trackY("pre", x) },
          post: { x, y: trackY("post", x) },
        },
      };
    });
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

  return { units, spine: spinePts.join(" "), width, midlineX, trackY };
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
    ].map(([s, e]) => {
      const thickness = EB_OUTER_R - EB_INNER_R;
      // Three equal radial bands: post (inner), overlap (middle), pre (outer).
      const r1 = EB_INNER_R + thickness / 3;
      const r2 = EB_INNER_R + (2 * thickness) / 3;
      const arc = (r: number) => {
        const a = polar(center, r, s);
        const b = polar(center, r, e);
        return `M ${f(a.x)} ${f(a.y)} A ${f(r)} ${f(r)} 0 0 1 ${f(b.x)} ${f(b.y)}`;
      };
      return {
        path: annularSector(center, EB_INNER_R, EB_OUTER_R, s, e),
        bands: {
          pre: annularSector(center, r2, EB_OUTER_R, s, e),
          overlap: annularSector(center, r1, r2, s, e),
          post: annularSector(center, EB_INNER_R, r1, s, e),
        },
        divider: `${arc(r1)} ${arc(r2)}`,
        center: polar(center, mid, (s + e) / 2),
        // Markers in the middle of their band: pre toward the outer rim, post toward the canal.
        endpoints: {
          pre: polar(center, EB_INNER_R + thickness * (5 / 6), (s + e) / 2),
          post: polar(center, EB_INNER_R + thickness * (1 / 6), (s + e) / 2),
        },
      };
    });

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
      trackY: pb.trackY,
    },
    eb: {
      center: ebCenter,
      innerRadius: EB_INNER_R,
      outerRadius: EB_OUTER_R,
      units: ebUnits,
      labelPos: { x: pb.midlineX, y: ebCenter.y - EB_OUTER_R - 48 },
    },
    subunitIndex,
    order: {
      PB: pb.units.flatMap((u) => u.subunits),
      EB: ebUnits.flatMap((u) => u.subunits),
    },
  };
}

/** Anchor point for a subunit — where overlays should attach contacts. */
export function anchor(subunit: Subunit): Point {
  return subunit.center;
}
