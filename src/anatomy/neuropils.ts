/**
 * Parsing of data/fly-neuropils.json.
 *
 * The file lists every *subunit* of each neuropil in spatial order (PB: along
 * the bridge, EB: around the ring). Subunit names encode their parent unit:
 *
 *   PB  "R9L" -> glomerulus "R9" (right hemisphere, #9), subunit side "L"
 *   EB  "c2R" -> wedge "c2" (#2),                        subunit side "R"
 *
 * Units must appear as contiguous groups of two subunits; anything else is
 * reported loudly rather than silently mis-drawn.
 */

export type Side = "L" | "R";
export type NeuropilName = "PB" | "EB";

export interface SubunitSpec {
  /** Full name as used in the data files, e.g. "R9L" or "c2R". */
  id: string;
  side: Side;
}

export interface UnitSpec {
  /** Parent name as used in the data files, e.g. "R9" or "c2". */
  id: string;
  neuropil: NeuropilName;
  /** Number within the neuropil (glomerulus 1-9, wedge 1-16). */
  number: number;
  /** PB glomeruli belong to a hemisphere; EB wedges do not. */
  hemisphere: Side | null;
  subunits: SubunitSpec[];
}

export type Neuropils = Record<NeuropilName, UnitSpec[]>;

const PATTERNS: Record<NeuropilName, RegExp> = {
  // [hemisphere][number][side]
  PB: /^(?<hemi>[LR])(?<num>\d+)(?<side>[LR])$/,
  // c[number][side]
  EB: /^c(?<num>\d+)(?<side>[LR])$/,
};

const SUBUNITS_PER_UNIT = 2;

function parseList(neuropil: NeuropilName, names: unknown): UnitSpec[] {
  if (!Array.isArray(names) || !names.every((n) => typeof n === "string")) {
    throw new Error(`fly-neuropils.json: "${neuropil}" must be an array of strings`);
  }
  const units: UnitSpec[] = [];
  const seen = new Set<string>();

  for (const name of names as string[]) {
    const m = PATTERNS[neuropil].exec(name);
    if (!m?.groups) throw new Error(`${neuropil}: cannot parse subunit name "${name}"`);
    if (seen.has(name)) throw new Error(`${neuropil}: duplicate subunit "${name}"`);
    seen.add(name);

    const hemisphere = (m.groups.hemi as Side | undefined) ?? null;
    const number = Number(m.groups.num);
    const id = neuropil === "PB" ? `${hemisphere}${number}` : `c${number}`;
    const sub: SubunitSpec = { id: name, side: m.groups.side as Side };

    const last = units[units.length - 1];
    if (last?.id === id) last.subunits.push(sub);
    else if (units.some((u) => u.id === id)) {
      throw new Error(`${neuropil}: subunits of "${id}" are not contiguous`);
    } else units.push({ id, neuropil, number, hemisphere, subunits: [sub] });
  }

  for (const u of units) {
    if (u.subunits.length !== SUBUNITS_PER_UNIT) {
      throw new Error(`${neuropil}: unit "${u.id}" has ${u.subunits.length} subunits, expected 2`);
    }
  }
  return units;
}

export function parseNeuropils(raw: unknown): Neuropils {
  const obj = raw as Record<string, unknown>;
  return { PB: parseList("PB", obj?.PB), EB: parseList("EB", obj?.EB) };
}
