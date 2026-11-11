import { groupByType, type Cell } from "../anatomy/projections";
import type { Role } from "../anatomy/layout";

interface Props {
  role: Role;
  title: string;
  cells: Cell[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** A radio-group list of all cells, grouped by type. */
export function CellList({ role, title, cells, selectedId, onSelect }: Props) {
  const groups = groupByType(cells);
  const selected = cells.find((c) => c.id === selectedId) ?? null;

  return (
    <section className={`cell-list ${role}`}>
      <div className="cell-list-head">
        <h2>
          <span className="swatch" aria-hidden="true" /> {title}
        </h2>
        <button type="button" disabled={!selected} onClick={() => onSelect(null)}>
          Clear
        </button>
      </div>

      <div className="cell-list-scroll" role="radiogroup" aria-label={title}>
        {groups.map(({ type, cells: group }) => (
          <div key={type} className="cell-group">
            <h3>{type}</h3>
            <div className="cell-items">
              {group.map((c) => (
                <label key={c.id} className={c.id === selectedId ? "checked" : undefined}>
                  <input
                    type="radio"
                    name={`cell-${role}`}
                    checked={c.id === selectedId}
                    onChange={() => onSelect(c.id)}
                  />
                  {c.key}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="cell-detail">
        {selected ? (
          <>
            <strong>{selected.label}</strong>
            <br />
            {summary("PB", selected.subunits.PB)}
            {summary("EB", selected.subunits.EB)}
            {summary("NO", selected.noduli)}
          </>
        ) : (
          "No cell selected."
        )}
      </p>
    </section>
  );
}

function summary(name: string, ids: string[]) {
  if (ids.length === 0) return null;
  return (
    <span className="detail-row">
      <span className="detail-name">{name}</span> {ids.join(", ")}
    </span>
  );
}
