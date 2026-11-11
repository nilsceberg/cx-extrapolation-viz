import { useMemo, useState } from "react";
import neuropilData from "../data/fly-neuropils.json";
import { buildLayout, type Subunit } from "./anatomy/layout";
import { parseNeuropils } from "./anatomy/neuropils";
import { CentralComplexView } from "./components/CentralComplexView";

// Parsed once at module load: the data is static and a parse error should be loud.
const layout = buildLayout(parseNeuropils(neuropilData));

function describe(s: Subunit): string {
  const unit = s.neuropil === "PB" ? "PB glomerulus" : "EB wedge";
  return `${s.id} — ${s.side} subunit of ${unit} ${s.unitId}`;
}

export function App() {
  const [hovered, setHovered] = useState<Subunit | null>(null);
  const [selected, setSelected] = useState<Subunit | null>(null);

  const counts = useMemo(
    () => ({
      pbUnits: layout.pb.units.length,
      ebUnits: layout.eb.units.length,
      subunits: layout.subunitIndex.size,
    }),
    [],
  );

  const info = hovered ?? selected;

  return (
    <div className="app">
      <header>
        <h1>Central complex extrapolation</h1>
        <p>Schematic of the protocerebral bridge (PB) and ellipsoid body (EB).</p>
      </header>

      <main>
        <CentralComplexView
          layout={layout}
          hovered={hovered}
          selected={selected}
          onHover={setHovered}
          onSelect={setSelected}
        />

        <aside>
          <section>
            <h2>Anatomy</h2>
            <dl>
              <dt>PB glomeruli</dt>
              <dd>{counts.pbUnits}</dd>
              <dt>EB wedges</dt>
              <dd>{counts.ebUnits}</dd>
              <dt>Subunits</dt>
              <dd>{counts.subunits}</dd>
            </dl>
            <p className="hint">
              Each glomerulus / wedge (outlined) is split into two subunits. Layout is read from{" "}
              <code>data/fly-neuropils.json</code>.
            </p>
          </section>

          <section>
            <h2>Subunit</h2>
            <p className="readout">{info ? describe(info) : "Hover or click a subunit."}</p>
            {selected && hovered && selected.id !== hovered.id && (
              <p className="hint">Selected: {describe(selected)}</p>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
