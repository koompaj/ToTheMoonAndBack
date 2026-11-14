"""Download the small, structured slice of NASA PSI combustion data.

Saves, under <out_dir>:
  search_combustion.json        search-level metadata for every Combustion Science investigation
  investigations/<ID>.json      full record per investigation (publications, DOI, total size, and
                                the files added in the latest version - not the full file inventory)
  tables/<ID>/<file>            experimental table file(s) per investigation
  manifest.json                 what was fetched, sizes, and every failure

Raw videos / sensor archives are NOT downloaded.

Usage:  python -I fetch_psi.py <out_dir>
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
CURL = "curl.exe" if os.name == "nt" else "curl"  # works on Windows, macOS and Linux


def curl(url, dest):
    """Fetch url to dest with curl (uses the Windows certificate store). Returns (ok, message)."""
    tmp = dest + ".part"
    p = subprocess.run(
        [CURL, "-sS", "--fail", "--location", "--max-time", "120",
         "-A", UA, "-o", tmp, url],
        capture_output=True, text=True,
    )
    if p.returncode != 0:
        if os.path.exists(tmp):
            os.remove(tmp)
        return False, (p.stderr or "").strip()[:300] or f"curl exit {p.returncode}"
    os.replace(tmp, dest)
    return True, ""


def curl_text(url):
    p = subprocess.run(
        [CURL, "-sS", "--fail", "--max-time", "120", "-A", UA, url],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if p.returncode != 0:
        return None, (p.stderr or "").strip()[:300] or f"curl exit {p.returncode}"
    return p.stdout, ""


def safe_name(name):
    name = os.path.basename(name.replace("\\", "/"))
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .")
    return name or "unnamed"


def main():
    out = os.path.abspath(sys.argv[1])
    inv_dir = os.path.join(out, "investigations")
    tab_dir = os.path.join(out, "tables")
    os.makedirs(inv_dir, exist_ok=True)
    os.makedirs(tab_dir, exist_ok=True)

    manifest = {"fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
                "source": "https://psi.nasa.gov/physci/repo/",
                "investigations": [], "failures": []}

    # 1. Search-level metadata for the whole repository, filtered to Combustion Science.
    text, err = curl_text(f"{BASE}/repo/search?term=&source=psi&type=investigation&size=200")
    if text is None:
        sys.exit(f"search failed: {err}")
    search = json.loads(text)
    total = search["hits"]["total"]
    all_src = [h["_source"] for h in search["hits"]["hits"]]
    if len(all_src) != total:
        manifest["failures"].append(
            {"step": "search", "error": f"got {len(all_src)} of {total} investigations (paging?)"})
    comb = [s for s in all_src if (s.get("Research Area") or "").strip().lower() == "combustion science"]
    comb.sort(key=lambda s: int(s["Accession"].split("-")[1]))
    with open(os.path.join(out, "search_combustion.json"), "w", encoding="utf-8") as f:
        json.dump(comb, f, indent=1, ensure_ascii=False)
    manifest["repository_total"] = total
    manifest["combustion_total"] = len(comb)
    print(f"repository: {total} investigations, combustion science: {len(comb)}")

    # 2. Full record + experimental tables per investigation.
    for s in comb:
        acc = s["Accession"]
        entry = {"accession": acc, "acronym": s.get("Acronym", ""), "title": s.get("Title", ""),
                 "record": None, "tables": []}
        manifest["investigations"].append(entry)

        rec_path = os.path.join(inv_dir, f"{acc}.json")
        ok, err = curl(f"{BASE}/repo/investigations/{acc}", rec_path)
        if not ok:
            manifest["failures"].append({"step": "record", "accession": acc, "error": err})
            print(f"{acc}: RECORD FAILED {err}")
            continue
        try:
            with open(rec_path, encoding="utf-8") as f:
                rec = json.load(f)
        except Exception as e:  # noqa: BLE001
            manifest["failures"].append({"step": "record-parse", "accession": acc, "error": str(e)[:200]})
            print(f"{acc}: RECORD NOT JSON")
            continue
        entry["record"] = os.path.relpath(rec_path, out).replace("\\", "/")
        entry["doi"] = rec.get("doi")
        entry["version"] = rec.get("version")
        entry["total_file_size_bytes"] = rec.get("totalFileSize")
        # "added" lists only the files added in the latest version, NOT the full inventory.
        entry["files_added_in_latest_version"] = len(rec.get("added") or [])
        entry["publication_count"] = len(rec.get("publications") or [])

        tables = rec.get("experimentalTable") or []
        if not tables:
            entry["note"] = "no experimental table listed in PSI record"
        for t in tables:
            fname = t.get("file_name") or ""
            versions = []
            for v in (rec.get("version"), t.get("version"), 1):
                if v is not None and v not in versions:
                    versions.append(v)
            dest_dir = os.path.join(tab_dir, acc)
            os.makedirs(dest_dir, exist_ok=True)
            dest = os.path.join(dest_dir, safe_name(fname))
            got, last_err = False, ""
            for v in versions:
                q = urllib.parse.urlencode({"file": fname, "version": v, "redirect": "false"},
                                           quote_via=urllib.parse.quote)
                url_text, err = curl_text(f"{BASE}/studies/{acc}/download?{q}")
                if url_text is None or not url_text.strip().startswith("https://"):
                    last_err = err or f"no presigned url (version {v}): {(url_text or '')[:120]}"
                    continue
                ok, err = curl(url_text.strip(), dest)
                if ok:
                    got = True
                    break
                last_err = err
            if got:
                entry["tables"].append({"file": os.path.relpath(dest, out).replace("\\", "/"),
                                        "source_name": fname,
                                        "bytes": os.path.getsize(dest),
                                        "listed_bytes": t.get("file_size")})
            else:
                manifest["failures"].append({"step": "table", "accession": acc, "file": fname, "error": last_err})
            time.sleep(0.3)
        print(f"{acc:8} {entry['acronym'][:22]:22} record ok, tables {len(entry['tables'])}/{len(tables)}")
        time.sleep(0.3)

    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
    print(f"\nfailures: {len(manifest['failures'])}")
    for fl in manifest["failures"]:
        print("  ", fl)


if __name__ == "__main__":
    main()
