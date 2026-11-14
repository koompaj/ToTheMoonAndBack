"""Convert the downloaded NASA PSI files into the JSON the web app reads.

Every value comes from NASA's files in <data_dir>. Nothing is invented: a value
that is missing or unusable in the source becomes null and gets a flag.

Writes to <out_dir>:
  investigations.json   one entry per Combustion Science investigation (24)
  tests.json            one entry per real test row, in a common format
  habitats.json         habitat oxygen/pressure boxes, each with its source

Version 1 covers the seven tables whose oxygen column is already numeric.
The data workstream extends it to the remaining tables (see docs/DATA_ISSUES.md).

Usage:  python -I build_web_data.py <data_dir> <out_dir>
"""
import csv
import io
import json
import os
import re
import sys

PSI_PAGE = "https://psi.nasa.gov/physci/repo/data/investigations/"
PSI_TO_ATM = 1 / 14.696
MOON_MIN_O2 = 0.30
MOON_MAX_P_ATM = round(10.2 * PSI_TO_ATM, 4)

# Fuel class and NASA fire-safety pillar, only where the challenge page states them.
FROM_CHALLENGE = {
    "PSI-26": ("solid", "prevention"), "PSI-25": ("solid", "prevention"),
    "PSI-98": ("solid", "prevention"), "PSI-99": ("solid", "prevention"), "PSI-100": ("solid", "prevention"),
    "PSI-102": (None, "detection"), "PSI-101": (None, "detection"),
    "PSI-69": ("droplet", "suppression"), "PSI-68": ("droplet", None), "PSI-39": ("droplet", None),
    "PSI-10": ("gas", None), "PSI-20": ("gas", None), "PSI-21": ("gas", None),
    "PSI-22": ("gas", None), "PSI-23": ("gas", None), "PSI-159": ("gas", None),
}


def read_csv(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    return rows[0], rows[1:]


def strict_num(cell):
    """A cell that is exactly one number, else None (rejects 'RAMP', '#DIV/0!', '-')."""
    cell = (cell or "").strip()
    return float(cell) if re.fullmatch(r"-?\d*\.?\d+", cell) else None


def lead_num(cell):
    """Leading number of a cell such as '0.5 atm'."""
    m = re.match(r"\s*(-?\d*\.?\d+)", cell or "")
    return float(m.group(1)) if m else None


def split5(s):
    return [p.strip() for p in re.split(r"\s{3,}", s or "") if p.strip()]


def build_investigations(data):
    search = json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))
    manifest = json.load(open(os.path.join(data, "manifest.json"), encoding="utf-8"))
    man = {i["accession"]: i for i in manifest["investigations"]}
    out = []
    for s in search:
        acc = s["Accession"]
        rec = json.load(open(os.path.join(data, "investigations", f"{acc}.json"), encoding="utf-8"))
        hw = s.get("Experiment Hardware")
        tables = []
        for t in man[acc]["tables"]:
            _, body = read_csv(os.path.join(data, t["file"]))
            tables.append({"file": t["file"], "rows": len(body)})
        fuel_class, pillar = FROM_CHALLENGE.get(acc, (None, None))
        out.append({
            "accession": acc,
            "acronym": (s.get("Acronym") or "").strip() or None,
            "title": s.get("Title"),
            "project_type": s.get("Project Type") or None,
            "flight_platform": (s.get("Flight Platform") or "").strip() or None,
            "sub_research_area": (s.get("SubResearch Area") or "").strip() or None,
            "keywords": split5(s.get("Keywords")),
            "related": split5(s.get("Related Investigations")),
            "start_date": s.get("Investigation Start Date") or None,
            "end_date": s.get("Investigation End Date") or None,
            "release_date": rec.get("releaseDate") or None,
            "hardware": (hw.get("Name") if isinstance(hw, dict) else hw) or None,
            "hardware_link": (hw.get("Link") if isinstance(hw, dict) else None) or None,
            "objectives": s.get("Objectives") or None,
            "approach": s.get("Approach") or None,
            "hypothesis": s.get("Hypothesis") or None,
            "earth_benefits": s.get("Research Impacts/Earth Benefits") or None,
            "doi": rec.get("doi") or None,
            "license": rec.get("licenseIdentifier") or None,
            "total_bytes": rec.get("totalFileSize"),
            "publications": [{"title": p.get("title"), "authors": p.get("authorList"), "doi": p.get("doi") or None}
                             for p in (rec.get("publications") or [])],
            "tables": tables,
            "fuel_class": fuel_class,          # from the challenge page; null = not stated there
            "pillar": pillar,                  # prevention | detection | suppression; null = not stated there
            "page": PSI_PAGE + acc,
        })
    return out


def test(acc, acronym, table, row, label, fuel_class, fuel, o2, o2_basis, p_atm, flags, **extra):
    in_env = None
    if o2 is not None and p_atm is not None and o2_basis == "ambient":
        in_env = o2 >= MOON_MIN_O2 and p_atm <= MOON_MAX_P_ATM
    d = {
        "id": f"{acc}:{os.path.splitext(os.path.basename(table))[0].split('_')[-1].replace(' ', '-').lower()}:{row}",
        "investigation": acc, "acronym": acronym,
        "source_table": table, "source_row": row,   # 1 = first data row under the header
        "test_label": (label or "").strip() or None,
        "fuel_class": fuel_class, "fuel": (fuel or "").strip() or None,
        "o2_fraction": None if o2 is None else round(o2, 4),
        "o2_basis": o2_basis,                       # ambient = cabin/chamber air; burner_oxidizer = gas fed from the burner
        "pressure_atm": None if p_atm is None else round(p_atm, 4),
        "airflow_cm_s": None, "co2_fraction": None, "he_fraction": None,
        "burn_time_s": None, "outcome": None,
        "in_moon_envelope": in_env,
        "flags": flags,
    }
    d.update(extra)
    return d


def build_tests(data):
    T = os.path.join(data, "tables")
    tests = []

    def rows(rel):
        return read_csv(os.path.join(T, rel))[1]

    def flags_for(o2, p, o2_cell="", p_cell=""):
        f = []
        if o2 is None:
            f.append("o2_not_numeric:" + o2_cell.strip() if o2_cell.strip() else "o2_missing")
        if p is None:
            f.append("pressure_missing" if not p_cell.strip() or lead_num(p_cell) == 0 else "pressure_not_numeric")
        return f

    rel = "PSI-10/PSI-10_Experimental table_Flame Design_Normal Flame.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, p = strict_num(r[8]), strict_num(r[10])
        tests.append(test("PSI-10", "ACME Flame Design", "tables/" + rel, i, r[3], "gas", r[2], o2, "ambient", p,
                          flags_for(o2, p, r[8], r[10])))

    rel = "PSI-10/PSI-10_Experimental table_Flame Design_Inverse Flame.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, p = strict_num(r[3]), strict_num(r[9])
        tests.append(test("PSI-10", "ACME Flame Design", "tables/" + rel, i, r[2], "gas", "C2H4", o2, "burner_oxidizer", p,
                          flags_for(o2, p, r[3], r[9])))

    def outcome_cfig(cell):
        return {"SE": "self-extinguished", "FT": "flow terminated"}.get(cell.strip())

    rel = "PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, pb = strict_num(r[5]), strict_num(r[7])
        p = None if pb is None else pb / 1.01325
        tests.append(test("PSI-159", "ACME CFI-G", "tables/" + rel, i, r[3], "gas", r[2], o2, "ambient", p,
                          flags_for(o2, p, r[5], r[7]), burn_time_s=strict_num(r[14]), outcome=outcome_cfig(r[15])))

    rel = "PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, pb = strict_num(r[7]), strict_num(r[6])
        p = None if pb is None else pb / 1.01325
        tests.append(test("PSI-159", "ACME CFI-G", "tables/" + rel, i, r[3], "gas", r[2], o2, "burner_oxidizer", p,
                          flags_for(o2, p, r[7], r[6]), burn_time_s=strict_num(r[14]), outcome=outcome_cfig(r[15])))

    rel = "PSI-69/PSI-69_Experimental table_FLEX.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, mm = strict_num(r[6]), strict_num(r[5])
        p = None if (mm is None or mm == 0) else mm / 760
        tests.append(test("PSI-69", "FLEX", "tables/" + rel, i, r[1], "droplet", r[4], o2, "ambient", p,
                          flags_for(o2, p, r[6], r[5]), co2_fraction=strict_num(r[8]), he_fraction=strict_num(r[9]),
                          burn_time_s=strict_num(r[13]), outcome=(r[14].strip().lower() or None)))

    rel = "PSI-39/PSI-39_Experimental table_CFI.csv"
    for i, r in enumerate(rows(rel), 1):
        o2, p = strict_num(r[5]), lead_num(r[4])
        tests.append(test("PSI-39", "CFI", "tables/" + rel, i, r[0], "droplet", r[9], o2, "ambient", p,
                          flags_for(o2, p, r[5], r[4]), he_fraction=strict_num(r[7])))

    rel = "PSI-25/PSI-25_Experimental table_BASS-II.csv"
    for i, r in enumerate(rows(rel), 1):
        pct = strict_num(r[11])
        o2 = None if pct is None else pct / 100
        f = flags_for(o2, 0.0, r[11]) + ["pressure_not_in_table"]
        tests.append(test("PSI-25", "BASS-II", "tables/" + rel, i, r[1], "solid", r[5], o2, "ambient", None, f))
    return tests


def build_habitats():
    challenge = "NASA Space Apps 2026 challenge page, Flame in Freefall (Potential Considerations)"
    return [
        {"id": "moon_base", "name": "Moon Base / pressurized rover",
         "o2_fraction": [0.30, 1.00], "pressure_psi": [4.3, 10.2],
         "pressure_atm": [round(4.3 * PSI_TO_ATM, 4), MOON_MAX_P_ATM],
         "note": "Challenge: oxygen 'likely 30% or greater', pressure '10.2 psi or less', between spacesuit and Earth values. "
                 "The outer bounds here are the spacesuit values.",
         "source": challenge, "status": "from_challenge"},
        {"id": "spacesuit", "name": "Spacesuit",
         "o2_fraction": [1.00, 1.00], "pressure_psi": [4.3, 4.3],
         "pressure_atm": [round(4.3 * PSI_TO_ATM, 4)] * 2,
         "note": "Challenge: spacesuits are filled with 100% oxygen to only 4.3 psi.",
         "source": challenge, "status": "from_challenge"},
        {"id": "earth_sea_level", "name": "Earth sea level",
         "o2_fraction": [0.21, 0.21], "pressure_psi": [14.7, 14.7], "pressure_atm": [1.0, 1.0],
         "note": "Challenge gives 14.7 psi. The 21% oxygen figure is the standard value and is implied by the challenge's "
                 "'more than a 40% increase' comparison; cite a source before presenting it.",
         "source": challenge, "status": "pressure_from_challenge_o2_needs_source"},
    ]


def main():
    data, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    os.makedirs(out, exist_ok=True)
    inv = build_investigations(data)
    tests = build_tests(data)
    hab = build_habitats()
    for name, obj in (("investigations.json", inv), ("tests.json", tests), ("habitats.json", hab)):
        with open(os.path.join(out, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        print(f"wrote {name}: {len(obj)} entries, {os.path.getsize(os.path.join(out, name)) / 1e3:.0f} KB")

    ids = [t["id"] for t in tests]
    assert len(ids) == len(set(ids)), "duplicate test ids"
    amb = [t for t in tests if t["o2_basis"] == "ambient"]
    print("\nchecks")
    print("  tests by fuel class:", {c: sum(t["fuel_class"] == c for t in tests) for c in ("solid", "droplet", "gas")})
    print("  ambient-oxygen tests:", len(amb), "| burner-oxidizer tests:", len(tests) - len(amb))
    print("  ambient with oxygen and pressure:", sum(t["o2_fraction"] is not None and t["pressure_atm"] is not None for t in amb))
    print("  ambient at >=30% oxygen:", sum((t["o2_fraction"] or 0) >= MOON_MIN_O2 for t in amb))
    env = [t for t in tests if t["in_moon_envelope"]]
    print("  inside Moon Base envelope:", len(env), "by fuel class",
          {c: sum(t["fuel_class"] == c for t in env) for c in ("solid", "droplet", "gas")},
          "investigations", sorted({t["investigation"] for t in env}))
    fl = {}
    for t in tests:
        for f in t["flags"]:
            k = f.split(":")[0]
            fl[k] = fl.get(k, 0) + 1
    print("  flags:", fl)


if __name__ == "__main__":
    main()
