import { useMemo, useState } from "react";
import neuropilData from "../data/fly-neuropils.json";
import projectionData from "../data/fly-projections.json";
import structureData from "../data/fly-structure.json";
import {
  assertKernelsCoverCells,
  computeArborization,
  computeOverlap,
  parseKernels,
  type Arborization,
} from "./anatomy/kernels";
import { buildLayout, type Role, type Subunit } from "./anatomy/layout";
import { FLY_KERNEL_RULES } from "./anatomy/species";
import { parseNeuropils } from "./anatomy/neuropils";
import { assertKnownSubunits, parseCells } from "./anatomy/projections";
import { assertScalesCoverCells, estimateSynapses, parseScales } from "./anatomy/synapses";
import { CellList } from "./components/CellList";
import { CentralComplexView } from "./components/CentralComplexView";
import { EndpointMarkers } from "./components/EndpointMarkers";
import { SynapseFormula } from "./components/SynapseFormula";

// Parsed once at module load: the data is static and a parse error should be loud.
const layout = buildLayout(parseNeuropils(neuropilData));
const cells = parseCells(projectionData);
assertKnownSubunits(cells, layout.subunitIndex);
const kernels = parseKernels(structureData);
assertKernelsCoverCells(cells, kernels);
const scales = parseScales(structureData);
assertScalesCoverCells(cells, scales);

function describe(s: Subunit, arborization: Arborization): string {
  const unit = s.neuropil === "PB" ? "PB glomerulus" : "EB wedge";
  const parts = [`${s.id} — ${s.side} subunit of ${unit} ${s.unitId}`];
  const pre = arborization.pre?.get(s.id);
  const post = arborization.post?.get(s.id);
  const overlap = arborization.overlap?.get(s.id);
  if (pre !== undefined) parts.push(`pre (output) ${format(pre)}`);
  if (post !== undefined) parts.push(`post (input) ${format(post)}`);
  if (overlap !== undefined) parts.push(`overlap (min) ${format(overlap)}`);
  return parts.join(" · ");
}

const format = (v: number) => (v >= 0.001 ? v.toFixed(3) : v.toExponential(1));

export function App() {
  const [hovered, setHovered] = useState<Subunit | null>(null);
  const [selected, setSelected] = useState<Subunit | null>(null);
  const [preId, setPreId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  const pre = cells.find((c) => c.id === preId) ?? null;
  const post = cells.find((c) => c.id === postId) ?? null;
  const info = hovered ?? selected;

  // Selecting a subunit that a cell projects to isolates that projection: the cell is then shaded
  // with only the kernel centred on it, instead of the max over all of its projections.
  const focus: Record<Role, string | undefined> = {
    pre: selected && pre?.subunits[selected.neuropil].includes(selected.id) ? selected.id : undefined,
    post: selected && post?.subunits[selected.neuropil].includes(selected.id) ? selected.id : undefined,
  };

  // Presynaptic cells shade their output kernel, postsynaptic cells their input kernel.
  const full = useMemo<Arborization>(() => {
    const preValues = pre ? computeArborization(layout, kernels, FLY_KERNEL_RULES, pre, "pre") : null;
    const postValues = post ? computeArborization(layout, kernels, FLY_KERNEL_RULES, post, "post") : null;
    return {
      pre: preValues,
      post: postValues,
      // How much both cells arborize in the same place.
      overlap: computeOverlap(preValues, postValues),
    };
  }, [pre, post]);

  // What is shaded: the full arborization, or the single focused contribution(s).
  const arborization = useMemo<Arborization>(() => {
    if (!focus.pre && !focus.post) return full;
    const preValues = pre && focus.pre ? computeArborization(layout, kernels, FLY_KERNEL_RULES, pre, "pre", focus.pre) : full.pre;
    const postValues = post && focus.post ? computeArborization(layout, kernels, FLY_KERNEL_RULES, post, "post", focus.post) : full.post;
    return { pre: preValues, post: postValues, overlap: computeOverlap(preValues, postValues) };
  }, [full, pre, post, focus.pre, focus.post]);

  // Total synapses between the pair: the overlap summed per neuropil, times the type-pair scale.
  // Always for the whole cells, regardless of the focused projection.
  const synapses = useMemo(
    () => (pre && post && full.overlap ? estimateSynapses(layout, scales, pre, post, full.overlap) : null),
    [pre, post, full],
  );

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
            arborization={arborization}
            isolated={{ pre: !!focus.pre, post: !!focus.post }}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={setSelected}
            overlay={(l) => <EndpointMarkers layout={l} pre={pre} post={post} />}
          />
          <p className="readout">
            {info ? describe(info, arborization) : "Hover or click a subunit."}
            {selected && hovered && selected.id !== hovered.id && (
              <span className="hint"> · selected: {describe(selected, arborization)}</span>
            )}
          </p>
          {selected && (focus.pre || focus.post) && (
            <p className="focus-note">
              Showing only the kernel centred on <strong>{selected.id}</strong> (in white) for{" "}
              <strong>{[focus.pre && "pre", focus.post && "post"].filter(Boolean).join(" and ")}</strong>.
              Click empty space to show all projections. The synapse estimate below still uses all
              projections.
            </p>
          )}
          <SynapseFormula estimate={synapses} />
          <p className="hint legend">
            Shading = relative arborization from the cell type's kernels. Upper (PB) / outer (EB) band:
            presynaptic output kernel. Lower / inner band: postsynaptic input kernel. Middle band
            (cyan): overlap, the minimum of the two.
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
