/**
 * Arborization kernels (data/fly-structure.json).
 *
 * Each cell type has an input and an output kernel per neuropil:
 *
 *   kernels[neuropil][type][input|output] = { offsets: [...], values: [...] }
 *
 * A kernel is f(offset) = relative arborization (1 = peak), where `offset` is a
 * number of subunits counted from a projection. Positive offsets point towards
 * later subunits in the order of fly-neuropils.json (PB: left -> right on
 * screen, EB: clockwise around the ring as drawn). Offsets outside the listed
 * range contribute 0.
 *
 * For a cell, every projection contributes a copy of the kernel centred on it,
 * mirrored (offset -> -offset) when the species' `shouldFlip` rule says so; a
 * subunit's arborization is the *maximum* over those contributions.
 * Presynaptic cells use their output kernel, postsynaptic cells their input
 * kernel. Wrapping and flipping are species rules (see species.ts).
 */

import type { Band, Layout, Role } from "./layout";
import type { NeuropilName } from "./neuropils";
import type { KernelRules } from "./species";
import type { Cell } from "./projections";

export type Direction = "input" | "output";

export interface Kernel {
  offsets: number[];
  values: number[];
  /** f(offset); 0 outside the listed offsets. */
  at(offset: number): number;
}

export type Kernels = Record<NeuropilName, Record<string, Partial<Record<Direction, Kernel>>>>;

/** Relative arborization (0..1) per subunit id; subunits with 0 are omitted. */
export type SubunitValues = ReadonlyMap<string, number>;
/**
 * What each band of a subunit shows. `pre` / `post` are the selected cells'
 * arborization (null while no cell is selected for that role); `overlap` is
 * min(pre, post), and null unless both cells are selected.
 */
export type Arborization = Record<Band, SubunitValues | null>;

/** Which kernel each role uses. */
export const ROLE_DIRECTION: Record<Role, Direction> = { pre: "output", post: "input" };

const NEUROPILS: NeuropilName[] = ["PB", "EB"];
const DIRECTIONS: Direction[] = ["input", "output"];

function parseKernel(where: string, raw: unknown): Kernel {
  const k = raw as { offsets?: unknown; values?: unknown };
  const isNums = (a: unknown): a is number[] =>
    Array.isArray(a) && a.every((n) => typeof n === "number" && Number.isFinite(n));
  const offsets = k?.offsets;
  const values = k?.values;
  if (!isNums(offsets) || !isNums(values) || offsets.length !== values.length) {
    throw new Error(`fly-structure.json: ${where} needs numeric "offsets" and "values" of equal length`);
  }
  const lookup = new Map(offsets.map((o, i) => [o, values[i]]));
  return { offsets, values, at: (o) => lookup.get(o) ?? 0 };
}

export function parseKernels(raw: unknown): Kernels {
  const byNeuropil = (raw as { kernels?: Record<string, unknown> })?.kernels;
  if (!byNeuropil) throw new Error('fly-structure.json: missing "kernels"');

  const out = { PB: {}, EB: {} } as Kernels;
  for (const np of NEUROPILS) {
    const types = (byNeuropil[np] ?? {}) as Record<string, Record<string, unknown>>;
    for (const [type, dirs] of Object.entries(types)) {
      out[np][type] = {};
      for (const d of DIRECTIONS) {
        if (dirs[d] !== undefined) out[np][type][d] = parseKernel(`${np}/${type}/${d}`, dirs[d]);
      }
    }
  }
  return out;
}

/** Throws if a cell projects somewhere but its type has no kernel for it. */
export function assertKernelsCoverCells(cells: Cell[], kernels: Kernels): void {
  for (const cell of cells) {
    for (const np of NEUROPILS) {
      if (cell.subunits[np].length === 0) continue;
      for (const d of DIRECTIONS) {
        if (!kernels[np][cell.type]?.[d]) {
          throw new Error(`No ${d} kernel for ${cell.type} in ${np} (needed by cell ${cell.id})`);
        }
      }
    }
  }
}

/** Per-subunit minimum of two arborizations: how much both cells arborize in the same place. */
export function computeOverlap(pre: SubunitValues | null, post: SubunitValues | null): SubunitValues | null {
  if (!pre || !post) return null;
  const overlap = new Map<string, number>();
  for (const [id, a] of pre) {
    const b = post.get(id);
    if (b !== undefined) overlap.set(id, Math.min(a, b));
  }
  return overlap;
}

/** Signed distance j - p in subunits, wrapped onto the shortest way round for rings. */
function offsetBetween(j: number, p: number, count: number, wrap: boolean): number {
  const d = j - p;
  if (!wrap) return d;
  const m = ((d % count) + count) % count; // 0..count-1
  return m > count / 2 ? m - count : m;
}

/** Arborization of one cell in one role: max over projections of the shifted kernel. */
export function computeArborization(
  layout: Layout,
  kernels: Kernels,
  rules: KernelRules,
  cell: Cell,
  role: Role,
): SubunitValues {
  const values = new Map<string, number>();
  for (const np of NEUROPILS) {
    const kernel = kernels[np][cell.type]?.[ROLE_DIRECTION[role]];
    if (!kernel) continue;

    const order = layout.order[np];
    const indexOf = new Map(order.map((s, i) => [s.id, i]));
    const projections = cell.subunits[np].flatMap((id) => {
      const index = indexOf.get(id);
      if (index === undefined) return [];
      // Mirror this projection's kernel if the species rules say so.
      return [{ index, flip: rules.shouldFlip(cell.type, id, cell.key) }];
    });

    order.forEach((subunit, j) => {
      let v = 0;
      for (const { index, flip } of projections) {
        const offset = offsetBetween(j, index, order.length, rules.wraps[np]);
        v = Math.max(v, kernel.at(flip ? -offset : offset));
      }
      if (v > 0) values.set(subunit.id, v);
    });
  }
  return values;
}
