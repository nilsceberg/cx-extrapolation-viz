import { useState } from "react";
import { getModel } from "./anatomy/model";
import { Explorer } from "./components/Explorer";
import { SPECIES } from "./data";

export function App() {
  const [speciesId, setSpeciesId] = useState(SPECIES[0].id);
  const species = SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0];
  // Open/closed EB: starts as the species' own shape and can then be toggled by hand.
  const [ebClosed, setEbClosed] = useState(species.ebClosed);
  // Optional 10th PB column: on whenever the species has one, otherwise off and disabled.
  const hasTenthColumn = !!species.tenthColumn;
  const [tenthColumn, setTenthColumn] = useState(hasTenthColumn);

  const chooseSpecies = (id: string) => {
    const next = SPECIES.find((s) => s.id === id) ?? SPECIES[0];
    setSpeciesId(next.id);
    // Choosing a species resets the toggles to that species' own settings.
    setEbClosed(next.ebClosed);
    setTenthColumn(!!next.tenthColumn);
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
          <label
            className="eb-toggle"
            title={
              hasTenthColumn
                ? "Include the 10th PB column (R10 / L10). When off, those subunits and any projections to them are ignored."
                : "This species has no 10th PB column"
            }
          >
            <input
              type="checkbox"
              checked={hasTenthColumn && tenthColumn}
              disabled={!hasTenthColumn}
              onChange={(e) => setTenthColumn(e.target.checked)}
            />
            <span>10th column</span>
          </label>
        </div>
      </header>

      {/* Keyed by species: selected cells and subunits don't carry over between species.
          Toggling the EB or the 10th column keeps them: only the geometry and data change. */}
      <Explorer key={species.id} model={getModel(species, { ebClosed, tenthColumn })} />
    </div>
  );
}
