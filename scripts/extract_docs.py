"""Turn the downloaded NASA documents (data_extra/) into searchable text and spreadsheet summaries.

For each file in <docs_dir>/<accession>/ it writes <docs_dir>/_text/<accession>/<file>.txt:
  .pdf          pdftotext -layout, pages separated by form feeds
  .docx/.pptx   text from the Office XML (one block per slide for .pptx, marked "=== slide N")
  .xlsx/.csv    every sheet's header row, plus min / max / count for each numeric column
  .doc/.ppt     readable text runs only (old binary formats; marked as such)
and <docs_dir>/_text/index.json with what was extracted from each file.

Python standard library plus the pdftotext program.
Usage:  python -I extract_docs.py <docs_dir>
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def office_text(path, part_re):
    with zipfile.ZipFile(path) as z:
        names = sorted((n for n in z.namelist() if re.fullmatch(part_re, n)),
                       key=lambda n: int(re.search(r"(\d+)\.xml$", n).group(1)) if re.search(r"\d+\.xml$", n) else 0)
        blocks = []
        for n in names:
            xml = z.read(n).decode("utf-8", "replace")
            xml = re.sub(r"</(w:p|a:p)>", "\n", xml)
            txt = re.sub(r"<[^>]+>", "", xml)
            txt = re.sub(r"&amp;", "&", re.sub(r"&lt;", "<", re.sub(r"&gt;", ">", txt)))
            blocks.append((n, txt.strip()))
        return blocks


def col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    i = 0
    for ch in letters:
        i = i * 26 + ord(ch) - 64
    return i - 1


def num(v):
    try:
        f = float(v)
        return f if f == f and abs(f) != float("inf") else None
    except (TypeError, ValueError):
        return None


def summarise_rows(rows, label):
    """rows: list of lists of cell strings. The header is the first row with 3+ text cells."""
    hdr_i = next((i for i, r in enumerate(rows[:30]) if sum(1 for c in r if c and num(c) is None) >= 3), 0)
    header = rows[hdr_i] if rows else []
    body = rows[hdr_i + 1:]
    width = max((len(r) for r in rows), default=0)
    lines = [f"--- {label}: {len(body)} data rows, {width} columns (header at row {hdr_i + 1})"]
    for j in range(width):
        name = header[j] if j < len(header) and header[j] else f"col{j + 1}"
        vals = [num(r[j]) for r in body if j < len(r)]
        vals = [v for v in vals if v is not None]
        if vals:
            lines.append(f"  [{name}] n={len(vals)} min={min(vals):.6g} max={max(vals):.6g} first={vals[0]:.6g}")
        else:
            sample = sorted({r[j] for r in body[:200] if j < len(r) and r[j]})[:4]
            lines.append(f"  [{name}] text, e.g. {sample}")
    return lines


def xlsx_text(path):
    out = []
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheet_names = [s.get("name") for s in wb.find("m:sheets", NS)]
        sheets = sorted((n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)),
                        key=lambda n: int(re.search(r"(\d+)\.xml$", n).group(1)))
        for k, n in enumerate(sheets):
            rows = []
            for _, el in ET.iterparse(io.BytesIO(z.read(n))):
                if el.tag == "{%s}row" % NS["m"]:
                    row = []
                    for c in el.findall("m:c", NS):
                        v = c.find("m:v", NS)
                        val = "" if v is None else v.text or ""
                        if c.get("t") == "s" and val:
                            val = shared[int(val)]
                        elif c.get("t") == "inlineStr":
                            val = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                        idx = col_index(c.get("r"))
                        row += [""] * (idx - len(row)) + [val]
                    rows.append(row)
                    el.clear()
            label = sheet_names[k] if k < len(sheet_names) else n
            out += summarise_rows(rows, f"sheet '{label}'")
    return "\n".join(out)


def csv_text(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = [[c.strip() for c in r] for r in csv.reader(io.StringIO(text))]
    return "\n".join(summarise_rows(rows, "csv"))


def binary_strings(path):
    raw = open(path, "rb").read()
    runs = re.findall(rb"(?:[\x20-\x7e]\x00){6,}", raw)                 # UTF-16LE text, as in .doc/.ppt
    txt = [r.decode("utf-16le", "ignore") for r in runs]
    txt += [r.decode("latin-1") for r in re.findall(rb"[\x20-\x7e]{8,}", raw)]
    return "[old binary format: readable text runs only]\n" + "\n".join(dict.fromkeys(t.strip() for t in txt if t.strip()))


def main():
    root = os.path.abspath(sys.argv[1])
    out_root = os.path.join(root, "_text")
    index = []
    for acc in sorted(d for d in os.listdir(root) if d.startswith("PSI-")):
        for name in sorted(os.listdir(os.path.join(root, acc))):
            path = os.path.join(root, acc, name)
            ext = name.rsplit(".", 1)[-1].lower()
            dest = os.path.join(out_root, acc, name + ".txt")
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            entry = {"accession": acc, "file": name, "type": ext, "ok": True}
            try:
                if ext == "pdf":
                    p = subprocess.run(["pdftotext", "-layout", path, dest], capture_output=True)
                    if p.returncode:
                        raise RuntimeError(p.stderr.decode("utf-8", "replace")[:200])
                    text = open(dest, encoding="utf-8", errors="replace").read()
                    entry["pages"] = text.count("\f") + (1 if text else 0)
                else:
                    if ext == "docx":
                        text = "\n".join(t for _, t in office_text(path, r"word/document\.xml"))
                    elif ext == "pptx":
                        blocks = office_text(path, r"ppt/slides/slide\d+\.xml")
                        text = "\n".join(f"=== slide {i + 1}\n{t}" for i, (_, t) in enumerate(blocks))
                        entry["slides"] = len(blocks)
                    elif ext in ("xlsx", "xlsm"):
                        text = xlsx_text(path)
                    elif ext == "csv":
                        text = csv_text(path)
                    elif ext in ("doc", "ppt", "xls"):
                        text = binary_strings(path)
                        entry["note"] = "old binary format, text runs only"
                    elif ext == "txt":
                        text = open(path, encoding="utf-8", errors="replace").read()
                    else:
                        entry.update(ok=False, note="type not handled")
                        index.append(entry)
                        continue
                    open(dest, "w", encoding="utf-8").write(text)
                entry["words"] = len(re.findall(r"\w+", open(dest, encoding="utf-8", errors="replace").read()))
            except Exception as e:  # noqa: BLE001
                entry.update(ok=False, note=str(e)[:200])
            index.append(entry)
            print(f"{'ok ' if entry['ok'] else 'ERR'} {acc:8} {entry.get('words', 0):7} words  {name[:90]}  {entry.get('note', '')}")
    json.dump(index, open(os.path.join(out_root, "index.json"), "w", encoding="utf-8"), indent=1)
    bad = [e for e in index if not e["ok"]]
    print(f"\n{len(index)} files, {len(bad)} not extracted")


if __name__ == "__main__":
    main()
