"""Convert the downloaded NASA PSI files into the JSON the web app reads.

Every value comes from NASA's files in <data_dir>. Nothing is invented: a value
that is missing or unusable in the source becomes null and gets a flag.

Writes to <out_dir>:
  investigations.json   one entry per Combustion Science investigation (24)
  tests.json            one entry per real test row, in a common format (12 tables)
  other_tables.json     the 10 tables that are not one-row-per-burn, cells as published
  habitats.json         habitat oxygen/pressure boxes, each with its checked source
  data_quality.json     per table: rows read, rows used, rows left out and why; flag meanings;
                        distinct-test count
  outcomes.json         "will it go out" analysis (written by outcome_analysis.py, run from here)
  fuels.json            the fuels a user can pick on the habitat evidence map, with their evidence in
                        every habitat (docs/LAYOUT_PLAN.md)

Usage:  python -I build_web_data.py <data_dir> <out_dir>
"""
import csv
import io
import json
import os
import re
import sys

PSI_PAGE = "https://psi.nasa.gov/physci/repo/data/investigations/"
PSI_PER_ATM = 14.696
PSI_TO_ATM = 1 / PSI_PER_ATM
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
    "airflow_negative_in_source": "The source records a negative air rate; kept as written. Its meaning is not stated, "
                                  "so leave it out of airflow ranges (airflowRange() in data/load.ts does).",
    "material_not_stated": "The material cell names a shape or size (e.g. '2 cm sphere', '1/4\" black rod') but not the "
                           "material, so fuel_material is null.",
    "time_not_recorded": "The time cell holds no time (e.g. 'Ku LOS', 'no ku', 'n/a') or an unclear format such as '1744'; "
                         "the cell is kept as written in source_extra.",
    "burn_time_from_gmt_times": "burn_time_s is the table's GMT flame-off time minus its GMT ignition time.",
    "dimensions_swapped_in_source": "The table lists length 40.6 cm and width 94 cm. NASA's Saffire fact sheet gives the "
                                    "sample as 0.4 m wide by 1 m long (and the SAFFIRE-III table agrees), so "
                                    "sample_length_cm and sample_width_cm are given the right way round. source_extra "
                                    "keeps the table as written.",
    "thickness_typo_suspected": "The thickness cell reads '037 mm' (probably 0.37 mm). Not corrected: sample_thickness_mm "
                                "is null.",
    "value_not_single": "A dimension cell holds more than one value or a reference (e.g. '0.85 and 0.37 mm', 'See Fig. "
                        "5'), so the typed field is null; the cell is kept in source_extra.",
    "burning_rate_unit_unclear": "NASA's header gives the burning-rate unit only as 'mm'; part of the unit may have been "
                                 "lost in the file. The number is kept as written.",
    "pressure_from_report": "The table has no pressure; NASA's report states one for these tests (pressure_source "
                            "gives the report, page and words). Checked by hand; see data_sourced/solid_conditions.json.",
    "pressure_range_from_report": "NASA's report gives a pressure range for these tests (pressure_atm_min / max, "
                                  "with pressure_source); no single value, so the test is not placed on the map.",
    "pressure_range_from_sensor_log": "NASA's sensor log for this burn records ambient pressure in PSIA; "
                                      "pressure_atm_min / max is its range over the log (pressure_source says where). "
                                      "No single value, so the test is not placed on the map.",
    "o2_from_sensor_log": "NASA's sensor log for this burn records oxygen (%); o2_sensor_min / max is its range over "
                          "the log. The table's own oxygen value, if any, is kept unchanged.",
    "o2_differs_from_sensor_log": "The table's oxygen and the sensor log's oxygen for this burn do not overlap "
                                  "(e.g. 21.5-21.7 % against 22.2-22.7 %). NASA does not say which is right.",
    "extinction_diameter_above_initial":"The extinction diameter is a little larger than the initial droplet diameter "
                                         "(by no more than the table's 0.01 mm step, in a flame that went out within "
                                         "a second). Kept as written.",
    "shape_not_stated": "Neither the test's own columns nor a NASA document we checked states the fuel's shape, so "
                        "fuel_shape is null (fuel_size_text may still give a size the row states).",
    "temperature_placeholder":"The peak burner temperature cell holds a placeholder ('-', '#VALUE!', or 273.15 K beside an "
                               "empty Celsius cell), so peak_burner_temp_c is null.",
}

SOLID_MATERIALS = [  # (pattern, material) - first match wins; matching is case-insensitive
    (r"pmma.*nomex|nomex.*pmma", "PMMA and Nomex"),
    (r"pmma", "PMMA"),
    (r"sibal|cotton", "SIBAL (cotton-fiberglass blend)"),
    (r"nomex", "Nomex"),
    (r"ultem", "Ultem"),
    (r"silicone", "Silicone"),
    (r"japan", "Japan wax"),
    (r"paraffin|parrafin", "Paraffin wax"),
    (r"wax|candle", "Wax (type not stated)"),
]


def collapse_ws(s):
    return re.sub(r"\s+", " ", s or "").strip()


def solid_material(fuel):
    for pat, name in SOLID_MATERIALS:
        if re.search(pat, fuel or "", re.I):
            return name
    return None


def parse_time(cell):
    """'14:37:08' or '14.34.57' -> '14:37:08'; anything else -> None."""
    m = re.fullmatch(r"(\d{1,2})[:.](\d{2})[:.](\d{2})", (cell or "").strip())
    if not m:
        return None
    h, mi, s = (int(x) for x in m.groups())
    return f"{h:02d}:{mi:02d}:{s:02d}" if h < 24 and mi < 60 and s < 60 else None


def seconds(hms):
    h, m, s = (int(x) for x in hms.split(":"))
    return h * 3600 + m * 60 + s


def length_cm(cell):
    """'29 cm' -> 29, '0.37' (header in cm) handled by caller; returns None for anything not one value."""
    m = re.fullmatch(r"\s*(\d*\.?\d+)\s*(cm|mm)?\s*", cell or "")
    if not m:
        return None
    v = float(m.group(1))
    return v / 10 if m.group(2) == "mm" else v


def extra_cells(header, row, used):
    """The source cells not turned into typed fields, keyed by header, exactly as written."""
    return {header[j].strip(): row[j] for j in range(len(header)) if j not in used and j < len(row) and row[j]}

# The 10 tables that are not one-row-per-burn. Cells are published exactly as in the source.
OTHER_TABLES = [
    ("PSI-20", "PSI-20/PSI-20_Experimental table_ACME BRE.csv", "per_day_summary",
     "One row per test day; oxygen cells list every concentration used that day.",
     ["Two oxygen cells read '2100%' and '3400%' (percent-format artefact); read as 21 and 34 in rows_read_as."]),
    ("PSI-21", "PSI-21/PSI-21_Experimental table_CLD Flame.csv", "per_day_summary",
     "One row per test day.",
     ["'Fuel Bottle' counts up CH4, CH5 ... CH14 and C2H4, C2H5 ... C2H11 (spreadsheet autofill). NASA's record "
      "names only methane and ethylene, so rows_read_as gives CH4 or C2H4 to match each row's test type."]),
    ("PSI-22", "PSI-22/PSI-22_Experimental table_ACME E-FIELD Flames.csv", "per_day_summary",
     "One row per test day, with continuation rows.",
     ["11 of 32 rows carry only a fuel concentration: they continue the row above, and rows_read_as repeats "
      "that day's other cells. Flames Ignited is not repeated, so daily counts are not double-counted.",
      "Test day 18319 appears twice with identical cells (rows 25-28 and 29-32); which is right is not stated."]),
    ("PSI-23", "PSI-23/PSI-23_Experimental table_ACME s-Flame.csv", "per_day_summary",
     "One row per test day.",
     ["'Atmosphere*' and 'Fuel Bottle' count up N2, N3 ... N6 (spreadsheet autofill); read as N2 in rows_read_as."]),
    ("PSI-68", "PSI-68/PSI-68_Experimental table_Flex2.csv", "ranges",
     "One row per fuel, giving the ranges tested rather than individual tests.", []),
    ("PSI-106", "PSI-106/PSI-106_Experimental table_Slice.csv", "per_day_summary",
     "One row per test date with the fuel used.",
     ["Four 'Test Date' cells also hold text that runs into the Fuel Type column (e.g. '2012-FEB-13 SLICE "
      "testing with'); rows_read_as keeps the date only."]),
    ("PSI-142", "PSI-142/PSI-142_Experimental table_Data Summary Table.csv", "figure_index",
     "An index of published figures, not tests.", []),
    ("PSI-47", "PSI-47/PSI-47_Experimental table_DAFT.csv", "sessions",
     "Two dust-measurement sessions; no combustion.", []),
    ("PSI-102", "PSI-102/PSI-102_Experimental table_SAME.csv", "smoke_tests",
     "Smoke from heated materials, for detector research; not flame tests.",
     ["Rows 5-8 say 'same conditions as 1-4' instead of repeating the values. Samples 1-4 used several "
      "settings, so those cells stay blank; rows_read_as keeps the material name only."]),
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


def sourced_text(f):
    """How a value from data_sourced/ is cited on a test: document, place in it, exact words."""
    return f"{f.get('source_title') or f['source_file']}, {f['location']}: \"{f['quote']}\""


# ---- item 10: fuel shape and size -----------------------------------------------------------
# Solid samples: only a shape word in the row's own fuel cell counts (first match wins).
SHAPE_WORDS = [(r"spherical section", "spherical section"), (r"sphere", "sphere"), (r"\brod\b", "rod"),
               (r"\bfilm\b", "film"), (r"\bslab\b", "slab"), (r"\bsheet\b", "sheet"), (r"\bcandle\b", "candle")]
SIZE_RE = re.compile(r'\d+(?:\.\d+)?(?:/\d+)?\s*(?:"|cm\b|mm\b|micron\b)(?:\s+(?:wide|thick)\b)?', re.I)
FUEL_CELL = "Fuel Sample Material"   # the fuel column of the BASS and BASS-II tables


def shape_facts(data):
    path = os.path.join(os.path.dirname(os.path.abspath(data)), "data_sourced", "shapes.json")
    return json.load(open(path, encoding="utf-8"))["facts"] if os.path.exists(path) else []


def shape_fact_text(f):
    words = [f["quote"]] + [f[k] for k in ("shape_quote", "size_quote") if f.get(k)]
    return f"{f['source_title']} ({f['source_file']}), {f['location']}: " + "; ".join(f'"{w}"' for w in words)


def apply_shapes(tests, facts):
    """fuel_shape, fuel_size_text, fuel_shape_source: only where the row or a NASA document states them."""
    for t in tests:
        shape = size = src = None
        acc, extra = t["investigation"], t["source_extra"] or {}
        if acc in ("PSI-25", "PSI-26") and t["fuel"]:
            low = t["fuel"].lower()
            shape = next((name for pat, name in SHAPE_WORDS if re.search(pat, low)), None)
            sizes = SIZE_RE.findall(t["fuel"])
            size = ", ".join(collapse_ws(x) for x in sizes) or None
            if shape or size:
                src = f"column '{FUEL_CELL}' of this row: \"{t['fuel']}\""
        elif acc in ("PSI-98", "PSI-99", "PSI-100"):
            parts = [f"{t['sample_thickness_mm']:g} mm thick" if t["sample_thickness_mm"] is not None else None,
                     f"{t['sample_length_cm']:g} cm long" if t["sample_length_cm"] is not None else None,
                     f"{t['sample_width_cm']:g} cm wide" if t["sample_width_cm"] is not None else None]
            size = ", ".join(x for x in parts if x) or None
            if size:
                src = ("sample thickness, length and width columns of this row (sample_thickness_mm, sample_length_cm, "
                       "sample_width_cm; see their flags)")
        elif acc == "PSI-69":
            shape = "droplet"
            src = "column 'Droplet initial diameter; mm' (a FLEX droplet table)"
            if t["droplet_diameter_mm"] is not None:
                size = f"{t['droplet_diameter_mm']:g} mm initial diameter"
        else:
            for f in facts:
                a = f["applies_to"]
                if f["investigation"] != acc:
                    continue
                if a.get("all_rows") or ("column" in a and (extra.get(a["column"]) or "") == a["value"]):
                    shape, size, src = f["fuel_shape"], f.get("fuel_size_text"), shape_fact_text(f)
                    col = f.get("size_column")
                    if col and extra.get(col):
                        size = f"nozzle {extra[col]} mm (column '{col}')"
                    break
        t["fuel_shape"], t["fuel_size_text"], t["fuel_shape_source"] = shape, size, src
        if shape is None:
            t["flags"] = t["flags"] + ["shape_not_stated"]


class Builder:
    def __init__(self, data):
        self.T = os.path.join(data, "tables")
        self.tests = []
        self.quality = []       # one entry per table
        self.table_use = {}     # "tables/..." -> where it went
        # Conditions NASA's tables leave out, from NASA's reports and sensor logs (hand-checked; see
        # docs/PSI_DOCUMENTS.md). Kept outside data/, which stays exactly as downloaded.
        path = os.path.join(os.path.dirname(os.path.abspath(data)), "data_sourced", "solid_conditions.json")
        self.facts = json.load(open(path, encoding="utf-8"))["facts"] if os.path.exists(path) else []

    def fact(self, acc, quantity, pi=None, label=None):
        for f in self.facts:
            a = f["applies_to"]
            if f["investigation"] == acc and f["quantity"] == quantity and (
                    (pi is not None and a.get("column") == "PI" and a.get("value") == pi)
                    or (label is not None and a.get("test_label") == label)):
                return f
        return None

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
            "fuel_class": fuel_class, "fuel": collapse_ws(fuel) or None,
            # solid materials only: the base material named in the fuel cell (SOLID_MATERIALS), else null
            "fuel_material": None,
            "o2_fraction": None if o2 is None else round(o2, 4),
            "o2_fraction_min": None, "o2_fraction_max": None,
            "o2_basis": o2_basis,   # ambient = cabin/chamber air; burner_oxidizer = gas fed from the burner
            "pressure_atm": None if p_atm is None else round(p_atm, 4),
            "airflow_cm_s": None, "flow_direction": None,
            "co2_fraction": None, "he_fraction": None,
            "burn_time_s": None, "outcome": None,
            # typed values from columns specific to some tables (null elsewhere)
            "sample_length_cm": None, "sample_width_cm": None, "sample_thickness_mm": None,   # SAFFIRE
            "droplet_diameter_mm": None, "extinction_diameter_mm": None, "burning_rate": None,  # FLEX
            "cool_flame": None, "hot_ignition": None, "peak_burner_temp_c": None,           # ACME CFI-G
            "ignition_time": None, "flame_off_time": None,                                  # SPICE (GMT)
            # conditions from NASA's reports and sensor logs when the table has none (data_sourced/)
            "pressure_atm_min": None, "pressure_atm_max": None, "pressure_source": None,
            "o2_sensor_min": None, "o2_sensor_max": None,
            "in_moon_envelope": in_env,
            "source_extra": None,   # other cells of the source row, exactly as published
            "flags": flags,
        }
        d.update(extra)
        if fuel_class == "solid":
            d["fuel_material"] = solid_material(d["fuel"])
            if d["fuel_material"] is None and d["fuel"]:
                d["flags"] = d["flags"] + ["material_not_stated"]
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
        header, body, q = self.table("PSI-10/PSI-10_Experimental table_Flame Design_Normal Flame.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[8]), strict_num(r[10])
            self.add(q, "PSI-10", "ACME Flame Design", i, r[3], "gas", r[2], o2, "ambient", p,
                     self.flags_for(o2, p, r[8], r[10]), source_extra=extra_cells(header, r, {2, 3, 8, 10}))
        header, body, q = self.table("PSI-10/PSI-10_Experimental table_Flame Design_Inverse Flame.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[3]), strict_num(r[9])
            self.add(q, "PSI-10", "ACME Flame Design", i, r[2], "gas", "C2H4", o2, "burner_oxidizer", p,
                     self.flags_for(o2, p, r[3], r[9]), source_extra=extra_cells(header, r, {2, 3, 9}))

    def cfi_g(self):
        outcome = {"SE": "self-extinguished", "FT": "flow terminated"}
        hot = {"yes": "yes", "no": "no", "flash": "flash"}   # 'Yes'/'yes' and 'No'/'no' are one label

        def peak(cell_c, cell_k=None):
            c = strict_num(cell_c)
            if c is not None:
                return c, []
            placeholder = cell_c in ("-", "", "#VALUE!") or (cell_k or "") in ("273.15", "#VALUE!")
            return None, (["temperature_placeholder"] if placeholder else [])

        header, body, q = self.table("PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv")
        for i, r in enumerate(body, 1):
            o2, pb = strict_num(r[5]), strict_num(r[7])
            p = None if pb is None else pb / 1.01325
            t, tf = peak(r[16])
            self.add(q, "PSI-159", "ACME CFI-G", i, r[3], "gas", r[2], o2, "ambient", p,
                     self.flags_for(o2, p, r[5], r[7]) + tf, burn_time_s=strict_num(r[14]), outcome=outcome.get(r[15]),
                     cool_flame=r[4] or None, hot_ignition=hot.get(r[13].lower()), peak_burner_temp_c=t,
                     source_extra=extra_cells(header, r, {2, 3, 4, 5, 7, 13, 14, 15, 16}))
        header, body, q = self.table("PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv")
        for i, r in enumerate(body, 1):
            o2, pb = strict_num(r[7]), strict_num(r[6])
            p = None if pb is None else pb / 1.01325
            t, tf = peak(r[16], r[17])
            self.add(q, "PSI-159", "ACME CFI-G", i, r[3], "gas", r[2], o2, "burner_oxidizer", p,
                     self.flags_for(o2, p, r[7], r[6]) + tf, burn_time_s=strict_num(r[14]), outcome=outcome.get(r[15]),
                     hot_ignition=hot.get(r[13].lower()), peak_burner_temp_c=t,
                     source_extra=extra_cells(header, r, {2, 3, 6, 7, 13, 14, 15, 16}))

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
            ign, off = parse_time(r[1]), parse_time(r[2])
            if ign is None or (r[2] and off is None):
                flags.append("time_not_recorded")
            burn = None
            if ign and off and 0 <= seconds(off) - seconds(ign) < 3 * 3600:
                burn = float(seconds(off) - seconds(ign))
                flags.append("burn_time_from_gmt_times")
            extra = {header[j].strip(): r[j] for j in (0, 1, 2, 4, 5, 6, 7) if r[j]}
            self.add(q, "PSI-107", "SPICE", i, None, "gas", fuel, None, "ambient", None, flags,
                     airflow_cm_s=air, ignition_time=ign, flame_off_time=off, burn_time_s=burn, source_extra=extra)

    # ---- droplets ----------------------------------------------------------
    def flex(self):
        header, body, q = self.table("PSI-69/PSI-69_Experimental table_FLEX.csv")
        for i, r in enumerate(body, 1):
            o2, mm = strict_num(r[6]), strict_num(r[5])
            p = None if (mm is None or mm == 0) else mm / 760
            rate = strict_num(r[12])
            d0, dx = strict_num(r[10]), strict_num(r[11])
            near = ["extinction_diameter_above_initial"] if d0 is not None and dx is not None and dx > d0 else []
            self.add(q, "PSI-69", "FLEX", i, r[1], "droplet", r[4], o2, "ambient", p,
                     self.flags_for(o2, p, r[6], r[5]) + (["burning_rate_unit_unclear"] if rate is not None else []) + near,
                     co2_fraction=strict_num(r[8]), he_fraction=strict_num(r[9]),
                     burn_time_s=strict_num(r[13]), outcome=(r[14].lower() or None),
                     droplet_diameter_mm=strict_num(r[10]), extinction_diameter_mm=strict_num(r[11]), burning_rate=rate,
                     source_extra=extra_cells(header, r, {1, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14}))

    def cfi(self):
        header, body, q = self.table("PSI-39/PSI-39_Experimental table_CFI.csv")
        for i, r in enumerate(body, 1):
            o2, p = strict_num(r[5]), lead_num(r[4])
            self.add(q, "PSI-39", "CFI", i, r[0], "droplet", r[9], o2, "ambient", p,
                     self.flags_for(o2, p, r[5], r[4]), he_fraction=strict_num(r[7]),
                     source_extra=extra_cells(header, r, {0, 4, 5, 7, 9}))

    # ---- solid materials ---------------------------------------------------
    def bass2(self):
        header, body, q = self.table("PSI-25/PSI-25_Experimental table_BASS-II.csv")
        for i, r in enumerate(body, 1):
            pct = strict_num(r[11])
            o2 = None if pct is None else pct / 100
            flags = ([] if o2 is not None else ["o2_not_numeric:" + r[11] if r[11] else "o2_missing"])
            # The table has no pressure. NASA's BASS-II report gives it for two researchers' tests (PI column).
            f = self.fact("PSI-25", "pressure", pi=r[0])
            p, more = None, {}
            if f and "value" in f and f["unit"] == "atm":
                p = f["value"]
                flags += ["pressure_from_report"]
                more = {"pressure_source": sourced_text(f)}
            elif f and "range" in f and f["unit"] == "kPa":
                flags += ["pressure_not_in_table", "pressure_range_from_report"]
                more = {"pressure_atm_min": round(f["range"][0] / 101.325, 6), "pressure_atm_max": round(f["range"][1] / 101.325, 6),
                        "pressure_source": sourced_text(f)}
            else:
                flags += ["pressure_not_in_table"]
            # Fan and air display readings keep their cells as written: their units are not stated.
            self.add(q, "PSI-25", "BASS-II", i, r[1], "solid", r[5], o2, "ambient", p,
                     flags, source_extra=extra_cells(header, r, {1, 5, 11}), **more)

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
                # Sample size: columns 2-4 are thickness, length, width in all three tables.
                th_cell, len_cell, wid_cell = r[2], r[3], r[4]
                th_unit = "cm" if "(cm)" in header[2] else None
                thick = None
                if th_cell:
                    if re.fullmatch(r"0\d+\s*mm", th_cell):            # '037 mm'
                        flags.append("thickness_typo_suspected")
                    else:
                        v = length_cm(th_cell if not th_unit or re.search(r"[a-z]", th_cell) else th_cell + " cm")
                        if v is None:
                            flags.append("value_not_single")
                        else:
                            thick = round(v * 10, 3)                    # cm -> mm
                length = length_cm(len_cell if re.search(r"[a-z]", len_cell) else len_cell + " cm") if len_cell else None
                width = length_cm(wid_cell if re.search(r"[a-z]", wid_cell) else wid_cell + " cm") if wid_cell else None
                if len_cell and length is None and "value_not_single" not in flags:
                    flags.append("value_not_single")
                if acc == "PSI-98" and length is not None and width is not None and length < width:
                    length, width = width, length                       # NASA fact sheet: 0.4 m wide, 1 m long
                    flags.append("dimensions_swapped_in_source")
                # Saffire-I and -III sensor logs: ambient pressure (PSIA) and O2 (%) over each burn.
                sensed = {}
                fp = self.fact(acc, "pressure", label=r[0])
                fo = self.fact(acc, "oxygen", label=r[0])
                if fp:
                    flags.append("pressure_range_from_sensor_log")
                    sensed.update(pressure_atm_min=round(fp["range"][0] / PSI_PER_ATM, 6),
                                  pressure_atm_max=round(fp["range"][1] / PSI_PER_ATM, 6), pressure_source=sourced_text(fp))
                if fo:
                    s0, s1 = fo["range"][0] / 100, fo["range"][1] / 100
                    flags.append("o2_from_sensor_log")
                    sensed.update(o2_sensor_min=round(s0, 6), o2_sensor_max=round(s1, 6))
                    t0 = o2 if o2 is not None else lo
                    t1 = o2 if o2 is not None else hi
                    if t0 is not None and (t1 < s0 or t0 > s1):         # table and sensor do not overlap
                        flags.append("o2_differs_from_sensor_log")
                self.add(q, acc, acronym, i, r[0], "solid", material, o2, "ambient", None, flags,
                         o2_fraction_min=None if lo is None else round(lo, 4),
                         o2_fraction_max=None if hi is None else round(hi, 4),
                         airflow_cm_s=lead_num(r[c["air"]]), flow_direction=direction,
                         burn_time_s=burn, sample_thickness_mm=thick, sample_length_cm=length, sample_width_cm=width,
                         source_extra=extra, **sensed)

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


def other_table_corrections(acc, header, body):
    """Corrections to tables published as-is. Each says what the cell reads, what it is read as, and why.
    Only made where NASA's own text or the table itself settles it; anything else stays a known issue."""
    out = []

    def fix(i, col, new, reason):
        if body[i - 1][col] != new:
            out.append({"row": i, "column": header[col], "as_published": body[i - 1][col], "read_as": new, "reason": reason})

    if acc == "PSI-20":                                        # ACME BRE
        o2, fuel = header.index("Oxygen Conc (percent)"), header.index("Fuel Bottle")
        for i, r in enumerate(body, 1):
            m = re.fullmatch(r"(\d+)00%", r[o2])
            if m:
                fix(i, o2, m.group(1), "percent-format artefact; other rows list plain percentages")
            fix(i, fuel, re.sub(r"(\d%)(?=\S)", r"\1 ", r[fuel]), "spacing made consistent with the other rows")
    elif acc == "PSI-21":                                      # ACME CLD Flame
        ttype, fuel = header.index("Test Type"), header.index("Fuel Bottle")
        for i, r in enumerate(body, 1):
            m = re.fullmatch(r"(\d+%) (CH|C2H)(\d+)", r[fuel])
            if not m:
                continue
            base = "CH4" if m.group(2) == "CH" else "C2H4"
            if m.group(3) != "4":
                fix(i, fuel, f"{m.group(1)} {base}",
                    f"spreadsheet autofill: the formula counts up row by row ({m.group(2)}4, {m.group(2)}5, ...); "
                    f"NASA's record names only methane and ethylene as fuels, and this row's test type is "
                    f"'{r[ttype]}'")
    elif acc == "PSI-23":                                      # ACME s-Flame
        for col in (header.index("Atmosphere*"), header.index("Fuel Bottle")):
            for i, r in enumerate(body, 1):
                new = re.sub(r"\bN[3-9]\b", "N2", r[col])
                fix(i, col, new, "spreadsheet autofill: N2 counts up to N3, N4, ...; NASA's record names nitrogen, "
                                 "helium and carbon dioxide as diluents")
    elif acc == "PSI-22":                                      # ACME E-FIELD Flames
        keep = [header.index(h) for h in ("Test Type", "Test Day", "Year", "Month", "Date", "Mesh Polarity", "Fuel Bottle")]
        conc = header.index("Fuel Conc")
        last = None
        for i, r in enumerate(body, 1):
            if r[header.index("Test Day")]:
                last = r
            elif last and r[conc]:
                for col in keep:
                    fix(i, col, last[col], "continuation row: it lists only another fuel concentration used on the "
                                           "test day above, so the day's other cells are repeated from that row")
    elif acc == "PSI-106":                                     # SLICE
        col = header.index("Test Date")
        for i, r in enumerate(body, 1):
            m = re.match(r"(\d{4}-[A-Z]{3}-\d{2})\s+(.+)", r[col])
            if m:
                fix(i, col, m.group(1), f"the cell also holds text that runs into the next column: '{m.group(2)}'")
    elif acc == "PSI-102":                                     # SAME
        col = header.index("Sample Material")
        for i, r in enumerate(body, 1):
            m = re.fullmatch(r"(.+?):\s*same conditions as 1-4", r[col])
            if m:
                fix(i, col, m.group(1), "the cell adds 'same conditions as 1-4' (samples 1-4 used several "
                                        "settings, so the blank cells are not filled)")
    return out


def build_other_tables(data, builder):
    search = {s["Accession"]: s for s in json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))}
    out = []
    for acc, rel, kind, why, issues in OTHER_TABLES:
        header, body = read_csv(os.path.join(data, "tables", rel))
        corrections = other_table_corrections(acc, header, body)
        read_as = [list(r) for r in body]
        for c in corrections:
            read_as[c["row"] - 1][header.index(c["column"])] = c["read_as"]
        out.append({
            "investigation": acc, "acronym": (search[acc].get("Acronym") or "").strip() or None,
            "source_table": "tables/" + rel, "kind": kind, "why_not_tests": why,
            "columns": header, "rows": body,          # cells exactly as published
            "rows_read_as": read_as,                  # the same rows with `corrections` applied
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


EXPATM = "https://humanresearchroadmap.nasa.gov/evidence/reports/ExpAtm.pdf"
TP2010 = "https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf"
OCHMO = "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf"
CHALLENGE_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details"
NSSDC_MOON = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html"
PSI_REPO = "https://psi.nasa.gov/physci/repo/"

# Gravity of each place, in units of Earth's gravity (g): the values a crew can live in there. A test fits
# a place's gravity when within 0.02 g of one of them (GRAVITY_TOLERANCE_G in web/src/data/load.ts, mirrored
# in validate_data.py). Sources checked 2026-11-14 (gemini_data/VERIFIED.md, section 1).
MOON_G = 0.165   # NASA NSSDC Moon Fact Sheet: surface gravity 1.62 m/s^2 (Moon) / 9.80 (Earth), ratio 0.165
G_MICRO = {"g": [0.0], "label": "Microgravity",
           "source": "NASA PSI records: every investigation with tests in these tables is a 'Microgravity "
                     "Investigation' flown on the International Space Station or a Cygnus cargo craft",
           "source_url": PSI_REPO}
G_MOON = {"g": [MOON_G], "label": "Moon gravity, about 1/6 of Earth's",
          "source": "NASA NSSDC Moon Fact Sheet: 'Surface gravity (m/s2) 1.62 9.80 0.165' (Moon, Earth, ratio); "
                    "science.nasa.gov/moon/facts: 'the gravity on the surface of the Moon is one-sixth of Earth's'",
          "source_url": NSSDC_MOON}
G_EARTH = {"g": [1.0], "label": "Earth gravity (1 g)",
           "source": "NASA NSSDC Moon Fact Sheet gives Earth's surface gravity as 9.80 m/s2; 1 g by definition",
           "source_url": NSSDC_MOON}
G_SUIT = {"g": [0.0, MOON_G], "label": "Microgravity on spacewalks from the ISS, or Moon gravity on the surface",
          "source": "NASA evidence report on the exploration atmosphere, p. 6: 'the ISS construction and maintenance EVAs' "
                    "and 'exploration EVAs'; Moon gravity from the NASA NSSDC Moon Fact Sheet",
          "source_url": EXPATM}


def build_habitats():
    """Each habitat's numbers come from a source opened and checked by workstream A
    (gemini_data/VERIFIED.md). status starts with 'from_' when every number is sourced."""
    challenge = "NASA Space Apps 2026 challenge page, Flame in Freefall (Potential Considerations)"
    expatm = "NASA Evidence Report: Risk of Hypoxia from the Exploration Atmosphere (2015)"
    return [
        {"id": "moon_base", "name": "Moon Base / pressurized rover",
         "o2_fraction": [0.30, 1.00], "pressure_psi": [4.3, 10.2],
         "pressure_atm": [round(4.3 * PSI_TO_ATM, 4), MOON_MAX_P_ATM],
         "note": "Challenge: for a Moon base and pressurized rovers, oxygen 'likely 30% or greater', pressure '10.2 psi or less', between spacesuit and Earth values. "
                 "The outer bounds here are the spacesuit values.",
         "source": challenge, "source_urls": [CHALLENGE_URL], "status": "from_challenge", "gravity": G_MOON},
        {"id": "moon_base_nasa", "name": "Moon Base (NASA Exploration Air)",
         "o2_fraction": [0.32, 0.36], "pressure_psi": [8.0, 8.4],
         "pressure_atm": [round(8.0 * PSI_TO_ATM, 4), round(8.4 * PSI_TO_ATM, 4)],
         "note": "NASA's current exploration atmosphere is 8.2 psia with 34% O2: 'After re-evaluation in 2012, the 8/32 "
                 "environment was altered to 8.2 psia and 34% O2' (evidence report, p. 4), which it calls 'the current 8.2 psia "
                 "habitat pressure with 34% O2' (p. 29). The box is NASA's control band of +-0.2 psia and +-2.0% O2 "
                 "(NASA/TP-2010-216134, p. 11). That report set the band for its own 2010 recommendations; applying it to "
                 "8.2 / 34 is our step, not NASA's.",
         "source": f"{expatm}, pp. 4 and 29; NASA/TP-2010-216134, p. 11",
         "source_urls": [EXPATM, TP2010], "status": "from_nasa", "gravity": G_MOON},
        {"id": "iss", "name": "Space Station (ISS)",
         "o2_fraction": [0.19, 0.23], "pressure_psi": [14.5, 14.9],
         "pressure_atm": [round(14.5 * PSI_TO_ATM, 4), round(14.9 * PSI_TO_ATM, 4)],
         "note": "'...International Space Station (ISS) program have operated at an Earth-equivalent sea level atmosphere of "
                 "14.7 psia and 21% O2' (evidence report, p. 5). The box is NASA's control band of +-0.2 psia and +-2.0% O2 "
                 "around it (NASA/TP-2010-216134, p. 11); applying that band here is our step, not NASA's. Same air as Earth "
                 "sea level, so the same tests fall in both.",
         "source": f"{expatm}, p. 5; NASA OCHMO-TB-003 Habitable Atmosphere, p. 8; NASA/TP-2010-216134, p. 11",
         "source_urls": [EXPATM, OCHMO, TP2010], "status": "from_nasa", "gravity": G_MICRO},
        {"id": "spacesuit", "name": "Spacesuit",
         "o2_fraction": [1.00, 1.00], "pressure_psi": [4.3, 4.3],
         "pressure_atm": [round(4.3 * PSI_TO_ATM, 4)] * 2,
         "note": "Challenge: spacesuits are filled with 100% oxygen to only 4.3 psi.",
         "source": challenge, "source_urls": [CHALLENGE_URL], "status": "from_challenge", "gravity": G_SUIT},
        {"id": "earth_sea_level", "name": "Earth sea level",
         "o2_fraction": [0.19, 0.23], "pressure_psi": [14.5, 14.9],
         "pressure_atm": [round(14.5 * PSI_TO_ATM, 4), round(14.9 * PSI_TO_ATM, 4)],
         "note": "Pressure from the challenge page (14.7 psi). 21% O2 at 14.7 psia is NASA's 'Earth-equivalent sea level "
                 "atmosphere' (evidence report, p. 5). The box is NASA's control band of +-0.2 psia and +-2.0% O2 around it "
                 "(NASA/TP-2010-216134, p. 11); applying that band here is our step, not NASA's.",
         "source": f"{challenge}; {expatm}, p. 5; NASA/TP-2010-216134, p. 11",
         "source_urls": [CHALLENGE_URL, EXPATM, TP2010], "status": "from_challenge_and_nasa", "gravity": G_EARTH},
    ]


# ---- habitat evidence map (docs/LAYOUT_PLAN.md) ------------------------------------------------
# Fuel options a user can pick for a mark, matched on whole words so "methane" is never "ethane".
GAS_FUELS = [(r"\bpropylene\b", "Propylene"), (r"\bethylene\b|\bc2h4\b", "Ethylene"), (r"\bmethane\b|\bch4\b", "Methane"),
             (r"\bethane\b|\bc2h6\b", "Ethane"), (r"\bpropane\b|\bc3h8\b", "Propane"), (r"\bbutane\b", "Butane")]
DROPLET_FUELS = [(r"\bheptane\b", "Heptane"), (r"\bmethanol\b", "Methanol"),
                 (r"\bc12h26\b|dodecane", "Dodecane (n- and iso- mixes)")]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def fuel_option_name(t):
    if t["fuel_class"] == "solid":
        return t["fuel_material"]
    table = GAS_FUELS if t["fuel_class"] == "gas" else DROPLET_FUELS
    return next((name for pat, name in table if re.search(pat, (t["fuel"] or "").lower())), None)


def build_fuels(tests, habitats):
    """One entry per fuel a user can pick on the layout, with its evidence in every habitat.
    Distinct tests only (rows flagged duplicate_row are left out)."""
    groups = {}
    for t in tests:
        if any(f.startswith("duplicate_row") for f in t["flags"]):
            continue
        name = fuel_option_name(t)
        if name:
            groups.setdefault((t["fuel_class"], name), []).append(t)

    def rng(vals):
        return [min(vals), max(vals)] if vals else None

    out = []
    for (cls, name), ts in sorted(groups.items(), key=lambda kv: (["solid", "droplet", "gas"].index(kv[0][0]), -len(kv[1]))):
        amb = [t for t in ts if t["o2_basis"] == "ambient"]
        placed = [t for t in amb if t["o2_fraction"] is not None and t["pressure_atm"] is not None]
        air = [t for t in ts if t["airflow_cm_s"] is not None and "airflow_negative_in_source" not in t["flags"]]
        endings = {}
        for t in ts:
            if t["outcome"]:
                endings[t["outcome"]] = endings.get(t["outcome"], 0) + 1
        inside, nearest = {}, {}
        for h in habitats:
            (o0, o1), (p0, p1) = h["o2_fraction"], h["pressure_atm"]
            inside[h["id"]] = [t["id"] for t in placed if o0 <= t["o2_fraction"] <= o1 and p0 <= t["pressure_atm"] <= p1]
            if inside[h["id"]]:
                nearest[h["id"]] = None
                continue
            # Same rule as the rest of the app: 1 percentage point of oxygen counts the same as 1 psi.
            def gap(t, oxygen_only):
                o = t["o2_fraction"]
                d_o2 = (o0 - o if o < o0 else o - o1 if o > o1 else 0) * 100
                if oxygen_only:
                    return d_o2, 0.0
                p = t["pressure_atm"]
                d_p = (p0 - p if p < p0 else p - p1 if p > p1 else 0) * PSI_PER_ATM
                return d_o2, d_p
            pool, oxygen_only = (placed, False) if placed else ([t for t in amb if t["o2_fraction"] is not None], True)
            if not pool:
                nearest[h["id"]] = None
                continue
            best = min(pool, key=lambda t: (sum(x * x for x in gap(t, oxygen_only)), t["id"]))
            d_o2, d_p = gap(best, oxygen_only)
            nearest[h["id"]] = {"test_id": best["id"], "o2_points": round(d_o2, 2), "psi_gap": round(d_p, 2),
                                "oxygen_only": oxygen_only}
        note = []
        if not [t for t in amb if t["o2_fraction"] is not None]:
            note.append("Oxygen is not in these tables.")
        if not [t for t in ts if t["pressure_atm"] is not None]:
            note.append("Pressure is not in these tables.")
        from_docs = [t for t in ts if t["pressure_atm"] is not None and t.get("pressure_source")]
        if from_docs:
            docs = sorted({t["pressure_source"].split(", chapter")[0].split(': "')[0] for t in from_docs})
            note.append(f"Pressure for {len(from_docs)} of these {len(ts)} tests is from NASA's reports, not the tables: "
                        + "; ".join(docs) + ".")
        out.append({
            "id": f"{cls}:{slug(name)}", "fuel_class": cls, "name": name,
            "test_ids": [t["id"] for t in ts], "test_count": len(ts),
            "investigations": sorted({t["investigation"] for t in ts}, key=lambda a: int(a.split("-")[1])),
            "acronyms": sorted({t["acronym"] for t in ts}),
            "o2_range": rng([t["o2_fraction"] for t in amb if t["o2_fraction"] is not None]),
            "pressure_psi_range": (lambda r: None if r is None else [round(r[0] * PSI_PER_ATM, 2), round(r[1] * PSI_PER_ATM, 2)])(
                rng([t["pressure_atm"] for t in ts if t["pressure_atm"] is not None])),
            "airflow_range": rng([t["airflow_cm_s"] for t in air]),
            "airflow_test_count": len(air),
            "still_air_test_count": sum(1 for t in air if t["airflow_cm_s"] == 0),
            "endings": dict(sorted(endings.items(), key=lambda kv: -kv[1])),
            "inside_by_habitat": inside,
            "nearest_by_habitat": nearest,
            "note": " ".join(note) or None,
        })
    return out


# ---- items 5-12 (docs/roles/C-tasks-5-12.md) --------------------------------------------------

CSV_FIELDS = ["id", "investigation", "acronym", "doi", "source_table", "source_row", "test_label", "fuel_class", "fuel", "fuel_shape", "fuel_size_text",
              "o2_basis", "o2_fraction", "o2_fraction_min", "o2_fraction_max", "pressure_atm", "airflow_cm_s",
              "flow_direction", "co2_fraction", "he_fraction", "gravity_g", "outcome", "flags"]


def write_tests_csv(path, tests, inv):
    """Item 6: every test row as CSV for modellers, each with its source row and investigation DOI."""
    import csv
    doi = {i["accession"]: i["doi"] or "" for i in inv}
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(CSV_FIELDS)
        for t in tests:
            row = []
            for k in CSV_FIELDS:
                v = doi[t["investigation"]] if k == "doi" else ";".join(t["flags"]) if k == "flags" else t.get(k)
                row.append("" if v is None else v)
            w.writerow(row)


VARIED_NUMERIC = [  # (field, label, unit, scale to the unit shown)
    ("o2_fraction", "Oxygen (cabin air)", "%", 100), ("o2_fraction:burner", "Oxygen (burner gas)", "%", 100),
    ("pressure_atm", "Pressure", "psi", 1 / PSI_TO_ATM), ("airflow_cm_s", "Airflow", "cm/s", 1),
    ("co2_fraction", "CO2 added", "%", 100), ("he_fraction", "Helium added", "%", 100),
    ("droplet_diameter_mm", "Droplet diameter", "mm", 1), ("sample_length_cm", "Sample length", "cm", 1),
    ("sample_width_cm", "Sample width", "cm", 1), ("sample_thickness_mm", "Sample thickness", "mm", 1),
]
VARIED_TEXT = [("fuel", "Fuel"), ("flow_direction", "Flow direction"), ("fuel_material", "Material")]


def varied_conditions(tests):
    """Item 7: which conditions changed between one investigation's tests. Repeated rows are left out.
    Numbers are in the unit shown (oxygen and gases in %, pressure in psi). Negative airflow is NASA's
    unexplained value (flag airflow_negative_in_source) and is left out, as in airflowRange()."""
    ts = [t for t in tests if not any(f.startswith("duplicate_row") for f in t["flags"])]
    out = []
    for field, label, unit, scale in VARIED_NUMERIC:
        key, basis = (field.split(":")[0], "burner_oxidizer") if ":" in field else (field, "ambient" if field == "o2_fraction" else None)
        rows = [t for t in ts if basis is None or t["o2_basis"] == basis]
        vals = [t[key] for t in rows if t.get(key) is not None
                and not (key == "airflow_cm_s" and "airflow_negative_in_source" in t["flags"])]
        if not vals:
            continue
        out.append({"field": field, "label": label, "unit": unit, "min": round(min(vals) * scale, 3),
                    "max": round(max(vals) * scale, 3), "values": None, "distinct": len(set(vals)),
                    "recorded": len(vals), "total": len(rows)})
    for field, label in VARIED_TEXT:
        vals = [t[field] for t in ts if t.get(field)]
        if not vals:
            continue
        uniq = sorted(set(vals))
        out.append({"field": field, "label": label, "unit": None, "min": None, "max": None, "values": uniq[:12],
                    "distinct": len(uniq), "recorded": len(vals), "total": len(ts)})
    return out


HARDWARE_GROUPS = [  # (words in the PSI record's hardware field, id, label); first match wins
    (("MDCA", "Droplet Combustion"), "cir_mdca", "Combustion Integrated Rack with the droplet apparatus (MDCA)"),
    (("Combustion Integrated Rack",), "cir", "Combustion Integrated Rack (CIR)"),
    (("Microgravity Science Glovebox",), "msg", "Microgravity Science Glovebox (MSG)"),
    (("Cygnus",), "cygnus", "Saffire hardware in a Cygnus cargo craft"),
    (("Soot Diagnostic",), "same", "Smoke and soot hardware (SAME)"),
    (("P-Trak",), "p_trak", "Handheld particle counter (TSI P-Trak)"),
    (("Principal Investigator Laboratory",), "pi_lab", "Researcher's own laboratory hardware"),
]


def hardware_group(inv):
    """Item 9: group from the PSI record's hardware field only. None when the record does not say."""
    hw = inv.get("hardware")
    if not hw:
        return None
    for words, gid, label in HARDWARE_GROUPS:
        if any(w in hw for w in words):
            return {"id": gid, "label": label, "source": f"PSI record hardware field: \"{collapse_ws(hw)}\""}
    return None


def places_waiting():
    """Item 11: places the challenge names that have no card, and why."""
    return [
        {"id": "spacecraft_cabin", "name": "Spacecraft cabin (e.g. Orion)",
         "why": "We found no current NASA figures for this cabin's oxygen and pressure, only proposals from 2010-11 "
                "that were later replaced, so there is no air range to count tests in.",
         "what_would_change": "When NASA publishes the cabin's oxygen and pressure, it becomes a card with test counts "
                              "automatically. Until then, try your own values in the air-conditions filter.",
         "source_urls": [CHALLENGE_URL]},
        {"id": "mars_habitat", "name": "Mars habitat",
         "why": "The challenge gives no air range for Mars, and we found no current NASA figures, only proposals from "
                "2010-11 that were later replaced. No PSI test ran in Mars gravity.",
         "what_would_change": "When NASA publishes a Mars habitat's oxygen and pressure, it becomes a card with test "
                              "counts automatically. Until then, try your own values in the air-conditions filter.",
         "source_urls": [CHALLENGE_URL]},
    ]


def main():
    data, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    os.makedirs(out, exist_ok=True)
    b = Builder(data)
    tests = b.build()
    apply_shapes(tests, shape_facts(data))
    other = build_other_tables(data, b)
    inv = build_investigations(data, b.table_use)
    hab = build_habitats()
    # Gravity of every test, from NASA's record of its investigation. Every investigation with tests is a
    # "Microgravity Investigation"; stop if that ever changes rather than guess a value.
    project = {i["accession"]: i["project_type"] for i in inv}
    for t in tests:
        if project.get(t["investigation"]) != "Microgravity Investigation":
            sys.exit(f"{t['id']}: investigation {t['investigation']} is '{project.get(t['investigation'])}', "
                     f"not a Microgravity Investigation; its gravity is not known")
        t["gravity_g"] = 0.0
    fuels = build_fuels(tests, hab)
    for i in inv:
        mine = [t for t in tests if t["investigation"] == i["accession"]]
        if mine:
            i["varied"] = varied_conditions(mine)
        g = hardware_group(i)
        if g:
            i["hardware_group"] = g

    flag_counts = {}
    for t in tests:
        for f in t["flags"]:
            k = f.split(":")[0]
            flag_counts[k] = flag_counts.get(k, 0) + 1
    duplicates = sum(1 for t in tests if any(f.startswith("duplicate_row") for f in t["flags"]))
    quality = {"tables": b.quality, "flag_counts": flag_counts, "flag_meanings": FLAG_MEANINGS,
               "tests_total": len(tests), "duplicate_rows": duplicates, "distinct_tests": len(tests) - duplicates,
               "source_problems": "docs/DATA_ISSUES.md"}

    for name, obj in (("investigations.json", inv), ("tests.json", tests), ("other_tables.json", other),
                      ("habitats.json", hab), ("data_quality.json", quality), ("fuels.json", fuels),
                      ("places_waiting.json", places_waiting())):
        with open(os.path.join(out, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        n = len(obj) if isinstance(obj, list) else len(obj["tables"])
        print(f"wrote {name}: {n} entries, {os.path.getsize(os.path.join(out, name)) / 1e3:.0f} KB")

    write_tests_csv(os.path.join(out, "tests.csv"), tests, inv)
    print(f"wrote tests.csv: {len(tests)} rows")

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
    print(f"  distinct tests: {quality['distinct_tests']} ({duplicates} duplicate rows)")
    for h in hab:
        ins = [t for t in tests if t["o2_basis"] == "ambient" and t["o2_fraction"] is not None and t["pressure_atm"] is not None
               and h["o2_fraction"][0] <= t["o2_fraction"] <= h["o2_fraction"][1]
               and h["pressure_atm"][0] <= t["pressure_atm"] <= h["pressure_atm"][1]]
        assert h["status"].startswith("from_") and h.get("source_urls"), f"habitat without a source: {h['id']}"
        print(f"  habitat {h['id']:16} {len(ins):3} tests inside")

    # "Will it go out" analysis, written next to tests.json (same folder, same run).
    import subprocess
    here = os.path.dirname(os.path.abspath(__file__))
    subprocess.run([sys.executable, "-I", os.path.join(here, "outcome_analysis.py"), out], check=True)
    # Independent checks of everything above against the raw files; a failure stops the build.
    print("\nvalidation")
    sys.stdout.flush()
    subprocess.run([sys.executable, "-I", os.path.join(here, "validate_data.py"), data, out], check=True)


if __name__ == "__main__":
    main()
