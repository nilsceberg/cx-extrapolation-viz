import { useMemo, useState } from "react";
import { computeArborization, computeOverlap, type Arborization } from "../anatomy/kernels";
import type { Role, Subunit } from "../anatomy/layout";
import type { Model } from "../anatomy/model";
import { estimateSynapses } from "../anatomy/synapses";
import { CellList } from "./CellList";
import { CentralComplexView } from "./CentralComplexView";
import { EndpointMarkers } from "./EndpointMarkers";
import { SynapseFormula } from "./SynapseFormula";

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

/**
 * The diagram, the two cell lists and the readouts for one species. All of its
 * state (selected cells and subunit) belongs to that species: mount it with a
 * `key` per species so switching species starts fresh.
 */
export function Explorer({ model }: { model: Model }) {
  const { layout, cells, kernels, scales, rules } = model;

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
    const preValues = pre ? computeArborization(layout, kernels, rules, pre, "pre") : null;
    const postValues = post ? computeArborization(layout, kernels, rules, post, "post") : null;
    return {
      pre: preValues,
      post: postValues,
      // How much both cells arborize in the same place.
      overlap: computeOverlap(preValues, postValues),
    };
  }, [layout, kernels, rules, pre, post]);

  // What is shaded: the full arborization, or the single focused contribution(s).
  const arborization = useMemo<Arborization>(() => {
    if (!focus.pre && !focus.post) return full;
    const preValues = pre && focus.pre ? computeArborization(layout, kernels, rules, pre, "pre", focus.pre) : full.pre;
    const postValues = post && focus.post ? computeArborization(layout, kernels, rules, post, "post", focus.post) : full.post;
    return { pre: preValues, post: postValues, overlap: computeOverlap(preValues, postValues) };
  }, [layout, kernels, rules, full, pre, post, focus.pre, focus.post]);

  // Total synapses between the pair: the overlap summed per neuropil, times the type-pair scale.
  // Always for the whole cells, regardless of the focused projection.
  const synapses = useMemo(
    () => (pre && post && full.overlap ? estimateSynapses(layout, scales, pre, post, full.overlap) : null),
    [layout, scales, pre, post, full],
  );

  return (
    <main>
      <CellList role="pre" title="Presynaptic cell" cells={cells} selectedId={preId} onSelect={setPreId} />

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

      <CellList role="post" title="Postsynaptic cell" cells={cells} selectedId={postId} onSelect={setPostId} />
    </main>
  );
}
