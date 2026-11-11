import { useState } from "react";
import neuropilData from "../data/fly-neuropils.json";
import projectionData from "../data/fly-projections.json";
import { buildLayout, type Subunit } from "./anatomy/layout";
import { parseNeuropils } from "./anatomy/neuropils";
import { assertKnownSubunits, parseCells } from "./anatomy/projections";
import { CellList } from "./components/CellList";
import { CentralComplexView } from "./components/CentralComplexView";
import { EndpointMarkers } from "./components/EndpointMarkers";

// Parsed once at module load: the data is static and a parse error should be loud.
const layout = buildLayout(parseNeuropils(neuropilData));
const cells = parseCells(projectionData);
assertKnownSubunits(cells, layout.subunitIndex);

function describe(s: Subunit): string {
  const unit = s.neuropil === "PB" ? "PB glomerulus" : "EB wedge";
  return `${s.id} — ${s.side} subunit of ${unit} ${s.unitId}`;
}

export function App() {
  const [hovered, setHovered] = useState<Subunit | null>(null);
  const [selected, setSelected] = useState<Subunit | null>(null);
  const [preId, setPreId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  const pre = cells.find((c) => c.id === preId) ?? null;
  const post = cells.find((c) => c.id === postId) ?? null;
  const info = hovered ?? selected;

  return (
    <div className="app">
      <header>
        <h1>Central complex extrapolation</h1>
        <p>Schematic of the protocerebral bridge (PB) and ellipsoid body (EB).</p>
      </header>

      <main>
        <CellList
          role="pre"
          title="Presynaptic cell"
          cells={cells}
          selectedId={preId}
          onSelect={setPreId}
        />

        <div className="center">
          <CentralComplexView
            layout={layout}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={setSelected}
            overlay={(l) => <EndpointMarkers layout={l} pre={pre} post={post} />}
          />
          <p className="readout">
            {info ? describe(info) : "Hover or click a subunit."}
            {selected && hovered && selected.id !== hovered.id && (
              <span className="hint"> · selected: {describe(selected)}</span>
            )}
          </p>
        </div>

        <CellList
          role="post"
          title="Postsynaptic cell"
          cells={cells}
          selectedId={postId}
          onSelect={setPostId}
        />
      </main>
    </div>
  );
}
