import type { SynapseEstimate } from "../anatomy/synapses";

const numberFormat = new Intl.NumberFormat("en", { maximumSignificantDigits: 3 });
const fmt = (v: number) => numberFormat.format(v);

const Pre = () => <span className="f-pre">pre</span>;
const Post = () => <span className="f-post">post</span>;
const Min = () => <span className="f-min">min</span>;

interface Props {
  /** Null until both a presynaptic and a postsynaptic cell are selected. */
  estimate: SynapseEstimate | null;
}

/**
 * The synapse estimate as a colour-coded formula, one line per neuropil:
 *
 *   scale × Σ min(pre, post) = scale × <overlap sum> = <synapses>
 *
 * with the same colours as the diagram (pre pink, post lime, overlap cyan).
 */
export function SynapseFormula({ estimate }: Props) {
  return (
    <section className="synapse-formula" aria-label="Estimated synapses between the selected cells">
      {estimate ? (
        <>
          {estimate.terms.map((t) => (
            <div className="formula-row" key={t.neuropil}>
              <span className="formula-np">{t.neuropil}</span>
              <span>
                <span className="f-scale">{fmt(t.scale)}</span> × Σ <Min />(<Pre />, <Post />)
              </span>
              <span className="f-eq">=</span>
              <span>
                <span className="f-scale">{fmt(t.scale)}</span> × <span className="f-min">{fmt(t.overlapSum)}</span>
              </span>
              <span className="f-eq">=</span>
              <span className="f-synapses">{fmt(t.synapses)}</span>
            </div>
          ))}
          <div className="formula-row formula-total">
            <span className="formula-np">Total</span>
            <span className="f-synapses">{estimate.terms.map((t) => fmt(t.synapses)).join(" + ")}</span>
            <span className="f-eq">=</span>
            <span className="f-synapses f-big">{fmt(estimate.total)}</span>
            <span className="formula-unit">synapses</span>
          </div>
        </>
      ) : (
        <p className="hint">Select a presynaptic and a postsynaptic cell to estimate the synapses between them.</p>
      )}
      <p className="hint formula-explanation">
        Per neuropil, the overlap <Min />(<Pre />, <Post />) is summed over all subunits and multiplied by a
        scale that converts it into a synapse count. The scale depends on the two cell types and the neuropil.
        The estimate for the pair is the sum over neuropils.
      </p>
    </section>
  );
}
