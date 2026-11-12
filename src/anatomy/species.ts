/**
 * Species-specific rules for applying arborization kernels. Everything that
 * differs between species lives here, so adding one means adding an object of
 * this shape rather than touching the kernel code.
 */

import type { NeuropilName } from "./neuropils";

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
   *   subtype - the cell's key in fly-projections.json, e.g. "R5" for PEN_a R5,
   *             or "L1L9R8" for a Delta7
   */
  shouldFlip(type: string, column: string, subtype: string): boolean;
}

export const FLY_KERNEL_RULES: KernelRules = {
  wraps: { PB: false, EB: true },
  shouldFlip(type, column, subtype) {
    // Delta7 spans both hemispheres, so it is oriented per projected subunit
    // (by the subunit's hemisphere); every other type is oriented per cell
    // (by the hemisphere of the cell's key).
    if (type === "Delta7") return column[0] === "L";
    return subtype[0] === "L";
  },
};
