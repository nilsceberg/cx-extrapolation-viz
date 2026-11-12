import { useState } from "react";
import { getModel } from "./anatomy/model";
import { Explorer } from "./components/Explorer";
import { SPECIES } from "./data";

export function App() {
  const [speciesId, setSpeciesId] = useState(SPECIES[0].id);
  const species = SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0];
  // Open/closed EB: starts as the species' own shape and can then be toggled by hand.
  const [ebClosed, setEbClosed] = useState(species.ebClosed);

  const chooseSpecies = (id: string) => {
    const next = SPECIES.find((s) => s.id === id) ?? SPECIES[0];
    setSpeciesId(next.id);
    setEbClosed(next.ebClosed); // choosing a species resets the EB to that species' shape
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>Central complex extrapolation</h1>
          <p>Schematic of the protocerebral bridge (PB) and ellipsoid body (EB).</p>
        </div>
        <div className="header-controls">
          <label className="species-picker">
            <span>Species</span>
            <select value={species.id} onChange={(e) => chooseSpecies(e.target.value)}>
              {SPECIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.scientificName})
                </option>
              ))}
            </select>
          </label>
          <label className="eb-toggle" title="Draw the EB as a closed ring (kernels wrap around) or an open arc (they don't)">
            <input type="checkbox" checked={ebClosed} onChange={(e) => setEbClosed(e.target.checked)} />
            <span>Closed EB</span>
          </label>
        </div>
      </header>

      {/* Keyed by species: selected cells and subunits don't carry over between species.
          Toggling the EB keeps them: only the geometry and kernel wrapping change. */}
      <Explorer key={species.id} model={getModel(species, ebClosed)} />
    </div>
  );
}
