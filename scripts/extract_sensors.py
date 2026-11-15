"""List the measurement channels NASA's sensor spreadsheets hold, in the `Sensor` shape of
docs/roles/C-tasks-5-12.md item 5, as CANDIDATES (not applied anywhere).

For every .xlsx / .csv summary in <docs_dir>/_raw_summary/<accession>.json whose file name says it is
sensor or telemetry data, each column whose header names a measurement is kept, with its unit row
and the column letter it was read from. Housekeeping channels (avionics voltages, igniter selects,
time stamps, set points) are left out. The kind is set from words in NASA's header; anything not
recognised becomes "other". Python standard library only; reads only the summaries.

Usage:  python -I extract_sensors.py <docs_dir> <candidates_json>
Rewrites the "sensors" section of <candidates_json>.
"""
import json
import os
import re
import sys

SENSOR_FILE = re.compile(r"sensor|telemetry|\bTM\b", re.I)
SKIP = re.compile(r"time|index|timestamp|avionics|pc104|igniter|select|enable|set ?point|control|smoke ?wire|"
                  r"avg|^col\d+$|^(upstream|downstream) (front|back)$|radiometer ?temp|gain|exposure|24v|5v|12v|"
                  r"body rat|quaternion|attitude|seconds|\(ms\)|repeat\?|\bled\b|trigger|\bgse\b|\bdio\d*|tach /100", re.I)
RULES = [("thermocouple", r"\bTC\d*\b|thermocouple"), ("radiometer", r"radiometer"), ("oxygen", r"\bO2\b|oxygen"),
         ("co2", r"\bCO2\b"), ("pressure", r"press|_pres_|psia|\bkpa\b"), ("flow", r"anemometer|flow|fan speed|velocity"),
         ("humidity", r"humidity"), ("smoke", r"smoke|smk|obscuration|scatter"), ("soot", r"soot")]


def letters(i):
    s, i = "", i + 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def kind_of(name, unit):
    text = f"{name} {unit or ''}"
    for k, pat in RULES:
        if re.search(pat, text, re.I):
            return k
    return "other"


def main():
    docs, cand_path = sys.argv[1:3]
    out = {}
    sdir = os.path.join(docs, "_raw_summary")
    for fn in sorted(os.listdir(sdir)):
        if not fn.endswith(".json"):
            continue
        acc = fn[:-5]
        for e in json.load(open(os.path.join(sdir, fn), encoding="utf-8")):
            if e.get("type") not in ("xlsx", "xlsm", "csv") or not SENSOR_FILE.search(e["file"]):
                continue
            for s in e.get("sheets") or [dict(e, sheet=None)]:
                start = s.get("data_start_row")
                unit_row = (start - 1) if (start and s.get("unit_row")) else None
                for j, c in enumerate(s.get("columns", [])):
                    name, unit = c["name"].strip(), (c.get("unit") or "").strip()
                    if not name or SKIP.search(name) or "n" not in c:
                        continue
                    where = (f"sheet '{s['sheet']}', " if s.get("sheet") else "") + f"column {letters(j)}"
                    if unit_row:
                        where += f" (unit row {letters(j)}{unit_row}: '{unit}')" if unit else ""
                    detail = f"unit {unit}; " if unit else ""
                    detail += f"{c['n']} readings, {c['min']:.6g} to {c['max']:.6g}"
                    out.setdefault(acc, []).append({"kind": kind_of(name, unit), "name": name, "detail": detail,
                                                    "source_file": e["file"], "source_where": where, "quote": None})
    # keep one line per (name, unit) per file; the same channel in several sheets of a file is listed once
    for acc, items in out.items():
        seen, keep = set(), []
        for it in items:
            k = (it["name"], it["detail"].split(";")[0], it["source_file"])
            if k not in seen:
                seen.add(k)
                keep.append(it)
        out[acc] = keep
    doc = json.load(open(cand_path, encoding="utf-8"))
    hand = {a: [x for x in v if x.get("from_text")] for a, v in doc.get("sensors", {}).items()}
    for a, v in hand.items():
        out.setdefault(a, []).extend(v)
    doc["sensors_about"] = ("Candidate Investigation.sensors (C brief item 5): from sensor spreadsheets "
                            "(scripts/extract_sensors.py) and, marked from_text, from NASA's own words in a "
                            "readme or report. Not verified, not applied.")
    doc["sensors"] = out
    json.dump(doc, open(cand_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    for acc, items in out.items():
        print(acc, len(items), sorted({i["kind"] for i in items}))


if __name__ == "__main__":
    main()
