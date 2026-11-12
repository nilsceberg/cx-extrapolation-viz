/**
 * Schematic "wiring" of a cell: SVG paths that connect its endpoints.
 *
 *  - PB: one line along the role's track (a curve parallel to the bridge),
 *    spanning all of the cell's PB endpoints.
 *  - EB: one arc along the ring at the role's radius, spanning the cell's EB
 *    endpoints (opened at the largest gap, so it takes the short way round).
 *  - Trunk: a smooth curve from the PB line to the EB arc when the cell has
 *    endpoints in both.
 *
 * Pure geometry: depends only on the layout and the cell's subunit ids.
 */

import { polar, type Layout, type Point, type Role } from "./layout";
import type { Cell } from "./projections";

const f = (n: number) => n.toFixed(2);
const TRACK_STEP = 4;

interface Piece {
  /** Path for the line, or null if there's only a single endpoint. */
  path: string | null;
  /** Where a trunk should attach. */
  attach: Point;
}

function endpointsOf(layout: Layout, ids: string[], role: Role): Point[] {
  const pts: Point[] = [];
  for (const id of ids) {
    const p = layout.subunitIndex.get(id)?.endpoints[role];
    if (p) pts.push(p);
  }
  return pts;
}

function pbPiece(layout: Layout, pts: Point[], role: Role): Piece | null {
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const at = (x: number): Point => ({ x, y: layout.pb.trackY(role, x) });
  if (x1 - x0 < 1e-6) return { path: null, attach: at(x0) };

  const n = Math.max(1, Math.ceil((x1 - x0) / TRACK_STEP));
  const parts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = at(x0 + ((x1 - x0) * i) / n);
    parts.push(`${i ? "L" : "M"} ${f(p.x)} ${f(p.y)}`);
  }
  return { path: parts.join(" "), attach: at((x0 + x1) / 2) };
}

function ebPiece(layout: Layout, pts: Point[]): Piece | null {
  if (pts.length === 0) return null;
  const c = layout.eb.center;
  const r = Math.hypot(pts[0].x - c.x, pts[0].y - c.y);
  const angle = (p: Point) => {
    const deg = (Math.atan2(p.x - c.x, -(p.y - c.y)) * 180) / Math.PI;
    return (deg + 360) % 360;
  };
  let start: number;
  let end: number;
  if (layout.eb.closed) {
    const angles = pts.map(angle).sort((a, b) => a - b);
    if (angles.length === 1 || angles[angles.length - 1] - angles[0] < 1e-6) {
      return { path: null, attach: pts[0] };
    }

    // Open the ring at the largest gap between consecutive endpoints.
    let gapAt = angles.length - 1; // gap between last and first (wrapping)
    let gap = angles[0] + 360 - angles[gapAt];
    for (let i = 0; i < angles.length - 1; i++) {
      const g = angles[i + 1] - angles[i];
      if (g > gap) {
        gap = g;
        gapAt = i;
      }
    }
    start = angles[(gapAt + 1) % angles.length];
    end = angles[gapAt];
    if (end < start) end += 360;
  } else {
    // An open EB has no way round: span from the first to the last endpoint along the arc,
    // measuring angles from where the first wedge starts so the opening is never crossed.
    const from = layout.eb.startDeg;
    const rel = pts.map((p) => (angle(p) - from + 360) % 360).sort((a, b) => a - b);
    if (rel.length === 1 || rel[rel.length - 1] - rel[0] < 1e-6) {
      return { path: null, attach: pts[0] };
    }
    start = from + rel[0];
    end = from + rel[rel.length - 1];
  }
  const span = end - start;

  const a = polar(c, r, start);
  const b = polar(c, r, end);
  return {
    path: `M ${f(a.x)} ${f(a.y)} A ${f(r)} ${f(r)} 0 ${span > 180 ? 1 : 0} 1 ${f(b.x)} ${f(b.y)}`,
    attach: polar(c, r, start + span / 2),
  };
}

/** Smooth curve from the PB attach point down to the EB attach point. */
function trunk(layout: Layout, from: Point, to: Point): string {
  const c = layout.eb.center;
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len }; // outward normal of the ring at `to`

  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const reach = Math.max(30, dist * 0.4);

  // Arrive from the outside when this part of the ring faces the PB, otherwise
  // from the canal side (the curve then crosses the near side of the ring).
  const facesPB = u.x * (from.x - to.x) + u.y * (from.y - to.y) > 0;
  const sign = facesPB ? 1 : -1;

  const c1 = { x: from.x, y: from.y + reach };
  const c2 = { x: to.x + sign * u.x * reach, y: to.y + sign * u.y * reach };
  return `M ${f(from.x)} ${f(from.y)} C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(to.x)} ${f(to.y)}`;
}

/** Paths (SVG `d` strings) that wire up all of a cell's endpoints for one role. */
export function buildArbor(layout: Layout, cell: Cell, role: Role): string[] {
  const pb = pbPiece(layout, endpointsOf(layout, cell.subunits.PB, role), role);
  const eb = ebPiece(layout, endpointsOf(layout, cell.subunits.EB, role));

  const paths: string[] = [];
  if (pb?.path) paths.push(pb.path);
  if (eb?.path) paths.push(eb.path);
  if (pb && eb) paths.push(trunk(layout, pb.attach, eb.attach));
  return paths;
}
