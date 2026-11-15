"""Write data_sourced/bass_conditions.json: oxygen and pressure for each BASS (PSI-26) test from NASA's
"as run" test matrix, taken from the raw-scan candidates (scripts/match_bass_conditions.py) after
workstream A spot-checked them by hand on 2026-11-15 with a separate reader (10 rows, every value equal).
CO2 is kept here for reference but is not applied: in tests.json co2_fraction means CO2 added to the air
as a suppressant (FLEX), while BASS's CO2 is the ISS cabin level.
Usage:  python -I bass_conditions_from_candidates.py <repo_root>
"""
import json
import os
import sys

root = os.path.abspath(sys.argv[1])
cand = json.load(open(os.path.join(root, "data_sourced", "raw_candidates.json"), encoding="utf-8"))["facts"]
by = {}
for f in cand:
    if not f["id"].startswith("bass-asrun"):
        continue
    a = f["applies_to"]
    e = by.setdefault(a["source_row"], {"source_row": a["source_row"], "as_run_test": a["As Run Test #"],
                                         "test": a["Test #"], "sample": a["Sample #"], "match": f["match"]})
    e[f["quantity"]] = {"value": f["value"], "unit": "fraction" if f["quantity"] == "oxygen" else f["unit"],
                        "location": f["location"], "quote": f["quote"]}
    if f["quantity"] == "oxygen":
        e["diluted"] = "nitrogen-diluted" in f["kind"]
        if e["diluted"]:
            e["notes_quote"] = f.get("notes_quote")
out = {
    "about": "Oxygen and pressure NASA logged under 'ISS environment' for each BASS test, from its as-run test "
             "matrix. Applied to tests.json by build_web_data.py; validate_data.py re-reads every cell when "
             "data_extra/ is present. Values describe the test session's atmosphere, not a reading during the burn. "
             "Tests marked diluted ran in nitrogen-diluted air in the glovebox work volume; NASA's notes give the "
             "oxygen as calculated. CO2 is listed but not applied (see scripts/bass_conditions_from_candidates.py).",
    "source_file": "PSI-26_Science Documents_As Run_Test Matrix.xlsx",
    "source_title": "BASS As Run Test Matrix (PSI-26, Science Documents)",
    "checked": "2026-11-15: rows 1, 7, 20, 42, 43, 51, 67, 77, 84, 122 re-read by hand with a separate reader; "
               "diluted rows 82-118 checked against NASA's notes",
    "tests": [by[k] for k in sorted(by)],
}
json.dump(out, open(os.path.join(root, "data_sourced", "bass_conditions.json"), "w", encoding="utf-8", newline="\n"),
          ensure_ascii=False, indent=1)
print(len(out["tests"]), "tests;", sum(t.get("diluted", False) for t in out["tests"]), "diluted")
