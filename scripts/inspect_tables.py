"""Inspect downloaded PSI experimental tables: integrity, shape, and key-column completeness.

Usage:  python -I inspect_tables.py <data_dir>
"""
import csv
import io
import json
import os
import re
import sys

KEY = re.compile(r"o2|oxygen|press|pinit|pfinal|pmean|flow|veloc|air|fuel|material|sample \(|helium|nitrogen|co2|\bco\b|\bhe\b|\bn\b|\bo\b|atmosphere|diam|burn|ext",
                 re.I)


def read_text(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(enc), enc, raw
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1", "replace"), "latin-1?", raw


def main():
    data = os.path.abspath(sys.argv[1])
    man = json.load(open(os.path.join(data, "manifest.json"), encoding="utf-8"))
    total_bytes = 0
    for root, _, files in os.walk(data):
        for f in files:
            total_bytes += os.path.getsize(os.path.join(root, f))
    print(f"total on disk: {total_bytes/1e6:.2f} MB")
    print(f"investigations: {len(man['investigations'])}, failures: {len(man['failures'])}\n")

    for inv in man["investigations"]:
        acc = inv["accession"]
        if not inv["tables"]:
            print(f"== {acc} {inv['acronym']!r}: NO TABLE  ({inv.get('note','')})  files_added_latest_version={inv.get('files_added_in_latest_version')} pubs={inv.get('publication_count')}\n")
            continue
        for t in inv["tables"]:
            path = os.path.join(data, t["file"])
            text, enc, raw = read_text(path)
            size_ok = (t["listed_bytes"] is None) or (t["bytes"] == t["listed_bytes"])
            looks_html = raw[:200].lstrip().lower().startswith((b"<!doctype", b"<html", b"<?xml"))
            rows = list(csv.reader(io.StringIO(text)))
            rows = [r for r in rows if any(c.strip() for c in r)]
            header = rows[0] if rows else []
            body = rows[1:]
            widths = {len(r) for r in body}
            print(f"== {acc} {inv['acronym']!r}: {os.path.basename(t['file'])}")
            print(f"   bytes={t['bytes']} listed={t['listed_bytes']} size_match={size_ok} enc={enc} html={looks_html}")
            print(f"   rows={len(body)} cols={len(header)} row_widths={sorted(widths)}")
            for i, h in enumerate(header):
                vals = [r[i].strip() for r in body if i < len(r)]
                filled = [v for v in vals if v]
                flag = "*" if KEY.search(h) else " "
                uniq = sorted(set(filled))
                sample = "; ".join(uniq[:6])
                if len(sample) > 110:
                    sample = sample[:110] + "..."
                print(f"   {flag} [{i:2}] {h.strip()[:48]!r:52} filled {len(filled):3}/{len(body):3} uniq {len(uniq):3} | {sample}")
            print()


if __name__ == "__main__":
    main()
