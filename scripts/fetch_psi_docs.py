"""Download NASA's reports, presentations, engineering documents and sensor logs for the PSI combustion
investigations (a chosen subset, not the videos or image archives) into <out_dir>/<accession>/.

Selection (see choose()): every report-like file; presentations for the solid, smoke, droplet and gas
experiments except very large decks; engineering documents for BASS, BASS-II and Saffire (no part
drawings); every Saffire sensor log. Files already downloaded with the right size are skipped.

Usage:  python -I fetch_psi_docs.py <data_dir> <out_dir> [--list]
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
MAX_FILE = 60e6          # skip any single file above 60 MB
PRESENTATIONS = {"PSI-26", "PSI-25", "PSI-100", "PSI-102", "PSI-101", "PSI-39", "PSI-23", "PSI-47", "PSI-117"}
ENGINEERING = {"PSI-26", "PSI-25", "PSI-98", "PSI-100"}
SENSORS = {"PSI-98", "PSI-100"}


def choose(acc, name, size):
    n = name.lower()
    if size > MAX_FILE or re.search(r"\.(mp4|avi|mov|ts|zip|mdipsug|jpg|png|tif)$", n) or "proofsheet" in n:
        return None
    short = name[len(acc) + 1:]
    if re.match(r"(Reports|Science Documents)_", short) and n.endswith((".pdf", ".doc", ".docx", ".txt")):
        return "report"
    if acc in PRESENTATIONS and re.match(r"Presentations_", short):
        return "presentation"
    if acc in ENGINEERING and re.match(r"Engineering Documents_", short) and "drawing" not in n:
        return "engineering"
    if acc in SENSORS and re.match(r"Raw Data_", short) and n.endswith((".xlsx", ".csv", ".docx", ".pdf")):
        return "sensor"
    return None


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def main():
    data, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    listing = "--list" in sys.argv
    search = json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))
    plan = []
    for s in search:
        acc = s["Accession"]
        rec = json.load(open(os.path.join(data, "investigations", f"{acc}.json"), encoding="utf-8"))
        for f in rec.get("added") or []:
            kind = choose(acc, f["file_name"], f["file_size"])
            if kind:
                plan.append((acc, kind, f["file_name"], int(f["file_size"]), rec.get("version")))
    total = sum(p[3] for p in plan)
    print(f"{len(plan)} files, {total / 1e6:.0f} MB")
    by = {}
    for acc, kind, *_ in plan:
        by[(acc, kind)] = by.get((acc, kind), 0) + 1
    for k, v in sorted(by.items()):
        print(f"  {k[0]:8} {k[1]:12} {v}")
    if listing:
        return
    ok = fail = skip = 0
    log = []
    for acc, kind, name, size, version in plan:
        d = os.path.join(out, acc)
        os.makedirs(d, exist_ok=True)
        dest = os.path.join(d, re.sub(r'[<>:"/\\|?*]', "_", name))
        if os.path.exists(dest) and os.path.getsize(dest) == size:
            skip += 1
            continue
        got = False
        for v in (version, 1):
            q = urllib.parse.urlencode({"file": name, "version": v, "redirect": "false"}, quote_via=urllib.parse.quote)
            p = run([CURL, "-sS", "--fail", "--max-time", "60", "-A", UA, f"{BASE}/studies/{acc}/download?{q}"])
            url = p.stdout.strip()
            if p.returncode or not url.startswith("https://"):
                continue
            p = run([CURL, "-sS", "--fail", "-L", "--max-time", "600", "-A", UA, "-o", dest + ".part", url])
            if p.returncode == 0:
                os.replace(dest + ".part", dest)
                got = True
                break
        if got:
            ok += 1
            if os.path.getsize(dest) != size:
                log.append({"file": name, "warning": f"size {os.path.getsize(dest)} != listed {size}"})
        else:
            fail += 1
            log.append({"file": name, "error": "download failed"})
        time.sleep(0.2)
    json.dump({"plan": [dict(zip(("accession", "kind", "file", "bytes", "version"), p)) for p in plan], "problems": log},
              open(os.path.join(out, "manifest.json"), "w", encoding="utf-8"), indent=1)
    print(f"downloaded {ok}, already there {skip}, failed {fail}; problems: {len(log)}")
    for x in log[:20]:
        print("  ", x)


if __name__ == "__main__":
    main()
