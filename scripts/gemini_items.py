"""List every item in the Gemini answer files (gemini_data/G*.md) as one compact table.

Gemini's JSON is not always valid (some keys miss a quote mark), so fields are read
one by one with a tolerant pattern instead of json.loads.

Usage:  python -I gemini_items.py <gemini_data_dir> [out.json]
"""
import glob
import json
import os
import re
import sys

FIELDS = ["id", "topic", "applies_to", "claim", "value", "unit", "converted", "source_title",
          "source_url", "source_doi", "source_location", "quote", "source_date", "status", "confidence"]


def field(block, name):
    # "name": "value"  or  "name: "value"  (missing quote)  or  "name": null
    m = re.search(r'"%s"?\s*:\s*(null|"((?:[^"\\]|\\.)*)")' % re.escape(name), block)
    if not m:
        return None
    return None if m.group(1) == "null" else bytes(m.group(2), "utf-8").decode("unicode_escape", "ignore") \
        if "\\u" in m.group(2) else m.group(2).replace('\\"', '"')


def items(path):
    text = open(path, encoding="utf-8").read()
    out, malformed = [], []
    for block in re.findall(r"\{[^{}]*\}", text, flags=re.S):
        if '"id"' not in block:
            continue
        rec = {f: field(block, f) for f in FIELDS}
        for f in FIELDS:
            if re.search(r'"%s\s*:' % f, block) or re.search(r'[^"]%s"\s*:' % f, block):
                malformed.append((rec["id"], f))
        out.append(rec)
    return out, malformed


def main():
    d = sys.argv[1]
    allrecs = []
    for p in sorted(glob.glob(os.path.join(d, "G*.md"))):
        recs, bad = items(p)
        allrecs += [dict(r, file=os.path.basename(p)) for r in recs]
        st = {}
        for r in recs:
            st[r["status"]] = st.get(r["status"], 0) + 1
        print(f"{os.path.basename(p)}: {len(recs)} items  status={st}  malformed_keys={bad}")
    if len(sys.argv) > 2:
        json.dump(allrecs, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("total", len(allrecs))


if __name__ == "__main__":
    main()
