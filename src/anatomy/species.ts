/**
 * What differs between species. Adding one means adding a `Species` object
 * (see src/data.ts) rather than touching the layout or kernel code.
 */

import type { NeuropilName } from "./neuropils";

export interface Species {
  /** Stable id, e.g. "fly". */
  id: string;
  /** Common name, e.g. "Fly". */
  name: string;
  /** Scientific name, e.g. "Drosophila melanogaster". */
  scientificName: string;
  /**
   * Whether the species' EB is a closed ring: the default for the open/closed
   * toggle. A closed EB is drawn as a full ring and kernel offsets wrap around
   * it; an open EB is drawn as an arc with a gap and offsets stop at its ends.
   */
  ebClosed: boolean;
  /** The species' data files, as parsed JSON. */
  data: {
    /** data/<species>-neuropils.json: every subunit of the PB and EB, in spatial order. */
    neuropils: unknown;
    /** data/<species>-projections.json: region -> cell type -> key -> subunits. */
    projections: unknown;
    /** data/<species>-structure.json: arborization kernels and synapse scales. */
    structure: unknown;
  };
}

export interface KernelRules {
  /** Whether kernel offsets wrap around a neuropil (a ring) or stop at its ends (a bridge). */
  wraps: Record<NeuropilName, boolean>;
  /**
   * Whether the kernel for one projection should be mirrored (offset -> -offset).
   *
   * Mirrors the extrapolator's `should_flip(type, column, subtype)`:
   *   type    - cell type, e.g. "Delta7"
   *   column  - the projected subunit under consideration, as named in the
   *             data files, e.g. "R9L" (PB) or "c2R" (EB)
   *   subtype - the cell's key in the projections file, e.g. "R5" for PEN_a R5,
   *             or "L1L9R8" for a Delta7
   */
  shouldFlip(type: string, column: string, subtype: string): boolean;
}

/** The extrapolator's orientation rule; the same for all species so far. */
const shouldFlip: KernelRules["shouldFlip"] = (type, column, subtype) => {
  // Delta7 spans both hemispheres, so it is oriented per projected subunit
  // (by the subunit's hemisphere); every other type is oriented per cell
  // (by the hemisphere of the cell's key).
  if (type === "Delta7") return column[0] === "L";
  return subtype[0] === "L";
};

/** Kernel rules for a species, with the EB treated as closed (wrapping) or open. */
export function kernelRulesFor(ebClosed: boolean): KernelRules {
  return {
    // The PB is a bridge; the EB wraps only if it is a closed ring.
    wraps: { PB: false, EB: ebClosed },
    shouldFlip,
  };
}
