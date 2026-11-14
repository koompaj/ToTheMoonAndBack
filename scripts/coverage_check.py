"""Quick feasibility check: how much of the per-test data has oxygen + pressure,
and how much of it falls inside the Moon Base envelope (O2 >= 30 %, pressure <= 10.2 psi).

Usage:  python -I coverage_check.py <data_dir>
"""
import csv
import io
import os
import re
import sys

ATM_10_2_PSI = 10.2 / 14.696  # 0.694 atm


def load(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    return rows[0], rows[1:], raw


def num(s):
    m = re.search(r"-?\d+(?:\.\d+)?", s or "")
    return float(m.group()) if m else None


# (label, file, o2 column index, o2 scale to fraction, pressure column index, pressure->atm factor, o2 meaning)
SPEC = [
    ("PSI-10 Flame Design normal", "PSI-10/PSI-10_Experimental table_Flame Design_Normal Flame.csv", 8, 1, 10, 1, "ambient"),
    ("PSI-10 Flame Design inverse", "PSI-10/PSI-10_Experimental table_Flame Design_Inverse Flame.csv", 3, 1, 9, 1, "burner oxidizer"),
    ("PSI-159 CFI-G normal", "PSI-159/PSI-159_Experimental table_CFI-G_Normal Flames.csv", 5, 1, 7, 1 / 1.01325, "ambient"),
    ("PSI-159 CFI-G inverse", "PSI-159/PSI-159_Experimental table_CFI-G_Inverse Flames.csv", 7, 1, 6, 1 / 1.01325, "burner oxidizer"),
    ("PSI-69 FLEX", "PSI-69/PSI-69_Experimental table_FLEX.csv", 6, 1, 5, 1 / 760, "ambient"),
    ("PSI-39 CFI", "PSI-39/PSI-39_Experimental table_CFI.csv", 5, 1, 4, 1, "ambient"),
    ("PSI-25 BASS-II", "PSI-25/PSI-25_Experimental table_BASS-II.csv", 11, 0.01, None, None, "ambient"),
]


def main():
    tab = os.path.join(os.path.abspath(sys.argv[1]), "tables")
    print(f"envelope: O2 >= 0.30 and pressure <= {ATM_10_2_PSI:.3f} atm (10.2 psi)\n")
    tot = {"rows": 0, "amb_o2_ge30": 0, "amb_both": 0}
    for label, rel, oi, osc, pi, psc, meaning in SPEC:
        header, body, _ = load(os.path.join(tab, rel))
        o2, pr, both, zero_p = [], [], 0, 0
        o2_hi = p_lo = 0
        for r in body:
            # Strict: cells like "RAMP" or "LOW O2" are not a single oxygen value.
            cell = r[oi].strip() if oi < len(r) else ""
            o = float(cell) if re.fullmatch(r"-?\d*\.?\d+", cell) else None
            o = o * osc if o is not None else None
            p = None
            if pi is not None and pi < len(r):
                p = num(r[pi])
                if p is not None:
                    p *= psc
                    if p == 0:
                        zero_p += 1
                        p = None
            if o is not None:
                o2.append(o)
                o2_hi += o >= 0.30
            if p is not None:
                pr.append(p)
                p_lo += p <= ATM_10_2_PSI
            if o is not None and p is not None and o >= 0.30 and p <= ATM_10_2_PSI:
                both += 1
        tot["rows"] += len(body)
        if meaning == "ambient":
            tot["amb_o2_ge30"] += o2_hi
            tot["amb_both"] += both
        print(f"{label}  [{len(body)} rows; O2 = {meaning}]")
        print(f"   O2 col {header[oi].strip()!r}: n={len(o2)} range {min(o2):.3f}-{max(o2):.3f}; >=0.30: {o2_hi}")
        if pr:
            print(f"   P  col {header[pi].strip()!r}: n={len(pr)} range {min(pr):.3f}-{max(pr):.3f} atm; <=0.694: {p_lo}; zero/blank treated as missing: {zero_p}")
        else:
            print("   P : no pressure column")
        print(f"   inside envelope (both): {both}\n")
    print(f"TOTAL rows with per-test O2: {tot['rows']}")
    print(f"ambient-O2 tests at >=30% O2: {tot['amb_o2_ge30']}; of those also <=10.2 psi: {tot['amb_both']}\n")

    # Raw header bytes where a character looked lost.
    for rel in ("PSI-69/PSI-69_Experimental table_FLEX.csv", "PSI-99/PSI-99_Experimental table_SAFFIRE-2.csv"):
        _, _, raw = load(os.path.join(tab, rel))
        print(rel.split("/")[0], "header bytes:", raw.split(b"\n", 1)[0][:330])
    # Odd cells flagged during inspection.
    h, b, _ = load(os.path.join(tab, "PSI-20/PSI-20_Experimental table_ACME BRE.csv"))
    print("\nBRE O2 cells:", [r[5] for r in b])
    h, b, _ = load(os.path.join(tab, "PSI-69/PSI-69_Experimental table_FLEX.csv"))
    print("FLEX rows with pressure 0:", [(r[0], r[1], r[5], r[14]) for r in b if num(r[5]) == 0])


if __name__ == "__main__":
    main()
