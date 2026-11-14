"""Mechanical first pass over the Gemini items (gemini_data/G*.md). It does NOT mark anything verified.

For each item it records what could be checked automatically:
  quote_in_psi_record   the quote appears word-for-word in our downloaded PSI record (strong)
  table_cell_in_psi     the quote is "Column: value" and that value is in that column of the PSI table
  quote_on_page         the quote appears word-for-word in the fetched web page text (strong)
  quote_not_in_source   source text was read, the quote is NOT in it (red flag)
  doi_exists            Crossref knows the DOI; title similarity recorded (quote not checkable: paywall)
  doi_not_found         Crossref does not know the DOI (red flag)
  needs_browser         NTRS and other sites that refuse scripted requests
  not_checked           anything else

A person (or workstream A in the browser) still has to confirm values before use.

Usage:  python -I verify_gemini.py <items.json from gemini_items.py> <data_dir> <out.json>
"""
import csv
import difflib
import html
import io
import json
import os
import re
import subprocess
import sys
import time

UA = "Mozilla/5.0 (compatible; psi-verify/1.0)"
CURL = "curl.exe" if os.name == "nt" else "curl"


def norm(s):
    s = html.unescape(s or "")
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace(" ", " ").replace("�", "")
    s = re.sub(r"[^\w%./+-]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def quote_parts(q):
    """Split on ellipses; each part must be found. Drop very short parts."""
    parts = [p for p in re.split(r"\.\.\.|…", q or "") if len(norm(p)) >= 12]
    return [norm(p) for p in parts] or ([norm(q)] if q else [])


def curl(url, accept="*/*"):
    p = subprocess.run([CURL, "-sS", "-L", "--max-time", "40", "-A", UA, "-H", f"Accept: {accept}", "-w", "\n%{http_code}", url],
                       capture_output=True)
    body = p.stdout.decode("utf-8", "replace")
    code = body.rsplit("\n", 1)[-1] if "\n" in body else ""
    return code, body.rsplit("\n", 1)[0]


def page_text(raw):
    raw = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", raw)
    return norm(re.sub(r"(?s)<[^>]+>", " ", raw))


def load_psi(data):
    search = {s["Accession"]: s for s in json.load(open(os.path.join(data, "search_combustion.json"), encoding="utf-8"))}
    man = {i["accession"]: i for i in json.load(open(os.path.join(data, "manifest.json"), encoding="utf-8"))["investigations"]}
    by_doi, text, tables = {}, {}, {}
    for acc, s in search.items():
        rec = json.load(open(os.path.join(data, "investigations", f"{acc}.json"), encoding="utf-8"))
        if rec.get("doi"):
            by_doi[rec["doi"].lower()] = acc
        strings = []

        def walk(o):
            if isinstance(o, str):
                strings.append(o)
            elif isinstance(o, dict):
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(s)
        walk({k: rec.get(k) for k in ("objective", "approach", "hypothesis", "researchImpacts", "description", "title")})
        tabs = []
        for t in man[acc]["tables"]:
            raw = open(os.path.join(data, t["file"]), "rb").read()
            for enc in ("utf-8-sig", "cp1252"):
                try:
                    txt = raw.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            rows = [r for r in csv.reader(io.StringIO(txt)) if any(c.strip() for c in r)]
            tabs.append(rows)
            strings.append(txt)
        text[acc] = norm(" ".join(strings))
        tables[acc] = tabs
    return by_doi, text, tables


def psi_acc(item, by_doi):
    m = re.search(r"PSI-\d+", (item.get("source_url") or "") + " " + (item.get("source_title") or ""))
    if m:
        return m.group(0)
    d = (item.get("source_doi") or "").lower()
    return by_doi.get(d)


def table_cell_check(quote, tabs):
    """Quotes such as 'Percent O2: 21.5 - 21.7' or 'Sample Length: 94 cm, Sample Width: 40.6 cm'."""
    pairs = re.findall(r"([A-Za-z?µ][^:,]{1,60}?)\s*:\s*([^,]+?)(?=,\s*[A-Za-z?][^:,]{1,60}:|$)", quote or "")
    if not pairs:
        return None
    ok_all, notes = True, []
    for head, val in pairs:
        h, v = norm(head), norm(val)
        hit = False
        for rows in tabs:
            hdr = [norm(c) for c in rows[0]]
            for j, c in enumerate(hdr):
                if c and (c == h or h in c or c in h):
                    col = " | ".join(norm(r[j]) for r in rows[1:] if j < len(r))
                    vals = [x.strip() for x in re.split(r"\s*(?:,|\bto\b|\band\b)\s*", v) if x.strip()]
                    if all(x in col for x in vals):
                        hit = True
        notes.append(f"{head.strip()}={'ok' if hit else 'MISSING'}")
        ok_all &= hit
    return ok_all, "; ".join(notes)


def main():
    items = json.load(open(sys.argv[1], encoding="utf-8"))
    by_doi, psi_text, psi_tables = load_psi(sys.argv[2])
    page_cache, doi_cache, results = {}, {}, []
    for it in items:
        url = it.get("source_url") or ""
        doi = (it.get("source_doi") or "").strip()
        q = it.get("quote") or ""
        r = {"id": it["id"], "file": it["file"], "status_by_gemini": it.get("status"), "source_url": url,
             "source_doi": doi or None, "check": "not_checked", "detail": ""}
        acc = psi_acc(it, by_doi) if ("psi.nasa.gov" in url or doi.lower().startswith("10.60555")) else None
        if acc and acc in psi_text:
            parts = quote_parts(q)
            if parts and all(p in psi_text[acc] for p in parts):
                r.update(check="quote_in_psi_record", detail=f"found in local {acc} record/table")
            else:
                tc = table_cell_check(q, psi_tables[acc])
                if tc and tc[0]:
                    r.update(check="table_cell_in_psi", detail=f"{acc}: {tc[1]}")
                else:
                    r.update(check="quote_not_in_source",
                             detail=f"not word-for-word in local {acc} record or tables" + (f" ({tc[1]})" if tc else ""))
            if "psi.nasa.gov/investigation/" in url:
                r["detail"] += "; cited URL format does not exist (real: psi.nasa.gov/physci/repo/data/investigations/" + acc + ")"
        elif "ntrs.nasa.gov" in url or "standards.nasa.gov" in url:
            r.update(check="needs_browser", detail="site refuses scripted requests")
        elif doi and not doi.lower().startswith("10.60555"):
            if doi not in doi_cache:
                code, body = curl("https://api.crossref.org/works/" + doi, "application/json")
                try:
                    m = json.loads(body)["message"]
                    doi_cache[doi] = (m.get("title") or [""])[0], (m.get("container-title") or [""])[0], \
                        (m.get("issued", {}).get("date-parts") or [[None]])[0][0]
                except Exception:  # noqa: BLE001
                    doi_cache[doi] = None
                time.sleep(0.4)
            meta = doi_cache[doi]
            if meta is None:
                r.update(check="doi_not_found", detail="Crossref does not know this DOI")
            else:
                sim = difflib.SequenceMatcher(None, norm(meta[0]), norm(it.get("source_title"))).ratio()
                r.update(check="doi_exists", detail=f"Crossref title: {meta[0]!r} ({meta[1]}, {meta[2]}); title similarity {sim:.2f}",
                         title_similarity=round(sim, 2))
        elif url.startswith("http"):
            if url not in page_cache:
                code, body = curl(url, "text/html")
                page_cache[url] = (code, page_text(body) if code.startswith("2") else "")
                time.sleep(0.4)
            code, txt = page_cache[url]
            if not txt:
                r.update(check="needs_browser", detail=f"HTTP {code}")
            else:
                parts = quote_parts(q)
                found = [p in txt for p in parts]
                r.update(check="quote_on_page" if parts and all(found) else "quote_not_in_source",
                         detail=f"HTTP {code}; parts found {sum(found)}/{len(parts)}")
        results.append(r)
        print(f"{r['id']:7} {r['check']:20} {r['detail'][:150]}")
    json.dump(results, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    tally = {}
    for r in results:
        tally[r["check"]] = tally.get(r["check"], 0) + 1
    print("\nsummary:", tally)


if __name__ == "__main__":
    main()
