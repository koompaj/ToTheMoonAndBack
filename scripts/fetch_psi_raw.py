"""Download every non-video, non-image-archive file that NASA's PSI records list for the combustion
investigations into <out_dir>/<accession>/, one file at a time.

Selection: every file in each record's `added` list except videos, ".zip" files in the "Raw Data"
folder (image archives, about 5.9 TB, out of scope) and files already in <out_dir> with the same
sanitised name and size. Downloaded files are untrusted data: this script only saves them.

Usage:  python -I fetch_psi_raw.py <data_dir> <out_dir> [--list]
Writes <out_dir>/raw_manifest.json (ok, failed with reason, skipped).
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

BASE = "https://psi.nasa.gov/geode-py/ws"
UA = "psi-fetch-script/1.0"
CURL = "curl.exe" if os.name == "nt" else "curl"
VIDEO = (".mp4", ".avi", ".mov", ".ts", ".mpg", ".mpeg", ".wmv", ".m4v", ".mkv")


def safe(name):
    return re.sub(r'[<>:"/\|?*]', "_", name)


def choose(acc, name):
    n = name.lower()
    if n.endswith(VIDEO):
        return "video"
    short = name[len(acc) + 1:] if name.startswith(acc + "_") else name
    if short.startswith("Raw Data") and n.endswith(".zip"):
        return "raw_zip"
    return None


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def fetch(acc, name, version, dest):
    last = "no attempt"
    for attempt in range(3):          # first try plus two retries
        for v in dict.fromkeys((version, 1)):
            q = urllib.parse.urlencode({"file": name, "version": v, "redirect": "false"}, quote_via=urllib.parse.quote)
            p = run([CURL, "-sS", "--fail", "--max-time", "60", "-A", UA, f"{BASE}/studies/{acc}/download?{q}"])
            url = p.stdout.strip()
            if p.returncode or not url.startswith("https://"):
                last = f"presign failed (v{v}): {(p.stderr or url)[:200].strip()}"
                continue
            p = run([CURL, "-sS", "--fail", "-L", "--max-time", "900", "-A", UA, "-o", dest + ".part", url])
            if p.returncode == 0:
                os.replace(dest + ".part", dest)
                return None
            last = f"download failed (v{v}): {p.stderr[:200].strip()}"
        time.sleep(2 * (attempt + 1))
    if os.path.exists(dest + ".part"):
        os.remove(dest + ".part")
    return last


def main():
    data, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    listing = "--list" in sys.argv
    search = json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))
    plan, excluded, skipped = [], {}, []
    for s in search:
        acc = s["Accession"]
        rec = json.load(open(os.path.join(data, "investigations", f"{acc}.json"), encoding="utf-8"))
        for f in rec.get("added") or []:
            name, size = f["file_name"], int(f["file_size"])
            why = choose(acc, name)
            if why:
                excluded[why] = excluded.get(why, 0) + 1
                continue
            dest = os.path.join(out, acc, safe(name))
            if os.path.exists(dest) and os.path.getsize(dest) == size:
                skipped.append({"accession": acc, "file": name, "bytes": size, "reason": "already downloaded"})
                continue
            plan.append((acc, name, size, rec.get("version")))
    # Download order only (every planned file is still fetched): the investigations whose table rows
    # lack pressure or oxygen first, then documents and spreadsheets, then the bulk per-test files.
    first = ("PSI-25", "PSI-26", "PSI-98", "PSI-99", "PSI-100", "PSI-107", "PSI-68", "PSI-69")
    docs = (".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".doc", ".ppt", ".rtf", ".csv")

    def rank(p):
        acc, name = p[0], p[1].lower()
        if acc in first:
            return (0, first.index(acc))
        if name.endswith(docs) and "raw data" not in name:
            return (1, 0)
        if name.endswith((".mdipsug", ".meta", ".metadata")):
            return (4, 0)
        return (2 if not name.endswith((".txt", ".asc", ".log")) else 3, 0)
    plan.sort(key=rank)
    total = sum(p[2] for p in plan)
    print(f"plan: {len(plan)} files, {total / 1e9:.2f} GB; already there: {len(skipped)}; excluded: {excluded}")
    by = {}
    for acc, _, size, _ in plan:
        c, b = by.get(acc, (0, 0))
        by[acc] = (c + 1, b + size)
    for k, (c, b) in sorted(by.items()):
        print(f"  {k:8} {c:6} files {b / 1e6:9.1f} MB")
    if listing:
        return
    ok, failed = [], []
    mpath = os.path.join(out, "raw_manifest.json")

    def save():
        json.dump({"excluded_counts": excluded, "ok": ok, "failed": failed, "skipped": skipped,
                   "planned": len(plan), "planned_bytes": total},
                  open(mpath, "w", encoding="utf-8"), indent=1)

    for i, (acc, name, size, version) in enumerate(plan, 1):
        d = os.path.join(out, acc)
        os.makedirs(d, exist_ok=True)
        dest = os.path.join(d, safe(name))
        err = fetch(acc, name, version, dest)
        if err:
            failed.append({"accession": acc, "file": name, "bytes": size, "reason": err})
        else:
            got = os.path.getsize(dest)
            e = {"accession": acc, "file": name, "bytes": got}
            if got != size:
                e["warning"] = f"size {got} != listed {size}"
            ok.append(e)
        if i % 50 == 0:
            save()
            print(f"{i}/{len(plan)} ok {len(ok)} failed {len(failed)}", flush=True)
        time.sleep(0.2)
    save()
    print(f"done: ok {len(ok)}, failed {len(failed)}, skipped {len(skipped)}")


if __name__ == "__main__":
    main()
