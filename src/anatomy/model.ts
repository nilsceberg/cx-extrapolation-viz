/**
 * Everything derived from one species' data, parsed and validated together.
 * A parse or consistency error is loud (thrown) rather than silently mis-drawn.
 */

import { assertKernelsCoverCells, parseKernels, type Kernels } from "./kernels";
import { buildLayout, type Layout } from "./layout";
import { parseNeuropils } from "./neuropils";
import { assertKnownSubunits, parseCells, type Cell } from "./projections";
import { kernelRulesFor, type KernelRules, type Species } from "./species";
import { assertScalesCoverCells, parseScales, type Scales } from "./synapses";

export interface Model {
  species: Species;
  /** Whether the EB is treated as a closed ring (drawn closed, kernels wrap) or open. */
  ebClosed: boolean;
  layout: Layout;
  cells: Cell[];
  kernels: Kernels;
  scales: Scales;
  rules: KernelRules;
}

/** `ebClosed` defaults to the species' own EB; pass it to override (e.g. from a toggle). */
export function buildModel(species: Species, ebClosed: boolean = species.ebClosed): Model {
  try {
    const { neuropils, projections, structure } = species.data;
    const layout = buildLayout(parseNeuropils(neuropils), { ebClosed });
    const cells = parseCells(projections);
    assertKnownSubunits(cells, layout.subunitIndex);
    const kernels = parseKernels(structure);
    assertKernelsCoverCells(cells, kernels);
    const scales = parseScales(structure);
    assertScalesCoverCells(cells, scales);
    return { species, ebClosed, layout, cells, kernels, scales, rules: kernelRulesFor(ebClosed) };
  } catch (e) {
    throw new Error(`${species.scientificName}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

const cache = new Map<string, Model>();

/** The model for a species and EB shape, built on first use. */
export function getModel(species: Species, ebClosed: boolean = species.ebClosed): Model {
  const key = `${species.id}:${ebClosed ? "closed" : "open"}`;
  let model = cache.get(key);
  if (!model) {
    model = buildModel(species, ebClosed);
    cache.set(key, model);
  }
  return model;
}
