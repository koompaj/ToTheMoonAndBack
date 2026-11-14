"""Summarise every downloaded PSI file in <docs_dir>/<accession>/ so the files can be searched without
opening them one by one. Downloaded files are untrusted data: they are only read, never executed.

Writes:
  <docs_dir>/_raw_summary/<accession>.json   one entry per file (type, size, and what could be read)
  <docs_dir>/_raw_summary/INDEX.md           column names by investigation
  <docs_dir>/_text/<accession>/<file>.txt    text of pdf / pptx / docx / rtf / old binary files

Per type:
  csv txt asc dat log meta metadata errors next xml sfk   first 5 lines, delimiter, header, unit row,
                                                          row count, min / max of numeric columns
  xlsx xlsm      per sheet: first rows, header and unit rows, row count, min / max per numeric column
  pdf            pdftotext -layout into _text/ (kept if already there), page count, start of text
  pptx docx rtf  text into _text/, word count, start of text
  doc ppt xls pxp  printable text runs into _text/, marked as such
  zip            names of the files inside (never extracted)
  anything else  "not read" with the reason
Python standard library plus the pdftotext program.
Usage:  python -I summarize_raw.py <docs_dir>
"""
import collections
import io
import json
import os
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RELNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
TEXT_TABLE = {"csv", "txt", "asc", "dat", "log", "meta", "metadata", "errors", "next", "xml", "sfk"}
MAX_TEXT_BYTES = 200e6
UNIT_RE = re.compile(r"^[\(\[]?\s*(s|sec|ms|deg ?C|degC|C|K|F|psi|psia|psig|kPa|Pa|atm|torr|mm|cm|m|mg|g|kg|%|"
                     r"V|mV|W|W/cm2|W/m2|mW/cm2|mw/cm\^2|slpm|sccm|cm/s|cm/sec|mm/s|m/s|ppm|lpm|Hz|mA|A|amps?|rpm|mol|"
                     r"ug/m3|mg/m3|counts?|volts?|degrees ?[CFK]|seconds?)"
                     r"\s*[\)\]]?$", re.I)


def num(v):
    try:
        f = float(v)
        return f if f == f and abs(f) != float("inf") else None
    except (TypeError, ValueError):
        return None


def decode(raw):
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", "replace")


def pick_delim(lines):
    best, score = "ws", 0
    for d in ("\t", ",", ";"):
        counts = [l.count(d) for l in lines[:50] if l.strip()]
        if counts:
            k, freq = collections.Counter(counts).most_common(1)[0]
            if k > 0 and k * freq > score:
                best, score = d, k * freq
    return best


def split_line(line, delim):
    if delim == "ws":
        return line.split()
    return [c.strip().strip('"') for c in line.split(delim)]


def numeric_share(r):
    cells = [c for c in r if c != ""]
    return (sum(1 for c in cells if num(c) is not None) / len(cells)) if cells else 0


def table_summary(rows, max_cols=200):
    """rows: list of lists of strings. Data starts at the first run of 3 rows that are mostly numeric."""
    start = None
    for i in range(min(len(rows), 3000)):
        need = min(3, len(rows) - i)
        if all(numeric_share(rows[i + k]) >= 0.6 for k in range(need)):
            start = i
            break
    if start is None:
        return {"structure": "no numeric block found", "rows": len(rows)}
    pre = [r for r in rows[:start] if any(c for c in r)]
    header = pre[-1] if pre else []
    unit = None
    if len(pre) >= 2:
        filled = [c for c in pre[-1] if c]
        if filled and sum(1 for c in filled if UNIT_RE.match(c)) >= max(1, len(filled) // 2):
            unit, header = pre[-1], pre[-2]
    body = rows[start:]
    width = max((len(r) for r in body[:500]), default=0)
    cols = []
    for j in range(min(width, max_cols)):
        vals = [num(r[j]) for r in body if j < len(r)]
        vals = [v for v in vals if v is not None]
        c = {"name": (header[j] if j < len(header) and header[j] else f"col{j + 1}")[:80]}
        if unit and j < len(unit) and unit[j]:
            c["unit"] = unit[j]
        if vals:
            c.update(n=len(vals), min=min(vals), max=max(vals))
        cols.append(c)
    return {"preamble": [" | ".join(r)[:200] for r in pre[:12]], "unit_row": unit, "data_start_row": start + 1,
            "rows": len(body), "columns": cols, "columns_truncated": width > max_cols}


def text_table(path):
    lines = decode(open(path, "rb").read()).splitlines()
    delim = pick_delim(lines[:400])
    out = {"first_lines": [l[:300] for l in lines[:5]], "line_count": len(lines),
           "delimiter": {"\t": "tab", ",": "comma", ";": "semicolon", "ws": "whitespace"}[delim]}
    out.update(table_summary([split_line(l, delim) for l in lines]))
    return out


def col_index(ref):
    i = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        i = i * 26 + ord(ch) - 64
    return i - 1


def xlsx_rows(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = {}
        if "xl/_rels/workbook.xml.rels" in names:
            for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels")):
                rels[r.get("Id")] = r.get("Target")
        for s in wb.find("m:sheets", NS):
            t = rels.get(s.get(RELNS), "").lstrip("/")
            part = t if t.startswith("xl/") else "xl/" + t
            if part not in names:
                yield s.get("name"), None
                continue
            rows = []
            for _, el in ET.iterparse(io.BytesIO(z.read(part))):
                if el.tag == "{%s}row" % NS["m"]:
                    row = []
                    for c in el.findall("m:c", NS):
                        v = c.find("m:v", NS)
                        val = "" if v is None else v.text or ""
                        if c.get("t") == "s" and val:
                            val = shared[int(val)]
                        elif c.get("t") == "inlineStr":
                            val = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                        idx = col_index(c.get("r")) if c.get("r") else len(row)
                        row += [""] * (idx - len(row)) + [val.strip()]
                    rows.append(row)
                    el.clear()
            yield s.get("name"), rows


def xlsx_summary(path):
    sheets = []
    for name, rows in xlsx_rows(path):
        if rows is None:
            sheets.append({"sheet": name, "note": "no worksheet part (chart sheet)"})
            continue
        s = {"sheet": name, "first_rows": [" | ".join(r)[:300] for r in rows[:5]]}
        s.update(table_summary(rows))
        sheets.append(s)
    return {"sheets": sheets}


def office_text(path, part_re):
    with zipfile.ZipFile(path) as z:
        parts = sorted((n for n in z.namelist() if re.fullmatch(part_re, n)),
                       key=lambda n: int(re.search(r"(\d+)\.xml$", n).group(1)) if re.search(r"\d+\.xml$", n) else 0)
        out = []
        for n in parts:
            xml = re.sub(r"</(w:p|a:p)>", "\n", z.read(n).decode("utf-8", "replace"))
            t = re.sub(r"<[^>]+>", "", xml)
            out.append(t.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").strip())
        return out


def rtf_text(path):
    t = decode(open(path, "rb").read())
    t = re.sub(r"\\par[d]?\b", "\n", t)
    t = re.sub(r"\\'[0-9a-f]{2}", "", t)
    t = re.sub(r"\\[a-zA-Z]+-?\d* ?", "", t)
    return re.sub(r"[{}]", "", t)


def binary_strings(path):
    raw = open(path, "rb").read()
    runs = [r.decode("utf-16le", "ignore") for r in re.findall(rb"(?:[\x20-\x7e]\x00){6,}", raw)]
    runs += [r.decode("latin-1") for r in re.findall(rb"[\x20-\x7e]{6,}", raw)]
    return "[old binary format: readable text runs only]\n" + "\n".join(dict.fromkeys(t.strip() for t in runs if t.strip()))


def save_text(text_root, acc, name, text):
    dest = os.path.join(text_root, acc, name + ".txt")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, "w", encoding="utf-8").write(text)


def start_of(t):
    return re.sub(r"\s+", " ", t)[:300]


def summarise(path, acc, name, text_root):
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    e = {"file": name, "type": ext, "bytes": os.path.getsize(path)}
    if ext in TEXT_TABLE:
        if e["bytes"] > MAX_TEXT_BYTES:
            e["not_read"] = "over 200 MB"
        else:
            e.update(text_table(path))
    elif ext in ("xlsx", "xlsm"):
        e.update(xlsx_summary(path))
    elif ext == "pdf":
        dest = os.path.join(text_root, acc, name + ".txt")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if not os.path.exists(dest):
            p = subprocess.run(["pdftotext", "-layout", path, dest], capture_output=True)
            if p.returncode:
                e["not_read"] = "pdftotext: " + p.stderr.decode("utf-8", "replace")[:200]
                return e
        t = open(dest, encoding="utf-8", errors="replace").read()
        e.update(pages=t.count("\f") + (1 if t else 0), words=len(t.split()), start=start_of(t))
        if len(t.split()) < 5:
            e["note"] = "no text layer (scanned or image-only PDF)"
    elif ext in ("pptx", "docx"):
        blocks = office_text(path, r"ppt/slides/slide\d+\.xml" if ext == "pptx" else r"word/document\.xml")
        t = "\n".join(f"=== slide {i + 1}\n{b}" for i, b in enumerate(blocks)) if ext == "pptx" else "\n".join(blocks)
        save_text(text_root, acc, name, t)
        e.update(words=len(t.split()), start=start_of(t))
        if ext == "pptx":
            e["slides"] = len(blocks)
    elif ext == "rtf":
        t = rtf_text(path)
        save_text(text_root, acc, name, t)
        e.update(words=len(t.split()), start=start_of(t))
    elif ext in ("doc", "ppt", "xls", "pxp"):
        t = binary_strings(path)
        save_text(text_root, acc, name, t)
        e.update(note="old binary format: printable text runs only", words=len(t.split()), start=start_of(t))
    elif ext == "zip":
        try:
            with zipfile.ZipFile(path) as z:
                infos = z.infolist()
                e.update(zip_entries=len(infos), zip_names=[i.filename for i in infos[:200]],
                         zip_uncompressed_bytes=sum(i.file_size for i in infos), note="listed only, never extracted")
        except zipfile.BadZipFile as x:
            e["not_read"] = f"bad zip: {x}"
    else:
        e["not_read"] = f"type .{ext} not handled (image, instrument binary or unknown format)"
    return e


def main():
    root = os.path.abspath(sys.argv[1])
    out_root, text_root = os.path.join(root, "_raw_summary"), os.path.join(root, "_text")
    os.makedirs(out_root, exist_ok=True)
    index = {}
    for acc in sorted((d for d in os.listdir(root) if d.startswith("PSI-")), key=lambda a: int(a[4:])):
        entries = []
        for name in sorted(os.listdir(os.path.join(root, acc))):
            if name.endswith(".part"):
                continue
            path = os.path.join(root, acc, name)
            try:
                e = summarise(path, acc, name, text_root)
            except Exception as x:  # noqa: BLE001
                e = {"file": name, "bytes": os.path.getsize(path), "not_read": f"error: {str(x)[:200]}"}
            entries.append(e)
        json.dump(entries, open(os.path.join(out_root, f"{acc}.json"), "w", encoding="utf-8"), indent=1)
        cols = collections.Counter()
        for e in entries:
            for c in e.get("columns", []):
                cols[(c["name"], c.get("unit"))] += 1
            for s in e.get("sheets", []):
                for c in s.get("columns", []):
                    cols[(c["name"], c.get("unit"))] += 1
        types = collections.Counter(e.get("type", "?") for e in entries)
        bad = sum(1 for e in entries if "not_read" in e)
        index[acc] = (len(entries), types, cols, bad)
        print(f"{acc:8} {len(entries):5} files, {bad} not read", flush=True)
    with open(os.path.join(out_root, "INDEX.md"), "w", encoding="utf-8") as f:
        f.write("# Column names by investigation (generated by scripts/summarize_raw.py)\n\n"
                "x N = number of files or sheets with that column. [unit] = the unit row, when one was found.\n")
        for acc, (n, types, cols, bad) in index.items():
            f.write(f"\n## {acc}: {n} files ({', '.join(f'{k} {v}' for k, v in types.most_common())}); {bad} not read\n\n")
            for (name, unit), k in sorted(cols.items(), key=lambda x: -x[1])[:150]:
                f.write(f"- `{name}`{f' [{unit}]' if unit else ''} x{k}\n")
            if len(cols) > 150:
                f.write(f"- ... {len(cols) - 150} more\n")


if __name__ == "__main__":
    main()
