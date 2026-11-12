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

/** How a species is shown. Anything left out defaults to the species' own setting. */
export interface ModelOptions {
  /** Treat the EB as a closed ring (drawn closed, kernels wrap) or as an open arc. */
  ebClosed?: boolean;
  /** Include the species' optional 10th PB column. Ignored for species without one. */
  tenthColumn?: boolean;
}

export interface Model {
  species: Species;
  ebClosed: boolean;
  /** Whether the optional 10th column is part of the model (always false if the species has none). */
  tenthColumn: boolean;
  layout: Layout;
  cells: Cell[];
  kernels: Kernels;
  scales: Scales;
  rules: KernelRules;
}

/** Unit a PB subunit belongs to: "R10R" -> "R10". */
const pbUnitOf = (subunit: string) => subunit.slice(0, -1);

/**
 * The species' data without the given PB glomeruli: their subunits are removed
 * from the neuropil list and every projection to them is dropped. Projection
 * keys left with nothing to project to are dropped too.
 */
function withoutPBUnits(
  data: Species["data"],
  units: string[],
): Pick<Species["data"], "neuropils" | "projections"> {
  const out = new Set(units);
  const keep = (subunit: string) => !out.has(pbUnitOf(subunit));

  const neuropils = { ...(data.neuropils as Record<string, unknown>) };
  if (Array.isArray(neuropils.PB)) neuropils.PB = (neuropils.PB as string[]).filter(keep);

  const projections: Record<string, Record<string, Record<string, string[]>>> = {};
  for (const [region, byType] of Object.entries(data.projections as Record<string, Record<string, Record<string, string[]>>>)) {
    projections[region] = {};
    for (const [type, byKey] of Object.entries(byType)) {
      projections[region][type] = {};
      for (const [key, subunits] of Object.entries(byKey)) {
        const kept = region === "PB" ? subunits.filter(keep) : subunits;
        if (kept.length > 0) projections[region][type][key] = kept;
      }
    }
  }
  return { neuropils, projections };
}

export function buildModel(species: Species, options: ModelOptions = {}): Model {
  const ebClosed = options.ebClosed ?? species.ebClosed;
  const tenthColumn = !!species.tenthColumn && (options.tenthColumn ?? true);
  try {
    const { neuropils, projections } =
      species.tenthColumn && !tenthColumn
        ? withoutPBUnits(species.data, species.tenthColumn)
        : species.data;
    const layout = buildLayout(parseNeuropils(neuropils), { ebClosed });
    const cells = parseCells(projections);
    assertKnownSubunits(cells, layout.subunitIndex);
    const kernels = parseKernels(species.data.structure);
    assertKernelsCoverCells(cells, kernels);
    const scales = parseScales(species.data.structure);
    assertScalesCoverCells(cells, scales);
    return { species, ebClosed, tenthColumn, layout, cells, kernels, scales, rules: kernelRulesFor(ebClosed) };
  } catch (e) {
    throw new Error(`${species.scientificName}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

const cache = new Map<string, Model>();

/** The model for a species and display options, built on first use. */
export function getModel(species: Species, options: ModelOptions = {}): Model {
  const ebClosed = options.ebClosed ?? species.ebClosed;
  const tenthColumn = !!species.tenthColumn && (options.tenthColumn ?? true);
  const key = `${species.id}:${ebClosed ? "closed" : "open"}:${tenthColumn ? "10th" : "no10th"}`;
  let model = cache.get(key);
  if (!model) {
    model = buildModel(species, { ebClosed, tenthColumn });
    cache.set(key, model);
  }
  return model;
}
