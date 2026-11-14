"""Independent checks of the generated app data against NASA's raw files.

Re-reads the raw CSVs in data/ itself (it does not reuse build_web_data.py's parsing), then checks
every fix and every headline number. Prints PASS or FAIL per check and exits 1 if anything fails.
build_web_data.py runs it at the end of every build.

Usage:  python -I validate_data.py <data_dir> <web/public/data>
"""
import csv
import io
import json
import os
import re
import sys

PSI = 14.696
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


def raw_rows(data, rel):
    raw = open(os.path.join(data, "tables", rel), "rb").read()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = [[c.strip() for c in r] for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    return rows[0], rows[1:]


def num(cell):
    return float(cell) if re.fullmatch(r"-?\d*\.?\d+", (cell or "").strip()) else None


def main():
    data, web = (os.path.abspath(p) for p in sys.argv[1:3])
    load = lambda n: json.load(open(os.path.join(web, n), encoding="utf-8"))
    T, Q, H, O, INV = load("tests.json"), load("data_quality.json"), load("habitats.json"), load("other_tables.json"), load("investigations.json")
    OUT = load("outcomes.json")
    man = json.load(open(os.path.join(data, "manifest.json"), encoding="utf-8"))
    by_inv = lambda acc: [t for t in T if t["investigation"] == acc]

    # ---- raw data untouched ------------------------------------------------------------------
    bad = [t["file"] for i in man["investigations"] for t in i["tables"]
           if os.path.getsize(os.path.join(data, t["file"])) != t["listed_bytes"]]
    check("raw NASA tables are byte-for-byte the size PSI lists", not bad, ", ".join(bad))

    # ---- accounting ----------------------------------------------------------------------------
    src = sum(q["rows_in_source"] for q in Q["tables"])
    left = sum(len(q["rows_left_out"]) for q in Q["tables"])
    other = sum(len(o["rows"]) for o in O)
    check("every source row accounted for (2,009 = tests + other tables + left out)",
          src == 2009 and src == len(T) + other + left, f"{src} = {len(T)} + {other} + {left}")
    check("test ids unique", len({t["id"] for t in T}) == len(T))
    keys = {f.split(":")[0] for t in T for f in t["flags"]}
    check("every flag has a stated meaning", keys <= set(Q["flag_meanings"]), str(sorted(keys - set(Q["flag_meanings"]))))
    recount = {}
    for t in T:
        for f in t["flags"]:
            recount[f.split(":")[0]] = recount.get(f.split(":")[0], 0) + 1
    check("flag counts in data_quality.json match the tests", recount == Q["flag_counts"])

    # ---- value ranges ------------------------------------------------------------------------
    def in_range(field, lo, hi):
        bad = [t["id"] for t in T if t.get(field) is not None and not (lo <= t[field] <= hi)]
        check(f"{field} within {lo} to {hi}", not bad, ", ".join(bad[:5]))
    in_range("o2_fraction", 0, 1)
    in_range("pressure_atm", 0.2, 6)
    in_range("airflow_cm_s", -10, 100)
    in_range("burn_time_s", 0, 4000)
    in_range("droplet_diameter_mm", 0.1, 10)
    in_range("extinction_diameter_mm", 0, 10)
    in_range("peak_burner_temp_c", 0, 2000)
    in_range("sample_length_cm", 1, 200)
    in_range("sample_width_cm", 1, 200)
    in_range("sample_thickness_mm", 0.01, 50)

    # ---- headline numbers --------------------------------------------------------------------
    placed = [t for t in T if t["o2_basis"] == "ambient" and t["o2_fraction"] is not None and t["pressure_atm"] is not None]

    def inside(h):
        return [t for t in placed if h["o2_fraction"][0] <= t["o2_fraction"] <= h["o2_fraction"][1]
                and h["pressure_atm"][0] <= t["pressure_atm"] <= h["pressure_atm"][1]]
    counts = {h["id"]: len(inside(h)) for h in H}
    expect = {"moon_base": 20, "moon_base_nasa": 0, "iss": 171, "spacesuit": 0, "earth_sea_level": 171}
    check("habitat counts (20, 0, 171, 0, 171)", counts == expect, str(counts))
    check("775 tests can be placed on the map (746 from the tables + 29 BASS-II with a pressure from NASA's report)",
          len(placed) == 775, str(len(placed)))
    check("distinct tests 1,719 (34 duplicate rows)", Q.get("distinct_tests") == 1719 and Q.get("duplicate_rows") == 34)
    solid_o2 = [t["o2_fraction"] for t in T if t["fuel_class"] == "solid" and t["o2_fraction"] is not None]
    check("highest solid-material oxygen is 22.2 %", abs(max(solid_o2) - 0.222) < 1e-9, str(max(solid_o2)))
    solid_placed = [t for t in placed if t["fuel_class"] == "solid"]
    check("the placed solid tests are exactly the 29 T'ien BASS-II tests, all at 1 atm with their source",
          len(solid_placed) == 29 and all(t["investigation"] == "PSI-25" and (t["source_extra"] or {}).get("PI") == "T'ien"
                                          and t["pressure_atm"] == 1.0 and "pressure_from_report" in t["flags"] and t["pressure_source"]
                                          for t in solid_placed),
          str(len(solid_placed)))

    # ---- conditions from NASA's reports and sensor logs (data_sourced/solid_conditions.json) -----
    SC = json.load(open(os.path.join(os.path.dirname(data), "data_sourced", "solid_conditions.json"), encoding="utf-8"))["facts"]
    bad = []
    for f in SC:
        if f["investigation"] == "PSI-25":
            rows = [t for t in T if t["investigation"] == "PSI-25" and (t["source_extra"] or {}).get("PI") == f["applies_to"]["value"]]
        else:
            rows = [t for t in T if t["investigation"] == f["investigation"] and t["test_label"] == f["applies_to"]["test_label"]]
        if not rows:
            bad.append(f"{f['id']}: no rows")
        for t in rows:
            if f["quantity"] == "pressure" and "value" in f:
                ok = t["pressure_atm"] == f["value"] and f["quote"] in (t["pressure_source"] or "")
            elif f["quantity"] == "pressure":
                div = 101.325 if f["unit"] == "kPa" else PSI
                ok = (t["pressure_atm"] is None and abs(t["pressure_atm_min"] - f["range"][0] / div) < 1e-5
                      and abs(t["pressure_atm_max"] - f["range"][1] / div) < 1e-5 and f["quote"] in (t["pressure_source"] or ""))
            else:
                ok = abs(t["o2_sensor_min"] - f["range"][0] / 100) < 1e-5 and abs(t["o2_sensor_max"] - f["range"][1] / 100) < 1e-5
            if not ok:
                bad.append(f"{f['id']}: {t['id']}")
    check("every sourced condition matches data_sourced/solid_conditions.json (29 + 22 BASS-II rows, 4 Saffire burns)",
          not bad and sum(1 for t in T if t.get("pressure_source")) == 55, ", ".join(bad[:5]))
    txt_root = os.path.join(os.path.dirname(data), "data_extra", "_text")
    if os.path.isdir(txt_root):
        missing = []
        for f in SC:
            acc_dir = os.path.join(txt_root, f["investigation"])
            path = os.path.join(acc_dir, f["source_file"] + ".txt")
            text = re.sub(r"\s+", " ", open(path, encoding="utf-8", errors="replace").read()) if os.path.exists(path) else ""
            if f["source_file"].endswith(".pdf"):
                if f["quote"] not in text:
                    missing.append(f["id"])
            else:   # spreadsheet: the column summary must show the stated min and max
                col = "Ambient Pressure" if f["quantity"] == "pressure" else "O2"
                m = re.search(r"\[" + re.escape(col) + r"\] n=\d+ min=([\d.e-]+) max=([\d.e-]+)", text)
                if not m or abs(float(m.group(1)) - f["range"][0]) > 1e-3 or abs(float(m.group(2)) - f["range"][1]) > 1e-3:
                    missing.append(f["id"])
        check("every sourced quote and range is found in NASA's downloaded files (data_extra/_text)", not missing, ", ".join(missing))
    else:
        print("NOTE  data_extra/_text not present: quotes not re-checked against NASA's files "
              "(run scripts/fetch_psi_docs.py and scripts/extract_docs.py to enable this check)")
    check("every habitat number is sourced", all(h["status"].startswith("from_") and h.get("source_urls") for h in H))
    nasa = next(h for h in H if h["id"] == "moon_base_nasa")
    check("NASA Moon Base box is 32-36 % O2, 8.0-8.4 psi", nasa["o2_fraction"] == [0.32, 0.36] and nasa["pressure_psi"] == [8.0, 8.4])

    # ---- solid materials ---------------------------------------------------------------------
    solids = [t for t in T if t["fuel_class"] == "solid"]
    check("every solid test has a material or the flag material_not_stated",
          all(t["fuel_material"] or "material_not_stated" in t["flags"] for t in solids))
    wrong = [t["id"] for t in solids if re.search("pmma", t["fuel"] or "", re.I) and not (t["fuel_material"] or "").startswith("PMMA")]
    check("every cell naming PMMA is read as PMMA", not wrong, ", ".join(wrong))
    wrong = [t["id"] for t in solids if re.search("sibal|cotton", t["fuel"] or "", re.I) and not (t["fuel_material"] or "").startswith("SIBAL")]
    check("every cell naming SIBAL or cotton is read as SIBAL", not wrong, ", ".join(wrong))
    check("gas and droplet tests have no material", all(t["fuel_material"] is None for t in T if t["fuel_class"] != "solid"))
    check("no fuel name keeps runs of spaces", not [t for t in T if t["fuel"] and "  " in t["fuel"]])

    # ---- SPICE times -------------------------------------------------------------------------
    hdr, rows = raw_rows(data, "PSI-107/PSI-107_Experimental table_Spice.csv")
    sp = by_inv("PSI-107")
    ok_fmt = all(re.fullmatch(r"\d{2}:\d{2}:\d{2}", t[k]) for t in sp for k in ("ignition_time", "flame_off_time") if t[k])
    check("SPICE times are HH:MM:SS", ok_fmt)
    mism = []
    for t, r in zip(sp, rows):
        good = lambda c: re.fullmatch(r"\d{1,2}[:.]\d{2}[:.]\d{2}", c) is not None
        expect_flag = not good(r[1]) or (r[2] != "" and not good(r[2]))
        if expect_flag != ("time_not_recorded" in t["flags"]):
            mism.append(t["id"])
        if t["burn_time_s"] is not None:
            a = [int(x) for x in re.split(r"[:.]", r[1])]
            b = [int(x) for x in re.split(r"[:.]", r[2])]
            if t["burn_time_s"] != (b[0] - a[0]) * 3600 + (b[1] - a[1]) * 60 + (b[2] - a[2]):
                mism.append(t["id"] + " burn")
    check("SPICE time flags and burn times match the raw cells", not mism and len(sp) == len(rows), ", ".join(mism[:5]))
    neg = [t for t in sp if (t["airflow_cm_s"] or 0) < 0]
    check("every negative airflow carries its flag (8)", len(neg) == 8 and all("airflow_negative_in_source" in t["flags"] for t in neg))

    # ---- SAFFIRE sample size -----------------------------------------------------------------
    s1, s2, s3 = by_inv("PSI-98"), by_inv("PSI-99"), by_inv("PSI-100")
    check("SAFFIRE-I read as 94 cm long, 40.6 cm wide, flagged as swapped",
          all(t["sample_length_cm"] == 94 and t["sample_width_cm"] == 40.6 and "dimensions_swapped_in_source" in t["flags"] for t in s1))
    check("SAFFIRE-III 94 cm long, 40.6 cm wide, not flagged",
          all(t["sample_length_cm"] == 94 and t["sample_width_cm"] == 40.6 and "dimensions_swapped_in_source" not in t["flags"] for t in s3))
    hdr, rows = raw_rows(data, "PSI-99/PSI-99_Experimental table_SAFFIRE-2.csv")
    typo_raw = sum(1 for r in rows if r[2] == "037 mm")
    typo = [t for t in s2 if "thickness_typo_suspected" in t["flags"]]
    check(f"SAFFIRE-II '037 mm' cells flagged and left null ({typo_raw})",
          len(typo) == typo_raw == 3 and all(t["sample_thickness_mm"] is None for t in typo))
    check("SAFFIRE-II clean thicknesses read in mm (0.27, 0.61, 1.03, 10)",
          sorted(t["sample_thickness_mm"] for t in s2 if t["sample_thickness_mm"] is not None) == [0.27, 0.61, 1.03, 10.0])

    # ---- FLEX columns ------------------------------------------------------------------------
    hdr, rows = raw_rows(data, "PSI-69/PSI-69_Experimental table_FLEX.csv")
    fx = by_inv("PSI-69")
    same = all(t["droplet_diameter_mm"] == num(r[10]) and t["extinction_diameter_mm"] == num(r[11]) and t["burning_rate"] == num(r[12])
               for t, r in zip(fx, rows))
    check("FLEX diameters and burning rate equal the raw cells", same and len(fx) == len(rows))
    bigger = [t for t in fx if t["droplet_diameter_mm"] and t["extinction_diameter_mm"] and t["extinction_diameter_mm"] > t["droplet_diameter_mm"]]
    check("FLEX extinction diameter above the initial diameter only within 0.01 mm, and flagged",
          all(t["extinction_diameter_mm"] - t["droplet_diameter_mm"] <= 0.0100001 and "extinction_diameter_above_initial" in t["flags"]
              for t in bigger) and sum("extinction_diameter_above_initial" in t["flags"] for t in fx) == len(bigger),
          ", ".join(t["id"] for t in bigger))

    # ---- CFI-G columns -----------------------------------------------------------------------
    hdr_n, rows_n = raw_rows(data, "PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv")
    hdr_i, rows_i = raw_rows(data, "PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv")
    cg = by_inv("PSI-159")
    cn, ci = cg[:len(rows_n)], cg[len(rows_n):]
    ok = all(t["peak_burner_temp_c"] == num(r[16]) for t, r in zip(cn, rows_n)) and \
        all(t["peak_burner_temp_c"] == num(r[16]) for t, r in zip(ci, rows_i))
    check("CFI-G peak burner temperatures equal the raw Celsius cells", ok and len(cg) == len(rows_n) + len(rows_i))
    raw_ph = sum(1 for r in rows_n if num(r[16]) is None) + sum(1 for r in rows_i if num(r[16]) is None)
    check(f"every CFI-G temperature placeholder is flagged ({raw_ph})",
          sum("temperature_placeholder" in t["flags"] for t in cg) == raw_ph)
    kc = [i for i, r in enumerate(rows_i, 1) if num(r[16]) is not None and num(r[17]) is not None and abs(num(r[16]) + 273.15 - num(r[17])) > 0.6]
    check("CFI-G inverse Celsius and Kelvin columns agree", not kc, str(kc))
    raw_hot = sorted(r[13].lower() for r in rows_n + rows_i)
    check("CFI-G hot ignition normalised to yes / no / flash", sorted(t["hot_ignition"] for t in cg) == raw_hot
          and set(raw_hot) <= {"yes", "no", "flash"})

    # ---- tables published as-is --------------------------------------------------------------
    for o in O:
        hdr, rows = raw_rows(data, o["source_table"].replace("tables/", ""))
        check(f"{o['investigation']} cells exactly as published", o["rows"] == rows and o["columns"] == hdr)
        diff = {(i + 1, o["columns"][j]) for i, (a, b) in enumerate(zip(o["rows"], o["rows_read_as"])) for j in range(len(a)) if a[j] != b[j]}
        check(f"{o['investigation']} read-as rows differ only where a correction says so",
              diff == {(c["row"], c["column"]) for c in o["corrections"]} and all(c["reason"] for c in o["corrections"]))
    tab = {o["investigation"]: o for o in O}
    cld = tab["PSI-21"]
    fc, tc = cld["columns"].index("Fuel Bottle"), cld["columns"].index("Test Type")
    bad = [r for r in cld["rows_read_as"] if not re.fullmatch(r"\d+% (CH4|C2H4)", r[fc])
           or ("Methane" in r[tc] and "C2H4" in r[fc]) or ("Ethylene" in r[tc] and "CH4" in r[fc] and "C2H4" not in r[fc])]
    check("CLD Flame fuels read as CH4 or C2H4, matching each row's test type", not bad, str(bad[:2]))
    sf = tab["PSI-23"]
    check("s-Flame has no N3-N9 left", not any(re.search(r"\bN[3-9]\b", c) for r in sf["rows_read_as"] for c in r))
    ef = tab["PSI-22"]
    td, fi, fcn = ef["columns"].index("Test Day"), ef["columns"].index("Flames Ignited"), ef["columns"].index("Fuel Conc")
    check("E-FIELD continuation rows filled, Flames Ignited not repeated",
          all(r[td] for r in ef["rows_read_as"] if r[fcn])
          and sum(int(r[fi]) for r in ef["rows_read_as"] if r[fi]) == sum(int(r[fi]) for r in ef["rows"] if r[fi]))
    sl = tab["PSI-106"]
    check("SLICE dates read as dates only", all(re.fullmatch(r"\d{4}-[A-Z]{3}-\d{2}", r[0]) for r in sl["rows_read_as"]))
    sm = tab["PSI-102"]
    check("SAME materials read without 'same conditions'", not any("same conditions" in r[1] for r in sm["rows_read_as"]))
    bre = tab["PSI-20"]
    check("BRE oxygen and fuel cells read cleanly", not any(re.search(r"\d00%", r[5]) or re.search(r"%\S", r[4]) for r in bre["rows_read_as"]))

    # ---- outcomes ----------------------------------------------------------------------------
    st = {s["id"]: s for s in OUT["studies"]}
    ok = True
    for g in st["flex_oxygen"]["groups"]:
        ts = [t for t in T if t["id"] in set(g["test_ids"])]
        ok &= len(ts) == g["n"] and sum(t["outcome"] == "extinction" for t in ts) == g["went_out"]
    check("outcomes.json FLEX counts match tests.json", ok)
    check("outcome verdicts: FLEX oxygen clear, matched clear, CFI-G not clear",
          st["flex_oxygen"]["verdict"] == "clear" and st["flex_oxygen_matched"]["verdict"] == "clear"
          and st["cfig_oxygen"]["verdict"] == "no_clear_pattern" and st["cfig_pressure"]["verdict"] == "no_clear_pattern")

    # ---- habitat evidence map: fuels.json and the example layout (docs/LAYOUT_PLAN.md) ---------
    F = load("fuels.json")
    distinct = [t for t in T if not any(f.startswith("duplicate_row") for f in t["flags"])]
    gas_names = [("propylene", r"\bpropylene\b"), ("ethylene", r"\bethylene\b|\bc2h4\b"), ("methane", r"\bmethane\b|\bch4\b"),
                 ("ethane", r"\bethane\b|\bc2h6\b"), ("propane", r"\bpropane\b|\bc3h8\b"), ("butane", r"\bbutane\b")]
    dro_names = [("heptane", r"\bheptane\b"), ("methanol", r"\bmethanol\b"), ("dodecane", r"c12h26|dodecane")]

    def first_name(t):
        """The first fuel word whose pattern matches the fuel cell (same order as the build)."""
        names = gas_names if t["fuel_class"] == "gas" else dro_names
        return next((w for w, p in names if re.search(p, (t["fuel"] or "").lower())), None)

    def recount(cls, word):
        if cls == "solid":
            return sorted(t["id"] for t in distinct if t["fuel_class"] == "solid" and t["fuel_material"] == word)
        return sorted(t["id"] for t in distinct if t["fuel_class"] == cls and first_name(t) == word)
    bad = []
    for f in F:
        word = f["name"] if f["fuel_class"] == "solid" else f["name"].split()[0].lower()
        if sorted(f["test_ids"]) != recount(f["fuel_class"], word) or f["test_count"] != len(f["test_ids"]):
            bad.append(f["id"])
    check("every fuel option's tests match an independent recount", not bad, ", ".join(bad))
    check("every fuel option has at least one test; ids unique; no hydrogen offered",
          all(f["test_count"] > 0 for f in F) and len({f["id"] for f in F}) == len(F) and not any("hydrogen" in f["id"] for f in F))
    solid_mats = {t["fuel_material"] for t in distinct if t["fuel_class"] == "solid" and t["fuel_material"]}
    check("every named solid material is offered", solid_mats == {f["name"] for f in F if f["fuel_class"] == "solid"})
    covered = {i for f in F if f["fuel_class"] != "solid" for i in f["test_ids"]}
    missing = [t["id"] for t in distinct if t["fuel_class"] != "solid" and t["id"] not in covered]
    check("every distinct gas and droplet test belongs to one fuel option", not missing, ", ".join(missing[:5]))

    by_id = {t["id"]: t for t in T}
    bad = []
    for f in F:
        for h in H:
            exp_in = sorted(i for i in f["test_ids"] if by_id[i] in placed and by_id[i] in inside(h))
            if sorted(f["inside_by_habitat"][h["id"]]) != exp_in:
                bad.append(f"{f['id']}@{h['id']}")
    check("tests inside each place's box match a recount for every fuel", not bad, ", ".join(bad[:5]))
    teal = {h["id"]: sorted(f["id"] for f in F if f["inside_by_habitat"][h["id"]]) for h in H}
    expect_teal = {
        "moon_base": ["gas:butane", "gas:ethane"],
        "moon_base_nasa": [],
        "iss": ["droplet:dodecane-n-and-iso-mixes", "droplet:heptane", "droplet:methanol", "gas:butane", "gas:ethane", "gas:ethylene", "gas:propane", "solid:sibal-cotton-fiberglass-blend"],
        "spacesuit": [],
        "earth_sea_level": ["droplet:dodecane-n-and-iso-mixes", "droplet:heptane", "droplet:methanol", "gas:butane", "gas:ethane", "gas:ethylene", "gas:propane", "solid:sibal-cotton-fiberglass-blend"],
    }
    check("teal fuels per place match docs/LAYOUT_PLAN.md section 5", teal == expect_teal, str(teal))
    bad = []
    for f in F:
        for h in H:
            n = f["nearest_by_habitat"][h["id"]]
            if f["inside_by_habitat"][h["id"]]:
                if n is not None:
                    bad.append(f"{f['id']}@{h['id']} has inside tests and a nearest")
                continue
            has_o2 = any(by_id[i]["o2_basis"] == "ambient" and by_id[i]["o2_fraction"] is not None for i in f["test_ids"])
            if has_o2 != (n is not None) or (n and n["test_id"] not in f["test_ids"]):
                bad.append(f"{f['id']}@{h['id']}")
    check("every amber fuel with oxygen data names its nearest test", not bad, ", ".join(bad[:5]))

    fids = {f["id"]: f for f in F}

    def layout_problems(lay):
        probs = []
        if lay["version"] != 1 or lay["habitat_id"] not in {h["id"] for h in H}:
            probs.append("version or place")
        if "not a NASA design" not in (lay.get("note") or ""):
            probs.append("note must say it is not a NASA design")
        if len({m["id"] for m in lay["marks"]}) != len(lay["marks"]):
            probs.append("duplicate mark ids")
        for m in lay["marks"]:
            if (m["kind"] == "area") != (m["fuel_class"] == "solid"):
                probs.append(f"{m['id']} kind/type")
            if m["fuel_option_id"] != "other" and fids.get(m["fuel_option_id"], {}).get("fuel_class") != m["fuel_class"]:
                probs.append(f"{m['id']} fuel")
            s = m["shape"]
            if not all(0 <= s.get(k, 0) <= 1 for k in "xywh") or s["x"] + s.get("w", 0) > 1 or s["y"] + s.get("h", 0) > 1:
                probs.append(f"{m['id']} position")
            if m["kind"] == "area" and not (s.get("w", 0) > 0 and s.get("h", 0) > 0):
                probs.append(f"{m['id']} area needs width and height")
        return probs

    def tiers(lay, h):
        out = {"tested_here": 0, "tested_elsewhere": 0, "not_in_tables": 0}
        for m in lay["marks"]:
            f = fids.get(m["fuel_option_id"])
            out["not_in_tables" if f is None else "tested_here" if f["inside_by_habitat"][h["id"]] else "tested_elsewhere"] += 1
        return out

    def every_kind(lay):
        kinds = {(m["kind"], m["fuel_class"]) for m in lay["marks"]}
        return (kinds == {("area", "solid"), ("point", "droplet"), ("point", "gas")}
                and {m["airflow"] for m in lay["marks"]} == {"still", "vent"}
                and any(m["fuel_option_id"] == "other" for m in lay["marks"]))

    lay = json.load(open(os.path.join(web, "..", "layouts", "example-moon-habitat.json"), encoding="utf-8"))
    probs = layout_problems(lay)
    check("example layout is valid and has every mark type, both airflows and an 'Other'",
          not probs and every_kind(lay), ", ".join(probs))

    # B's sample spacecraft (generated from web/src/scene/cabin/spec.ts); the Simulation tab shows it for every place.
    ship = json.load(open(os.path.join(web, "..", "layouts", "example-spacecraft.json"), encoding="utf-8"))
    probs = layout_problems(ship)
    check("example spacecraft layout is valid and has every mark type, both airflows and an 'Other'",
          not probs and every_kind(ship), ", ".join(probs))
    got = {h["id"]: tiers(ship, h) for h in H}
    expect_here = {"moon_base": 1, "moon_base_nasa": 0, "iss": 6, "spacesuit": 0, "earth_sea_level": 6}
    check("example spacecraft colours per place match the app (teal 1/0/6/0/6, one 'Other' each)",
          {k: v["tested_here"] for k, v in got.items()} == expect_here and all(v["not_in_tables"] == 1 for v in got.values()),
          str(got))

    # ---- gravity, ready for partial-gravity data (LUCI, FM2) -----------------------------------------
    inv_type = {i["accession"]: i["project_type"] for i in INV}
    check("every test has gravity 0 g, from a NASA 'Microgravity Investigation' record",
          all(t.get("gravity_g") == 0.0 and inv_type.get(t["investigation"]) == "Microgravity Investigation" for t in T))
    check("every place has a sourced gravity",
          all(h.get("gravity") and h["gravity"].get("g") and h["gravity"].get("source") and h["gravity"].get("source_url") for h in H))
    gmap = {h["id"]: h["gravity"]["g"] for h in H}
    check("place gravities: ISS 0, Earth 1, both Moon cards 0.165, spacesuit 0 or 0.165",
          gmap == {"moon_base": [0.165], "moon_base_nasa": [0.165], "iss": [0.0], "spacesuit": [0.0, 0.165], "earth_sea_level": [1.0]}, str(gmap))

    def fits(test, h):   # Python mirror of testsInHabitatAndGravity() in web/src/data/load.ts
        return (test["o2_basis"] == "ambient" and test["o2_fraction"] is not None and test["pressure_atm"] is not None
                and h["o2_fraction"][0] <= test["o2_fraction"] <= h["o2_fraction"][1]
                and h["pressure_atm"][0] <= test["pressure_atm"] <= h["pressure_atm"][1]
                and test.get("gravity_g") is not None
                and any(abs(test["gravity_g"] - g) <= 0.02 for g in h["gravity"]["g"]))
    moon = next(h for h in H if h["id"] == "moon_base")
    fake = {"o2_basis": "ambient", "o2_fraction": 0.34, "pressure_atm": 0.5, "gravity_g": 0.166}
    check("a future Moon-gravity test in Moon Base air would count for the Moon Base card, a microgravity one or one with no gravity value would not",
          fits(fake, moon) and not fits(dict(fake, gravity_g=0.0), moon)
          and not fits({k: v for k, v in fake.items() if k != "gravity_g"}, moon))
    both = {h["id"]: sum(1 for t in T if fits(t, h)) for h in H}
    check("tests matching air and gravity: ISS 171, every other place 0", both == {"moon_base": 0, "moon_base_nasa": 0, "iss": 171, "spacesuit": 0, "earth_sea_level": 0}, str(both))

    # ---- report ------------------------------------------------------------------------------
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}{'' if ok or not detail else '  -> ' + detail}")
    fails = sum(1 for _, ok, _ in results if not ok)
    print(f"\n{len(results) - fails} passed, {fails} failed")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
