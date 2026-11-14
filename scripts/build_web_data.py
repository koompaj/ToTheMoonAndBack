"""Convert the downloaded NASA PSI files into the JSON the web app reads.

Every value comes from NASA's files in <data_dir>. Nothing is invented: a value
that is missing or unusable in the source becomes null and gets a flag.

Writes to <out_dir>:
  investigations.json   one entry per Combustion Science investigation (24)
  tests.json            one entry per real test row, in a common format (12 tables)
  other_tables.json     the 10 tables that are not one-row-per-burn, cells as published
  habitats.json         habitat oxygen/pressure boxes, each with its source
  data_quality.json     per table: rows read, rows used, rows left out and why; flag meanings

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

FLAG_MEANINGS = {
    "o2_not_numeric": "The oxygen cell holds a label (e.g. RAMP, LOW O2), not a single number.",
    "o2_missing": "The oxygen cell is blank.",
    "o2_not_in_table": "The source table has no oxygen column.",
    "o2_approximate": "The source gives oxygen as an approximate value (written with ~).",
    "o2_range": "The source gives oxygen as a range; see o2_fraction_min and o2_fraction_max.",
    "pressure_missing": "The pressure cell is blank or zero.",
    "pressure_not_numeric": "The pressure cell is not a number.",
    "pressure_not_in_table": "The source table has no pressure column.",
    "fuel_from_row_above": "The material cell is blank (merged cell in the source); filled from the row above.",
    "duplicate_row": "Every cell of this row is identical to an earlier row of the same table.",
    "airflow_negative_in_source": "The source records a negative air rate; kept as written.",
}

# The 10 tables that are not one-row-per-burn. Cells are published exactly as in the source.
OTHER_TABLES = [
    ("PSI-20", "PSI-20/PSI-20_Experimental table_ACME BRE.csv", "per_day_summary",
     "One row per test day; oxygen cells list every concentration used that day.",
     ["Two oxygen cells read '2100%' and '3400%' (percent-format artefact); see corrections."]),
    ("PSI-21", "PSI-21/PSI-21_Experimental table_CLD Flame.csv", "per_day_summary",
     "One row per test day.",
     ["'Fuel Bottle' runs C2H4, C2H5 ... C2H11: looks like spreadsheet autofill. Not corrected; "
      "confirm the real fuel against the PSI record before quoting this column."]),
    ("PSI-22", "PSI-22/PSI-22_Experimental table_ACME E-FIELD Flames.csv", "per_day_summary",
     "One row per test day, with continuation rows.",
     ["11 of 32 rows carry only a fuel concentration: they continue the row above. Not filled in."]),
    ("PSI-23", "PSI-23/PSI-23_Experimental table_ACME s-Flame.csv", "per_day_summary",
     "One row per test day.",
     ["'Atmosphere*' runs N2, N3 ... N6: looks like spreadsheet autofill. Not corrected; confirm "
      "against the PSI record before quoting this column."]),
    ("PSI-68", "PSI-68/PSI-68_Experimental table_Flex2.csv", "ranges",
     "One row per fuel, giving the ranges tested rather than individual tests.", []),
    ("PSI-106", "PSI-106/PSI-106_Experimental table_Slice.csv", "per_day_summary",
     "One row per test date with the fuel used.",
     ["One 'Test Date' cell also contains free text ('2012-FEB-13 SLICE testing with')."]),
    ("PSI-142", "PSI-142/PSI-142_Experimental table_Data Summary Table.csv", "figure_index",
     "An index of published figures, not tests.", []),
    ("PSI-47", "PSI-47/PSI-47_Experimental table_DAFT.csv", "sessions",
     "Two dust-measurement sessions; no combustion.", []),
    ("PSI-102", "PSI-102/PSI-102_Experimental table_SAME.csv", "smoke_tests",
     "Smoke from heated materials, for detector research; not flame tests.",
     ["Rows 5-8 say 'same conditions as 1-4' instead of repeating the values."]),
    ("PSI-101", "PSI-101/PSI-101_Experimental table_SAME-R.csv", "smoke_tests",
     "Smoke from heated materials, for detector research; not flame tests.",
     ["The 'Date' column has no year."]),
]


def read_csv(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = [[c.strip() for c in r] for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    return rows[0], rows[1:]


def strict_num(cell):
    """A cell that is exactly one number, else None (rejects 'RAMP', '#DIV/0!', '-')."""
    cell = (cell or "").strip()
    return float(cell) if re.fullmatch(r"-?\d*\.?\d+", cell) else None


def lead_num(cell):
    """Leading number of a cell such as '0.5 atm' or '20 cm/s'."""
    m = re.match(r"\s*(-?\d*\.?\d+)", cell or "")
    return float(m.group(1)) if m else None


def split5(s):
    return [p.strip() for p in re.split(r"\s{3,}", s or "") if p.strip()]


def parse_o2_percent(cell):
    """SAFFIRE-style oxygen cells: '~ 21.5', '21.5 - 21.7', '22.1 to 22.0'.
    Returns (fraction, min, max, flags)."""
    cell = (cell or "").strip()
    if not cell:
        return None, None, None, ["o2_missing"]
    m = re.fullmatch(r"~\s*(\d+(?:\.\d+)?)", cell)
    if m:
        v = float(m.group(1)) / 100
        return v, None, None, ["o2_approximate"]
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)", cell)
    if m:
        a, b = float(m.group(1)) / 100, float(m.group(2)) / 100
        return None, min(a, b), max(a, b), ["o2_range"]
    v = strict_num(cell)
    if v is not None:
        return v / 100, None, None, []
    return None, None, None, ["o2_not_numeric:" + cell]


class Builder:
    def __init__(self, data):
        self.T = os.path.join(data, "tables")
        self.tests = []
        self.quality = []       # one entry per table
        self.table_use = {}     # "tables/..." -> where it went

    def table(self, rel):
        header, body = read_csv(os.path.join(self.T, rel))
        q = {"source_table": "tables/" + rel, "investigation": rel.split("/")[0],
             "rows_in_source": len(body), "rows_as_tests": 0, "rows_left_out": [], "used_in": "tests.json"}
        self.quality.append(q)
        self.table_use["tables/" + rel] = "tests.json"
        return header, body, q

    def add(self, q, acc, acronym, row, label, fuel_class, fuel, o2, o2_basis, p_atm, flags, **extra):
        in_env = None
        if o2 is not None and p_atm is not None and o2_basis == "ambient":
            in_env = o2 >= MOON_MIN_O2 and p_atm <= MOON_MAX_P_ATM
        table = q["source_table"]
        slug = os.path.splitext(os.path.basename(table))[0].split("_")[-1].replace(" ", "-").lower()
        d = {
            "id": f"{acc}:{slug}:{row}",
            "investigation": acc, "acronym": acronym,
            "source_table": table, "source_row": row,   # 1 = first data row under the header
            "test_label": (label or "").strip() or None,
            "fuel_class": fuel_class, "fuel": (fuel or "").strip() or None,
            "o2_fraction": None if o2 is None else round(o2, 4),
            "o2_fraction_min": None, "o2_fraction_max": None,
            "o2_basis": o2_basis,   # ambient = cabin/chamber air; burner_oxidizer = gas fed from the burner
            "pressure_atm": None if p_atm is None else round(p_atm, 4),
            "airflow_cm_s": None, "flow_direction": None,
            "co2_fraction": None, "he_fraction": None,
            "burn_time_s": None, "outcome": None,
            "in_moon_envelope": in_env,
            "source_extra": None,   # other cells of the source row, exactly as published
            "flags": flags,
        }
        d.update(extra)
        self.tests.append(d)
        q["rows_as_tests"] += 1

    @staticmethod
    def flags_for(o2, p, o2_cell="", p_cell=""):
        f = []
        if o2 is None:
            f.append("o2_not_numeric:" + o2_cell if o2_cell else "o2_missing")
        if p is None:
            f.append("pressure_missing" if not p_cell or lead_num(p_cell) == 0 else "pressure_not_numeric")
        return f

    # ---- gas flames (ACME) -------------------------------------------------
    def flame_design(self):
        _, body, q = self.table("PSI-10/PSI-10_Experimental table_Flame Design_Normal Flame.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[8]), strict_num(r[10])
            self.add(q, "PSI-10", "ACME Flame Design", i, r[3], "gas", r[2], o2, "ambient", p,
                     self.flags_for(o2, p, r[8], r[10]))
        _, body, q = self.table("PSI-10/PSI-10_Experimental table_Flame Design_Inverse Flame.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[3]), strict_num(r[9])
            self.add(q, "PSI-10", "ACME Flame Design", i, r[2], "gas", "C2H4", o2, "burner_oxidizer", p,
                     self.flags_for(o2, p, r[3], r[9]))

    def cfi_g(self):
        outcome = {"SE": "self-extinguished", "FT": "flow terminated"}
        _, body, q = self.table("PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv")
        for i, r in enumerate(body, 1):
            o2, pb = strict_num(r[5]), strict_num(r[7])
            p = None if pb is None else pb / 1.01325
            self.add(q, "PSI-159", "ACME CFI-G", i, r[3], "gas", r[2], o2, "ambient", p,
                     self.flags_for(o2, p, r[5], r[7]), burn_time_s=strict_num(r[14]), outcome=outcome.get(r[15]))
        _, body, q = self.table("PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv")
        for i, r in enumerate(body, 1):
            o2, pb = strict_num(r[7]), strict_num(r[6])
            p = None if pb is None else pb / 1.01325
            self.add(q, "PSI-159", "ACME CFI-G", i, r[3], "gas", r[2], o2, "burner_oxidizer", p,
                     self.flags_for(o2, p, r[7], r[6]), burn_time_s=strict_num(r[14]), outcome=outcome.get(r[15]))

    # ---- gas-jet flames with airflow (SPICE) -------------------------------
    def spice(self):
        header, body, q = self.table("PSI-107/PSI-107_Experimental table_Spice.csv")
        seen = {}
        for i, r in enumerate(body, 1):
            flags = ["o2_not_in_table", "pressure_not_in_table"]
            key = tuple(r)
            if key in seen:
                flags.append(f"duplicate_row:{seen[key]}")
            else:
                seen[key] = i
            air = strict_num(r[8])
            if air is not None and air < 0:
                flags.append("airflow_negative_in_source")
            fuel = re.sub(r"(\d)\s+%", r"\1%", r[3])   # "75 % Propylene" and "75% Propylene" are one fuel
            extra = {header[j].strip(): r[j] for j in (0, 1, 2, 4, 5, 6, 7) if r[j]}
            self.add(q, "PSI-107", "SPICE", i, None, "gas", fuel, None, "ambient", None, flags,
                     airflow_cm_s=air, source_extra=extra)

    # ---- droplets ----------------------------------------------------------
    def flex(self):
        _, body, q = self.table("PSI-69/PSI-69_Experimental table_FLEX.csv")
        for i, r in enumerate(body, 1):
            o2, mm = strict_num(r[6]), strict_num(r[5])
            p = None if (mm is None or mm == 0) else mm / 760
            self.add(q, "PSI-69", "FLEX", i, r[1], "droplet", r[4], o2, "ambient", p,
                     self.flags_for(o2, p, r[6], r[5]), co2_fraction=strict_num(r[8]), he_fraction=strict_num(r[9]),
                     burn_time_s=strict_num(r[13]), outcome=(r[14].lower() or None))

    def cfi(self):
        _, body, q = self.table("PSI-39/PSI-39_Experimental table_CFI.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[5]), lead_num(r[4])
            self.add(q, "PSI-39", "CFI", i, r[0], "droplet", r[9], o2, "ambient", p,
                     self.flags_for(o2, p, r[5], r[4]), he_fraction=strict_num(r[7]))

    # ---- solid materials ---------------------------------------------------
    def bass2(self):
        _, body, q = self.table("PSI-25/PSI-25_Experimental table_BASS-II.csv")
        for i, r in enumerate(body, 1):
            pct = strict_num(r[11])
            o2 = None if pct is None else pct / 100
            flags = ([] if o2 is not None else ["o2_not_numeric:" + r[11] if r[11] else "o2_missing"])
            self.add(q, "PSI-25", "BASS-II", i, r[1], "solid", r[5], o2, "ambient", None,
                     flags + ["pressure_not_in_table"])

    def bass(self):
        _, body, q = self.table("PSI-26/PSI-26_Experimental table_BASS.csv")
        for i, r in enumerate(body, 1):
            if not r[3] and not r[2]:
                q["rows_left_out"].append({"row": i, "reason": f"not a test: '{r[5]}' with no test number"})
                continue
            self.add(q, "PSI-26", "BASS", i, r[3], "solid", r[5], None, "ambient", None,
                     ["o2_not_in_table", "pressure_not_in_table"],
                     source_extra={"Date": r[0], "As Run Test #": r[2], "Sample #": r[4]})

    def saffire(self):
        # column positions differ between the three SAFFIRE tables
        specs = [
            ("PSI-98", "SAFFIRE-I", "PSI-98/PSI-98_Experimental table_SAFFIRE-1.csv",
             dict(air=5, o2=6, burn=9, direction=10)),
            ("PSI-99", "SAFFIRE-II", "PSI-99/PSI-99_Experimental table_SAFFIRE-2.csv",
             dict(air=5, o2=6, burn=9, direction=10)),
            ("PSI-100", "SAFFIRE-III", "PSI-100/PSI-100_Experimental table_SAFFIRE-3.csv",
             dict(air=5, o2=None, burn=None, direction=6)),
        ]
        for acc, acronym, rel, c in specs:
            header, body, q = self.table(rel)
            header = [h.replace("?-g", "µ-g") for h in header]   # the µ was lost in NASA's file
            last_material = None
            for i, r in enumerate(body, 1):
                if r[0].lower().startswith("note"):
                    q["rows_left_out"].append({"row": i, "reason": "table footnote, not a test: " + r[0][:60]})
                    continue
                if r[1].lower().startswith("pre-test"):
                    q["rows_left_out"].append({"row": i, "reason": "pre-test flow visualisation, not a burn"})
                    continue
                flags = ["pressure_not_in_table"]
                material = r[1]
                if material:
                    last_material = material
                else:
                    material = last_material
                    flags.append("fuel_from_row_above")
                if c["o2"] is None:
                    o2, lo, hi = None, None, None
                    flags.append("o2_not_in_table")
                else:
                    o2, lo, hi, f = parse_o2_percent(r[c["o2"]])
                    flags += f
                burn_cell = r[c["burn"]] if c["burn"] is not None else ""
                burn = lead_num(burn_cell)
                direction = r[c["direction"]].lower() or None
                used = {0, 1, c["air"], c["direction"]} | {x for x in (c["o2"], c["burn"]) if x is not None}
                extra = {header[j].strip(): r[j] for j in range(len(header)) if j not in used and r[j]}
                if burn_cell and burn is None:
                    extra["Burn Time (as written)"] = burn_cell
                self.add(q, acc, acronym, i, r[0], "solid", material, o2, "ambient", None, flags,
                         o2_fraction_min=None if lo is None else round(lo, 4),
                         o2_fraction_max=None if hi is None else round(hi, 4),
                         airflow_cm_s=lead_num(r[c["air"]]), flow_direction=direction,
                         burn_time_s=burn, source_extra=extra)

    def build(self):
        self.flame_design()
        self.cfi_g()
        self.spice()
        self.flex()
        self.cfi()
        self.bass2()
        self.bass()
        self.saffire()
        return self.tests


def build_other_tables(data, builder):
    search = {s["Accession"]: s for s in json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))}
    out = []
    for acc, rel, kind, why, issues in OTHER_TABLES:
        header, body = read_csv(os.path.join(data, "tables", rel))
        corrections = []
        if acc == "PSI-20":
            col = header.index("Oxygen Conc (percent)")
            for i, r in enumerate(body, 1):
                m = re.fullmatch(r"(\d+)00%", r[col])
                if m:
                    corrections.append({"row": i, "column": header[col], "as_published": r[col],
                                        "read_as": m.group(1),
                                        "reason": "percent-format artefact; other rows list plain percentages"})
        out.append({
            "investigation": acc, "acronym": (search[acc].get("Acronym") or "").strip() or None,
            "source_table": "tables/" + rel, "kind": kind, "why_not_tests": why,
            "columns": header, "rows": body,          # cells exactly as published
            "known_issues": issues, "corrections": corrections,
        })
        builder.table_use["tables/" + rel] = "other_tables.json"
        builder.quality.append({"source_table": "tables/" + rel, "investigation": acc,
                                "rows_in_source": len(body), "rows_as_tests": 0, "rows_left_out": [],
                                "used_in": "other_tables.json", "kind": kind, "why_not_tests": why})
    return out


def build_investigations(data, table_use):
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
            tables.append({"file": t["file"], "rows": len(body), "used_in": table_use.get(t["file"])})
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
    b = Builder(data)
    tests = b.build()
    other = build_other_tables(data, b)
    inv = build_investigations(data, b.table_use)
    hab = build_habitats()

    flag_counts = {}
    for t in tests:
        for f in t["flags"]:
            k = f.split(":")[0]
            flag_counts[k] = flag_counts.get(k, 0) + 1
    quality = {"tables": b.quality, "flag_counts": flag_counts, "flag_meanings": FLAG_MEANINGS,
               "source_problems": "docs/DATA_ISSUES.md"}

    for name, obj in (("investigations.json", inv), ("tests.json", tests), ("other_tables.json", other),
                      ("habitats.json", hab), ("data_quality.json", quality)):
        with open(os.path.join(out, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        n = len(obj) if isinstance(obj, list) else len(obj["tables"])
        print(f"wrote {name}: {n} entries, {os.path.getsize(os.path.join(out, name)) / 1e3:.0f} KB")

    # ---- checks -------------------------------------------------------------
    ids = [t["id"] for t in tests]
    assert len(ids) == len(set(ids)), "duplicate test ids"
    all_tables = {t["file"] for i in inv for t in i["tables"]}
    unaccounted = sorted(t for t in all_tables if t not in b.table_use)
    assert not unaccounted, f"tables not accounted for: {unaccounted}"
    unknown_flags = sorted(set(flag_counts) - set(FLAG_MEANINGS))
    assert not unknown_flags, f"flags without a meaning: {unknown_flags}"
    for q in b.quality:
        assert q["rows_as_tests"] + len(q["rows_left_out"]) == q["rows_in_source"] or q["used_in"] != "tests.json", q

    amb = [t for t in tests if t["o2_basis"] == "ambient"]
    cls = ("solid", "droplet", "gas")
    print("\nchecks")
    print(f"  tables: {len(all_tables)} total, "
          f"{sum(v == 'tests.json' for v in b.table_use.values())} in tests.json, "
          f"{sum(v == 'other_tables.json' for v in b.table_use.values())} in other_tables.json")
    print("  source rows:", sum(q["rows_in_source"] for q in b.quality),
          "| as tests:", len(tests),
          "| left out of test tables:", sum(len(q["rows_left_out"]) for q in b.quality),
          "| in other tables:", sum(q["rows_in_source"] for q in b.quality if q["used_in"] != "tests.json"))
    print("  tests by fuel class:", {c: sum(t["fuel_class"] == c for t in tests) for c in cls})
    print("  ambient-oxygen tests:", len(amb), "| burner-oxidizer tests:", len(tests) - len(amb))
    print("  ambient with oxygen value:", sum(t["o2_fraction"] is not None for t in amb),
          "| with oxygen range only:", sum(t["o2_fraction_min"] is not None for t in amb))
    print("  ambient with oxygen and pressure:", sum(t["o2_fraction"] is not None and t["pressure_atm"] is not None for t in amb))
    print("  ambient at >=30% oxygen:", sum((t["o2_fraction"] or 0) >= MOON_MIN_O2 for t in amb))
    solid_o2 = [t["o2_fraction"] if t["o2_fraction"] is not None else t["o2_fraction_max"]
                for t in tests if t["fuel_class"] == "solid"]
    solid_o2 = [v for v in solid_o2 if v is not None]
    print(f"  solid tests with any oxygen value: {len(solid_o2)}, highest {max(solid_o2):.3f}")
    env = [t for t in tests if t["in_moon_envelope"]]
    print("  inside Moon Base envelope:", len(env), "by fuel class",
          {c: sum(t["fuel_class"] == c for t in env) for c in cls},
          "investigations", sorted({t["investigation"] for t in env}))
    print("  tests with airflow:", sum(t["airflow_cm_s"] is not None for t in tests))
    print("  flags:", flag_counts)
    print("  rows left out:")
    for q in b.quality:
        for x in q["rows_left_out"]:
            print(f"    {q['investigation']} row {x['row']}: {x['reason']}")


if __name__ == "__main__":
    main()
