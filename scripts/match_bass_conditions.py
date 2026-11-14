"""Match the BASS experiment table (PSI-26) to NASA's own "as run" test matrix, which records the ISS
environment (oxygen, pressure, CO2) for each test. Prints every match, every conflict and every
table row it cannot tie to exactly one matrix row, and writes them as JSON.

Matching rule (strict): a table row matches a matrix row only when As Run Test #, Test # and
Sample # are all equal (compared as text, so '12-R' must equal '12-R'; a row with any of them blank
is never matched). The date and material are then checked and any difference is reported.
A table row with no matrix row, or with matrix rows that disagree, goes to "unmatched".

The matrix is untrusted data: it is only read. Python standard library only.
Usage:  python -I match_bass_conditions.py <data_dir> <docs_dir> <out_json> [<candidates_json>]
With <candidates_json>, its bass-asrun-* entries are rewritten from the matches.
"""
import csv
import datetime
import io
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
MATRIX = "PSI-26/PSI-26_Science Documents_As Run_Test Matrix.xlsx"
TABLE = "tables/PSI-26/PSI-26_Experimental table_BASS.csv"
WANT = {"as run test no.": "as_run", "test no.": "test", "sample no.": "sample", "material": "material",
        "actual date  (for spice display date, add 1 for leap year)": "date",
        "o2 % by volume": "o2", "pressure, atm": "pressure", "co2, mm hg": "co2",
        "test observations and anomalies (ignited, spread, extinguished, burn time, color, etc.)": "notes"}


def letters(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def col_index(ref):
    i = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        i = i * 26 + ord(ch) - 64
    return i - 1


def sheets(path):
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(M + "si"):
                shared.append("".join(t.text or "" for t in si.iter(M + "t")))
        rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
        for s in ET.fromstring(z.read("xl/workbook.xml")).find(M + "sheets"):
            part = "xl/" + rels[s.get(REL)].lstrip("/").replace("xl/", "", 1)
            rows = []
            for row in ET.fromstring(z.read(part)).iter(M + "row"):
                cells = {}
                for c in row.findall(M + "c"):
                    v = c.find(M + "v")
                    val = "" if v is None else v.text or ""
                    if c.get("t") == "s" and val:
                        val = shared[int(val)]
                    elif c.get("t") == "inlineStr":
                        val = "".join(t.text or "" for t in c.iter(M + "t"))
                    f = c.find(M + "f")
                    formula = None if f is None else ("=" + f.text if f.text else "(shared formula, text not stored in this cell)")
                    cells[col_index(c.get("r"))] = (val.strip(), formula)
                rows.append((int(row.get("r")), cells))
            yield s.get("name"), rows


def as_int(v):
    try:
        f = float(v)
        return int(f) if f == int(f) else None
    except (TypeError, ValueError):
        return None


def ident(v):
    """Test or sample identifier as text: '12' and '12.0' are equal, '12-R' stays '12-R'."""
    v = (v or "").strip().lower()
    i = as_int(v)
    return str(i) if i is not None else (re.sub(r"\s+", "", v) or None)


def norm_material(v):
    return re.sub(r"[\s,]+", " ", (v or "").lower()).strip()


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def excel_date(v):
    n = num(v)
    return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(n))).isoformat() if n else None


def table_date(v):
    m = re.match(r"(\d+)/(\d+)/(\d{4})$", v.strip())
    return datetime.date(int(m.group(3)), int(m.group(1)), int(m.group(2))).isoformat() if m else None


HEADERS = {"oxygen": "O2 % by volume", "pressure": "pressure, atm", "co2": "CO2, mm Hg"}


VITIATED = 0.19   # below this the matrix notes describe nitrogen dilution of the work volume


def kind(q, m):
    if q == "oxygen" and m["o2"] < VITIATED:
        return "oxygen NASA logged under 'ISS environment' for a nitrogen-diluted test (calculated, see notes_quote)"
    return ("value NASA logged under 'ISS environment' for this test; tests in one session usually share it, "
            "so it describes the session, not a reading during the burn")


def write_candidates(path, matched):
    """Replace the bass-asrun-* entries in the candidates file with one entry per matched row and quantity."""
    doc = json.load(open(path, encoding="utf-8"))
    facts = [f for f in doc["facts"] if not f["id"].startswith("bass-asrun-")]
    for m in matched:
        first = sorted(m["matrix_rows"], key=lambda r: r["sheet"] != "as run matrix")[0]
        for q, key, unit, cell, formula in (("oxygen", "o2", "fraction (header says %)", "o2_cell", "o2_formula"),
                                            ("pressure", "pressure_atm", "atm", "pressure_cell", "pressure_formula"),
                                            ("co2", "co2_mmhg", "mmHg", "co2_cell", "co2_formula")):
            if m.get(key) is None:
                continue
            loc = f"sheet '{first['sheet']}', cell {first[cell]} (column header row 3: '{HEADERS[q]}', under 'ISS environment')"
            if first[formula]:
                loc += f"; the cell is a formula: {first[formula]}"
            others = [f"'{r['sheet']}' {r[cell]}" for r in m["matrix_rows"] if r is not first]
            if others:
                loc += f"; same value also in {', '.join(others)}"
            fact = {
                "id": f"bass-asrun-row{m['source_row']}-{q}",
                "status": "candidate, not verified",
                "investigation": "PSI-26",
                "applies_to": {"source_table": TABLE, "source_row": m["source_row"],
                               "As Run Test #": m["table"]["As Run Test #"], "Test #": m["table"]["Test #"],
                               "Sample #": m["table"]["Sample #"]},
                "match": "As Run Test #, Test # and Sample # equal; " + ("; ".join(m["checks"]) or "date and material agree"),
                "quantity": q, "value": m[key], "unit": unit,
                "kind": kind(q, m),
                "source_file": MATRIX.split("/", 1)[1],
                "location": loc,
                "quote": f"{HEADERS[q]} | {first[key.split('_')[0] if q != 'pressure' else 'pressure']}",
            }
            if q == "oxygen" and m["o2"] < VITIATED:
                fact["notes_quote"] = first["notes"]
                fact["caveat"] = ("Below normal ISS air. The matrix notes for several such sessions describe adding N2 to "
                                  "the work volume and a calculated O2 ('Calc 17.07% O2', 'vitiation to 17.3 % o2'); "
                                  "this row's own note is in notes_quote and may not say so. Not a cabin reading.")
            facts.append(fact)
    doc["facts"] = facts
    json.dump(doc, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def main():
    data, docs, out = sys.argv[1:4]
    entries = []
    for sheet, rows in sheets(os.path.join(docs, MATRIX)):
        hdr = None
        for rnum, cells in rows:
            low = {j: v.lower() for j, (v, _) in cells.items()}
            if "as run test no." in low.values():
                hdr = {WANT[v]: j for j, v in low.items() if v in WANT}
                continue
            if not hdr or "o2" not in hdr:
                continue
            g = lambda k: cells.get(hdr[k], ("", False))[0] if k in hdr else ""
            key = (ident(g("as_run")), ident(g("test")), ident(g("sample")))
            if None in key:
                continue
            entries.append({"sheet": sheet, "row": rnum, "key": key, "date": excel_date(g("date")),
                            "material": g("material"), "o2": g("o2"), "pressure": g("pressure"), "co2": g("co2"),
                            "o2_cell": f"{letters(hdr['o2'])}{rnum}", "pressure_cell": f"{letters(hdr['pressure'])}{rnum}",
                            "co2_cell": f"{letters(hdr['co2'])}{rnum}",
                            "o2_formula": cells.get(hdr["o2"], ("", None))[1],
                            "pressure_formula": cells.get(hdr["pressure"], ("", None))[1],
                            "co2_formula": cells.get(hdr["co2"], ("", None))[1],
                            "notes": g("notes")[:300]})
    raw = open(os.path.join(data, TABLE), "rb").read().decode("utf-8-sig")
    table = list(csv.DictReader(io.StringIO(raw)))
    matched, unmatched = [], []
    for i, r in enumerate(table, 1):
        key = (ident(r["As Run Test #"]), ident(r["Test #"]), ident(r["Sample #"]))
        hits = [e for e in entries if e["key"] == key]
        vals = {(e["o2"], e["pressure"], e["co2"]) for e in hits}
        rec = {"source_row": i, "table": {k: r[k] for k in ("Date", "GMT", "As Run Test #", "Test #", "Sample #",
                                                             "Fuel Sample Material")},
               "matrix_rows": [{k: e[k] for k in ("sheet", "row", "date", "material", "o2", "pressure", "co2",
                                                  "o2_cell", "pressure_cell", "co2_cell", "o2_formula", "pressure_formula", "co2_formula", "notes")}
                               for e in hits]}
        checks = []
        td = table_date(r["Date"])
        if hits and td and any(e["date"] != td for e in hits):
            checks.append(f"date differs: table {r['Date']} vs matrix {sorted({e['date'] for e in hits})}")
        if not td:
            checks.append(f"table date not readable: {r['Date']!r}")
        tm = norm_material(r["Fuel Sample Material"])
        if hits and any(norm_material(e["material"]) != tm for e in hits):
            checks.append(f"material differs: table {r['Fuel Sample Material']!r} vs matrix {sorted({e['material'] for e in hits})}")
        rec["checks"] = checks
        if not hits:
            rec["reason"] = "no matrix row with this As Run Test #, Test # and Sample #"
            unmatched.append(rec)
        elif len(vals) > 1:
            rec["reason"] = f"matrix rows disagree: {sorted(vals)}"
            unmatched.append(rec)
        elif not all(num(v) is not None for v in next(iter(vals))[:2]):
            rec["reason"] = f"oxygen or pressure blank or not a number: {next(iter(vals))}"
            unmatched.append(rec)
        else:
            o2, p, co2 = next(iter(vals))
            rec.update(o2=num(o2), pressure_atm=num(p), co2_mmhg=num(co2))
            matched.append(rec)
    if len(sys.argv) > 4:
        write_candidates(sys.argv[4], matched)
    json.dump({"matrix_file": MATRIX, "table": TABLE, "matrix_rows_read": len(entries),
               "matched": matched, "unmatched": unmatched}, open(out, "w", encoding="utf-8"), indent=1)
    print(f"matrix rows read {len(entries)}; table rows {len(table)}; matched {len(matched)}; unmatched {len(unmatched)}")
    print(f"matched with a date or material note: {sum(1 for m in matched if m['checks'])}")
    if matched:
        o2 = [m["o2"] for m in matched]
        p = [m["pressure_atm"] for m in matched]
        print(f"O2 {min(o2)}-{max(o2)}; pressure {min(p)}-{max(p)} atm")
    for u in unmatched:
        print("UNMATCHED row", u["source_row"], u["table"], u["reason"], u["checks"])
    for m in matched:
        if m["checks"]:
            print("NOTE row", m["source_row"], m["checks"])


if __name__ == "__main__":
    main()
