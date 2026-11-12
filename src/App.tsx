import { useState } from "react";
import { getModel } from "./anatomy/model";
import { Explorer } from "./components/Explorer";
import { SPECIES } from "./data";

export function App() {
  const [speciesId, setSpeciesId] = useState(SPECIES[0].id);
  const species = SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0];

  return (
    <div className="app">
      <header>
        <div>
          <h1>Central complex extrapolation</h1>
          <p>Schematic of the protocerebral bridge (PB) and ellipsoid body (EB).</p>
        </div>
        <label className="species-picker">
          <span>Species</span>
          <select value={species.id} onChange={(e) => setSpeciesId(e.target.value)}>
            {SPECIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.scientificName})
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* Keyed by species: selected cells and subunits don't carry over between species. */}
      <Explorer key={species.id} model={getModel(species)} />
    </div>
  );
}
