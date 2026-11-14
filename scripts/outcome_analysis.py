"""'Will it go out?': how NASA's FLEX and ACME CFI-G tests ended, against the conditions they ran in.

Descriptive counts only: no model, no fitted curve, nothing extrapolated. Every group lists the
test ids it counts, so each number can be traced to a source row. Reads tests.json (built by
build_web_data.py) and writes outcomes.json next to it.

A pattern is called "clear" only when, across groups with at least MIN_N tests, the share that
went out moves in one direction (rank correlation |rho| >= 0.8) AND the highest and lowest shares
differ by at least 40 percentage points. Anything else is reported as "no clear pattern".
Because FLEX varied several things at once (fuel, added gas, pressure), the oxygen trend is also
checked inside matched groups (same fuel, no gas added, same pressure band).

Usage:  python -I outcome_analysis.py <web/public/data>
"""
import json
import os
import sys

PSI_PER_ATM = 14.696
MIN_N = 5
RHO_MIN = 0.8
SPREAD_MIN = 0.40


def rank(vals):
    order = sorted(range(len(vals)), key=lambda i: vals[i])
    r = [0.0] * len(vals)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return None
    rx, ry = rank(x), rank(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return None if den == 0 else num / den


def agent(t):
    c, h = (t["co2_fraction"] or 0) > 0, (t["he_fraction"] or 0) > 0
    return "CO2 and helium" if c and h else "CO2" if c else "helium" if h else "none"


def o2_bins(tests, width=0.02):
    groups = {}
    for t in tests:
        if t["o2_fraction"] is None:
            continue
        lo = round(int(round(t["o2_fraction"] * 1000) // (width * 1000)) * width, 3)
        groups.setdefault(lo, []).append(t)
    return [(f"{lo * 100:.0f}-{(lo + width) * 100:.0f} %", lo + width / 2, g) for lo, g in sorted(groups.items())]


def summarise(groups, went_out):
    """groups: [(label, x, tests)]. Returns group rows and the verdict."""
    rows = []
    for label, x, g in groups:
        out = [t for t in g if t["outcome"] in went_out]
        recorded = [t for t in g if t["outcome"]]
        rows.append({
            "label": label, "x": round(x, 4), "n": len(g), "recorded": len(recorded), "went_out": len(out),
            "share_went_out": None if not recorded else round(len(out) / len(recorded), 3),
            "endings": {o: sum(1 for t in g if t["outcome"] == o) for o in sorted({t["outcome"] or "not recorded" for t in g})
                        if o != "not recorded"} | ({"not recorded": sum(1 for t in g if not t["outcome"])}
                                                    if any(not t["outcome"] for t in g) else {}),
            "test_ids": [t["id"] for t in g],
        })
    usable = [r for r in rows if r["recorded"] >= MIN_N]
    rho = spearman([r["x"] for r in usable], [r["share_went_out"] for r in usable])
    shares = [r["share_went_out"] for r in usable]
    spread = (max(shares) - min(shares)) if shares else 0
    clear = rho is not None and abs(rho) >= RHO_MIN and spread >= SPREAD_MIN
    return rows, {
        "verdict": "clear" if clear else "no_clear_pattern",
        "direction": None if not clear else ("fewer went out as the value rose" if rho < 0 else "more went out as the value rose"),
        "rank_correlation": None if rho is None else round(rho, 2),
        "spread_points": round(spread * 100, 1),
        "groups_used": len(usable),
        "rule": f"clear if |rank correlation| >= {RHO_MIN} and spread >= {SPREAD_MIN * 100:.0f} points, "
                f"over groups with at least {MIN_N} recorded endings",
    }


def pct(v):
    return f"{v * 100:.0f} %"


def main():
    d = os.path.abspath(sys.argv[1])
    T = json.load(open(os.path.join(d, "tests.json"), encoding="utf-8"))
    flex = [t for t in T if t["investigation"] == "PSI-69"]
    cfig = [t for t in T if t["investigation"] == "PSI-159" and t["o2_basis"] == "ambient"]
    FLEX_OUT = {"extinction"}
    CFIG_OUT = {"self-extinguished"}
    studies = []

    # 1. FLEX: oxygen, all tests
    rows, v = summarise(o2_bins(flex), FLEX_OUT)
    lo, hi = rows[0], rows[-1]
    studies.append({
        "id": "flex_oxygen", "investigation": "PSI-69", "acronym": "FLEX", "fuel_class": "droplet",
        "question": "Did droplet flames go out less often at higher oxygen?",
        "went_out_means": "NASA's 'Test end' column says 'Extinction'",
        "group_by": "cabin oxygen (2-point bands)", "groups": rows, **v,
        "finding": (f"In FLEX, {lo['went_out']} of {lo['recorded']} droplet tests at {lo['label']} oxygen ended in extinction; "
                    f"at {hi['label']} it was {hi['went_out']} of {hi['recorded']}."),
    })

    # 2. FLEX: oxygen inside matched groups (confound check)
    matched = []
    for fuel in sorted({t["fuel"] for t in flex}):
        g = [t for t in flex if t["fuel"] == fuel and agent(t) == "none"]
        r, vv = summarise(o2_bins(g), FLEX_OUT)
        matched.append({"group": f"{fuel}, no gas added", "groups": r, **vv})
    band = [t for t in flex if agent(t) == "none" and t["pressure_atm"] is not None and abs(t["pressure_atm"] * PSI_PER_ATM - 10.2) < 1.0]
    r, vv = summarise(o2_bins(band), FLEX_OUT)
    matched.append({"group": "no gas added, pressure 9.2 to 11.2 psi", "groups": r, **vv})
    studies.append({
        "id": "flex_oxygen_matched", "investigation": "PSI-69", "acronym": "FLEX", "fuel_class": "droplet",
        "question": "Does the oxygen trend hold when fuel, added gas and pressure are held the same?",
        "went_out_means": "NASA's 'Test end' column says 'Extinction'",
        "matched_groups": matched,
        "verdict": "clear" if all(m["verdict"] == "clear" for m in matched if m["groups_used"] >= 3) and
                   any(m["groups_used"] >= 3 for m in matched) else "no_clear_pattern",
        "finding": "; ".join(f"{m['group']}: {m['verdict'].replace('_', ' ')} "
                             f"(groups used {m['groups_used']}, rank correlation {m['rank_correlation']}, "
                             f"spread {m['spread_points']} points)" for m in matched) + ".",
    })

    # 3. FLEX: added gas, all oxygen levels and at matched oxygen
    agents = ["none", "CO2", "helium"]
    rows_all, _ = summarise([(a, i, [t for t in flex if agent(t) == a]) for i, a in enumerate(agents)], FLEX_OUT)
    band_o2 = [t for t in flex if t["o2_fraction"] is not None and 0.18 <= t["o2_fraction"] < 0.22]
    rows_band, _ = summarise([(a, i, [t for t in band_o2 if agent(t) == a]) for i, a in enumerate(agents)], FLEX_OUT)
    studies.append({
        "id": "flex_added_gas", "investigation": "PSI-69", "acronym": "FLEX", "fuel_class": "droplet",
        "question": "Did adding carbon dioxide or helium make droplet flames go out more often?",
        "went_out_means": "NASA's 'Test end' column says 'Extinction'",
        "groups": rows_all, "groups_matched_oxygen": rows_band, "matched_oxygen_band": "18-22 %",
        "verdict": "not_tested_for_a_trend",
        "finding": ("All oxygen levels: " + ", ".join(f"{r['label']} {r['went_out']} of {r['recorded']}" for r in rows_all)
                    + ". At 18-22 % oxygen only: " + ", ".join(f"{r['label']} {r['went_out']} of {r['recorded']}" for r in rows_band)
                    + ". The tests with no gas added include every test at 30 % oxygen or more, so the all-levels comparison mixes "
                      "oxygen with the added gas; the matched band is the fairer comparison."),
    })

    # 4. CFI-G: oxygen and pressure
    rows, v = summarise(o2_bins(cfig), CFIG_OUT)
    studies.append({
        "id": "cfig_oxygen", "investigation": "PSI-159", "acronym": "ACME CFI-G", "fuel_class": "gas",
        "question": "Did gas flames go out by themselves less often at higher oxygen?",
        "went_out_means": "NASA's table marks the test 'SE' (self-extinguished); 'FT' (flow terminated) means the fuel was "
                          "stopped, which is neither",
        "group_by": "cabin oxygen (2-point bands)", "groups": rows, **v,
        "finding": "Self-extinguished share by oxygen band: "
                   + ", ".join(f"{r['label']} {r['went_out']} of {r['recorded']}" for r in rows if r["recorded"]) + ".",
    })
    pgroups = {}
    for t in cfig:
        if t["pressure_atm"] is not None:
            pgroups.setdefault(round(t["pressure_atm"] * PSI_PER_ATM, 1), []).append(t)
    rows, v = summarise([(f"{p} psi", p, g) for p, g in sorted(pgroups.items())], CFIG_OUT)
    studies.append({
        "id": "cfig_pressure", "investigation": "PSI-159", "acronym": "ACME CFI-G", "fuel_class": "gas",
        "question": "Did gas flames go out by themselves more or less often at lower pressure?",
        "went_out_means": "NASA's table marks the test 'SE' (self-extinguished)",
        "group_by": "pressure", "groups": rows, **v,
        "finding": "Self-extinguished share by pressure: "
                   + ", ".join(f"{r['label']} {r['went_out']} of {r['recorded']}" for r in rows if r["recorded"]) + ".",
    })

    out = {
        "generated_by": "scripts/outcome_analysis.py",
        "method": "Descriptive counts of how NASA's tables record each test ending, grouped by the conditions the test ran in. "
                  "No model and no extrapolation. 'Clear' follows the rule stated in each study.",
        "caveats": [
            "These are associations in NASA's tables, not proof of cause: the experiments were designed for other questions.",
            "Shares are out of tests whose ending is recorded; tests with no recorded ending are listed but not counted.",
            "FLEX endings 'Disruption' and 'Completion' are counted as not going out; their exact meaning is NASA's, not ours.",
            "All tests ran in microgravity; nothing here says how a flame behaves on the Moon or Mars.",
        ],
        "studies": studies,
    }
    with open(os.path.join(d, "outcomes.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for s in studies:
        print(f"[{s['id']}] verdict={s['verdict']} rho={s.get('rank_correlation')} spread={s.get('spread_points')}")
        print("   ", s["finding"])


if __name__ == "__main__":
    main()
