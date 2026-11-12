/**
 * Synapse-count estimate for a pre/post cell pair (the species' structure data).
 *
 * The overlap of the two cells' arborizations, summed over every subunit of a
 * neuropil, is converted to a synapse count with a per-neuropil scale that
 * depends on the two cell types:
 *
 *   scales[neuropil][preType][postType]
 *
 *   synapses(neuropil) = scale * sum over subunits of min(pre, post)
 *   total              = sum of synapses(neuropil) over the neuropils
 *
 * (The file does not say which key is which; the outer key is taken to be the
 * presynaptic type, matching the "pre -> post" reading order. This is the only
 * place that decides it: see `scaleFor`.)
 */

import type { Layout } from "./layout";
import type { NeuropilName } from "./neuropils";
import type { Cell } from "./projections";
import type { SubunitValues } from "./kernels";

export type Scales = Record<NeuropilName, Record<string, Record<string, number>>>;

export const SCALE_NEUROPILS: NeuropilName[] = ["PB", "EB"];

export function parseScales(raw: unknown): Scales {
  const byNeuropil = (raw as { scales?: Record<string, unknown> })?.scales;
  if (!byNeuropil) throw new Error('structure data: missing "scales"');

  const out = { PB: {}, EB: {} } as Scales;
  for (const np of SCALE_NEUROPILS) {
    const rows = (byNeuropil[np] ?? {}) as Record<string, Record<string, unknown>>;
    for (const [outer, inner] of Object.entries(rows)) {
      out[np][outer] = {};
      for (const [key, value] of Object.entries(inner)) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`structure data: scales/${np}/${outer}/${key} must be a finite number`);
        }
        out[np][outer][key] = value;
      }
    }
  }
  return out;
}

/** The scale for a pre/post type pair in one neuropil, or undefined if the file has none. */
function scaleFor(scales: Scales, np: NeuropilName, preType: string, postType: string): number | undefined {
  return scales[np][preType]?.[postType];
}

/** Throws if some pair of cell types has no scale in a neuropil, so the UI never needs a fallback. */
export function assertScalesCoverCells(cells: Cell[], scales: Scales): void {
  const types = [...new Set(cells.map((c) => c.type))];
  for (const np of SCALE_NEUROPILS) {
    for (const pre of types) {
      for (const post of types) {
        if (scaleFor(scales, np, pre, post) === undefined) {
          throw new Error(`structure data: no scale for ${pre} -> ${post} in ${np}`);
        }
      }
    }
  }
}

export interface SynapseTerm {
  neuropil: NeuropilName;
  scale: number;
  /** Sum over the neuropil's subunits of min(pre, post). */
  overlapSum: number;
  /** scale * overlapSum */
  synapses: number;
}

export interface SynapseEstimate {
  terms: SynapseTerm[];
  total: number;
}

export function estimateSynapses(
  layout: Layout,
  scales: Scales,
  pre: Cell,
  post: Cell,
  overlap: SubunitValues,
): SynapseEstimate {
  const sums: Record<NeuropilName, number> = { PB: 0, EB: 0 };
  for (const [id, value] of overlap) {
    const np = layout.subunitIndex.get(id)?.neuropil;
    if (np) sums[np] += value;
  }

  const terms = SCALE_NEUROPILS.map((neuropil) => {
    const scale = scaleFor(scales, neuropil, pre.type, post.type);
    if (scale === undefined) throw new Error(`No scale for ${pre.type} -> ${post.type} in ${neuropil}`);
    const overlapSum = sums[neuropil];
    return { neuropil, scale, overlapSum, synapses: scale * overlapSum };
  });
  return { terms, total: terms.reduce((acc, t) => acc + t.synapses, 0) };
}
