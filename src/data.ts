import beeNeuropils from "../data/bee-neuropils.json";
import beeProjections from "../data/bee-projections.json";
import beeStructure from "../data/bee-structure.json";
import flyNeuropils from "../data/fly-neuropils.json";
import flyProjections from "../data/fly-projections.json";
import flyStructure from "../data/fly-structure.json";
import type { Species } from "./anatomy/species";

/** All species the app can show; the first one is the default. */
export const SPECIES: Species[] = [
  {
    id: "fly",
    name: "Fly",
    scientificName: "Drosophila melanogaster",
    ebClosed: true,
    data: { neuropils: flyNeuropils, projections: flyProjections, structure: flyStructure },
  },
  {
    id: "bee",
    name: "Bee",
    scientificName: "Megalopta genalis",
    ebClosed: false,
    data: { neuropils: beeNeuropils, projections: beeProjections, structure: beeStructure },
  },
];
