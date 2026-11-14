# What NASA's raw PSI files add (workstream A, automated scan, 2026-11-15)

Status: **work in progress** (written as the scan runs). Nothing here is applied to the data. Candidate
values are in `data_sourced/raw_candidates.json`, marked "candidate, not verified".

## What was downloaded

- `scripts/fetch_psi_raw.py` plans every file in each record's `added` list except videos (1,629) and
  ".zip" files in the "Raw Data" folder (5,109 image archives, about 5.9 TB). Plan: **9,502 files,
  9.32 GB**, plus 114 files already in `data_extra/` from `fetch_psi_docs.py`.
- One file at a time, two retries per file, `--max-time` 60 s (link) and 900 s (file).
- The first run (in plan order) managed about 3.3 s per file, which would mean about 9 hours. It was
  stopped after 71 files and restarted with the same files in priority order: the investigations whose
  table rows lack pressure or oxygen first (BASS-II, BASS, Saffire, SPICE, FLEX), then documents,
  then the bulk per-test files of ACME and CFI. Files from the first run are counted as "skipped,
  already downloaded" in `data_extra/raw_manifest.json`.
- Final counts: (to be filled in when the download finishes)

## Findings

### F1. SPICE: ISS cabin oxygen range stated, no pressure (candidate)

- **Rows:** all 469 SPICE rows (`PSI-107_Experimental table_Spice.csv`), which record neither
  oxygen nor pressure.
- **File:** `PSI-107_Reports_SPICE_FinalReport.pdf`, p. 19 (by pdftotext's page count).
- **NASA's words:** "after each two such burns the MSG contents were flushed with ISS cabin air. The
  oxygen mole fraction of this cabin air is maintained within 19 - 24%." (the dash is unreadable in the
  text layer.)
- **What it is:** the range NASA keeps ISS air within, not a reading for any burn. It could be shown
  as context ("ISS cabin air, kept at 19-24 % O2"), never as a test's `o2_fraction`.
- **Not a pressure:** the Table 1 footnote, "Parameters ua, uf, and Re assume conditions of 298 K, 101
  kPa and 21+-1% O2", is an assumption for a calculation (as in BASS-II chapter 1).
- The SPICE requirements document says "Pressure: Shuttle ambient pressure", a requirement, not a
  measurement.
