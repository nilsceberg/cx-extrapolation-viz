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
  layout: Layout;
  cells: Cell[];
  kernels: Kernels;
  scales: Scales;
  rules: KernelRules;
}

export function buildModel(species: Species): Model {
  try {
    const { neuropils, projections, structure } = species.data;
    const layout = buildLayout(parseNeuropils(neuropils), { ebClosed: species.ebClosed });
    const cells = parseCells(projections);
    assertKnownSubunits(cells, layout.subunitIndex);
    const kernels = parseKernels(structure);
    assertKernelsCoverCells(cells, kernels);
    const scales = parseScales(structure);
    assertScalesCoverCells(cells, scales);
    return { species, layout, cells, kernels, scales, rules: kernelRulesFor(species) };
  } catch (e) {
    throw new Error(`${species.scientificName}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

const cache = new Map<string, Model>();

/** The model for a species, built on first use. */
export function getModel(species: Species): Model {
  let model = cache.get(species.id);
  if (!model) {
    model = buildModel(species);
    cache.set(species.id, model);
  }
  return model;
}
