/**
 * Parsing of the projections file into a flat list of cells.
 *
 * The file is organised as  region -> cell type -> key -> subunits, e.g.
 *
 *   PB: { EPG: { R9: ["R9R", "R9L"] }, ... }
 *   EB: { EPG: { R8: ["c2R", "c2L"] }, ... }
 *   NO: { PEN_a: { R9: ["right"] }, ... }
 *
 * A *cell* is one (type, key) pair, merged across regions: "EPG R8" has
 * subunits in both PB and EB. Keys are not guaranteed to exist in every
 * region (e.g. EPG R9 projects to the PB but not the EB).
 */

import type { NeuropilName } from "./neuropils";

export interface Cell {
  /** Unique id, e.g. "EPG:R8". */
  id: string;
  type: string;
  key: string;
  label: string;
  /** Subunit ids (as in the neuropils file) the cell projects to, per laid-out neuropil. */
  subunits: Record<NeuropilName, string[]>;
  /** Noduli targets ("left" / "right"); not drawn yet since there is no NO layout. */
  noduli: string[];
}

const LAID_OUT: NeuropilName[] = ["PB", "EB"];

type RawProjections = Record<string, Record<string, Record<string, string[]>>>;

export function parseCells(raw: unknown): Cell[] {
  const data = raw as RawProjections;
  const regions = Object.keys(data);

  // Keep first-appearance order of types and keys, so lists follow the file.
  const cells = new Map<string, Cell>();
  for (const region of regions) {
    for (const [type, byKey] of Object.entries(data[region])) {
      for (const [key, units] of Object.entries(byKey)) {
        if (!Array.isArray(units)) {
          throw new Error(`projection data: ${region}/${type}/${key} must be an array`);
        }
        const id = `${type}:${key}`;
        let cell = cells.get(id);
        if (!cell) {
          cell = {
            id,
            type,
            key,
            label: `${type} ${key}`,
            subunits: { PB: [], EB: [] },
            noduli: [],
          };
          cells.set(id, cell);
        }
        const target =
          region === "PB" || region === "EB" ? cell.subunits[region as NeuropilName] : cell.noduli;
        for (const u of units) if (!target.includes(u)) target.push(u);
      }
    }
  }
  return [...cells.values()];
}

/** Throws if any cell references a subunit that the layout doesn't contain. */
export function assertKnownSubunits(cells: Cell[], known: ReadonlyMap<string, unknown>): void {
  for (const cell of cells) {
    for (const region of LAID_OUT) {
      for (const id of cell.subunits[region]) {
        if (!known.has(id)) {
          throw new Error(`Cell ${cell.id}: unknown ${region} subunit "${id}"`);
        }
      }
    }
  }
}

/** The order cell types are listed in the menus; any other type follows, in file order. */
const TYPE_ORDER = ["Delta7", "EPG", "PEG", "PEN_a", "PEN_b"];

/**
 * Cells grouped by type, in `TYPE_ORDER` (so every species lists them the same
 * way, whatever order its file has). Within a type, cells keep their file order.
 */
export function groupByType(cells: Cell[]): { type: string; cells: Cell[] }[] {
  const groups = new Map<string, Cell[]>();
  for (const c of cells) {
    if (!groups.has(c.type)) groups.set(c.type, []);
    groups.get(c.type)!.push(c);
  }
  const rank = (type: string) => {
    const i = TYPE_ORDER.indexOf(type);
    return i === -1 ? TYPE_ORDER.length : i;
  };
  // Array.prototype.sort is stable, so unknown types keep their file order.
  return [...groups]
    .map(([type, cs]) => ({ type, cells: cs }))
    .sort((a, b) => rank(a.type) - rank(b.type));
}
