"""What each fire-safety pillar's tests cover in NASA's tables, and what is not in them (item 8).

Reads only the JSON the build has just written (tests.json, habitats.json, outcomes.json,
investigations.json, other_tables.json) and writes gaps.json next to them. Every statement is
worked out here by code from those files, carries the test rows it rests on (test_ids) and the
investigations, and is re-checked by validate_data.py. The pillar of an investigation is the one
the challenge page states (Investigation.pillar); investigations without one are in no pillar.

Wording rules (CLAUDE.md): "not in the tables", never "never tested"; inverse-flame rows
(burner_oxidizer) are never counted as cabin air; duplicate rows are counted once.

Usage:  python -I gaps_analysis.py <web/public/data>
"""
import json
import os
import sys

PSI_PER_ATM = 14.696
PILLARS = ("prevention", "detection", "suppression")


def pct(x):
    return f"{x * 100:.1f}".rstrip("0").rstrip(".")


def psi(atm):
    return f"{atm * PSI_PER_ATM:.2f}"


def names(acrs):
    acrs = list(dict.fromkeys(acrs))
    return acrs[0] if len(acrs) == 1 else ", ".join(acrs[:-1]) + " and " + acrs[-1]


def stmt(text, tests, invs):
    return {"text": text, "test_ids": [t["id"] for t in tests], "investigations": sorted(set(invs), key=lambda a: int(a.split("-")[1]))}


def in_box(t, h):
    return (t["o2_basis"] == "ambient" and t["o2_fraction"] is not None and t["pressure_atm"] is not None
            and h["o2_fraction"][0] <= t["o2_fraction"] <= h["o2_fraction"][1]
            and h["pressure_atm"][0] <= t["pressure_atm"] <= h["pressure_atm"][1])


def place_air(h):
    o = h["o2_fraction"]
    p = h["pressure_psi"]
    o_txt = f"{pct(o[0])} %" if o[0] == o[1] else f"{pct(o[0])}-{pct(o[1])} %"
    p_txt = f"{p[0]:g} psi" if p[0] == p[1] else f"{p[0]:g}-{p[1]:g} psi"
    return f"{o_txt} oxygen, {p_txt}"


def air_statements(tests, habitats, what, invs):
    """For each place: the pillar's tests inside its air (tested), or none (not in the tables)."""
    tested, missing = [], []
    for h in habitats:
        ins = [t for t in tests if in_box(t, h)]
        if ins:
            tested.append(stmt(f"{len(ins)} {what} tests sit in {h['name']} air ({place_air(h)}).", ins,
                               {t["investigation"] for t in ins}))
        else:
            missing.append(stmt(f"No {what} test in the tables sits in {h['name']} air ({place_air(h)}).", [], invs))
    return tested, missing


def prevention(tests, habitats, acr):
    invs = sorted({t["investigation"] for t in tests}, key=lambda a: int(a.split("-")[1]))
    who = names(acr[i] for i in invs)
    tested, missing = [], []
    tested.append(stmt(f"{len(tests)} solid-material tests from {who}.", tests, invs))
    with_o2 = [t for t in tests if t["o2_fraction"] is not None]
    rng = [t for t in tests if t["o2_fraction"] is None and t["o2_fraction_max"] is not None]
    lo, hi = min(t["o2_fraction"] for t in with_o2), max(t["o2_fraction"] for t in with_o2)
    tested.append(stmt(f"{len(with_o2)} of them record a cabin oxygen value, from {pct(lo)} % to {pct(hi)} %"
                       f" ({len(rng)} more give only a range).", with_o2 + rng, {t["investigation"] for t in with_o2 + rng}))
    air = [t for t in tests if t["airflow_cm_s"] is not None and t["airflow_cm_s"] >= 0]
    if air:
        tested.append(stmt(f"{len(air)} record an airflow, from {min(t['airflow_cm_s'] for t in air):g} to "
                           f"{max(t['airflow_cm_s'] for t in air):g} cm/s.", air, {t["investigation"] for t in air}))
    shaped = [t for t in tests if t.get("fuel_shape")]
    if shaped:
        counts = {}
        for t in shaped:
            counts[t["fuel_shape"]] = counts.get(t["fuel_shape"], 0) + 1
        parts = ", ".join(f"{k} {v}" for k, v in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))
        tested.append(stmt(f"{len(shaped)} state the sample's shape: {parts}.", shaped, {t["investigation"] for t in shaped}))
    t_in, t_out = air_statements(tests, habitats, "solid-material", invs)
    tested += t_in

    top = [t for t in with_o2 if t["o2_fraction"] == hi]
    sensed = [t for t in tests if t.get("o2_sensor_max") is not None]
    s_hi = max((t["o2_sensor_max"] for t in sensed), default=None)
    extra = ""
    if s_hi is not None:
        s_top = [t for t in sensed if t["o2_sensor_max"] == s_hi]
        extra = f"; {names(acr[t['investigation']] for t in s_top)}'s sensor log reads up to {pct(s_hi)} %"
        top += s_top
    missing.append(stmt(f"No solid-material test in the tables reaches 30 % oxygen (highest: "
                        f"{names(acr[t['investigation']] for t in top if t['o2_fraction'] == hi)} {pct(hi)} %{extra}).",
                        top, {t["investigation"] for t in top}))
    with_p = [t for t in tests if t["pressure_atm"] is not None]
    p_rng = [t for t in tests if t["pressure_atm"] is None and t.get("pressure_atm_min") is not None]
    lo_p, hi_p = min(t["pressure_atm"] for t in with_p), max(t["pressure_atm"] for t in with_p)
    p_txt = f"all at {psi(lo_p)} psi" if lo_p == hi_p else f"from {psi(lo_p)} to {psi(hi_p)} psi"
    floor = min([t["pressure_atm"] for t in with_p] + [t["pressure_atm_min"] for t in p_rng])
    low = [t for t in with_p if t["pressure_atm"] == floor] + [t for t in p_rng if t["pressure_atm_min"] == floor]
    missing.append(stmt(f"Only {len(with_p)} of {len(tests)} solid-material tests have a single pressure (from NASA's "
                        f"reports, {p_txt}); {len(p_rng)} more have only a range, and the other "
                        f"{len(tests) - len(with_p) - len(p_rng)} none.", with_p + p_rng, {t["investigation"] for t in with_p + p_rng}))
    missing.append(stmt(f"No solid-material test with a pressure in the tables or NASA's reports ran below {psi(floor)} psi "
                        f"(lowest: the low end of {names(acr[t['investigation']] for t in low)}'s "
                        f"{'sensor-log' if any('pressure_range_from_sensor_log' in t['flags'] for t in low) else 'report'} range).", low,
                        {t["investigation"] for t in low}))
    missing += t_out
    return tested, missing


def suppression(tests, habitats, acr, outcomes):
    invs = sorted({t["investigation"] for t in tests})
    who = names(acr[i] for i in invs)
    tested, missing = [], []
    amb = [t for t in tests if t["o2_basis"] == "ambient"]
    fuels = sorted({t["fuel"] for t in amb if t["fuel"]})
    with_o2 = [t for t in amb if t["o2_fraction"] is not None]
    with_p = [t for t in amb if t["pressure_atm"] is not None]
    tested.append(stmt(f"{len(amb)} {names(sorted({t['fuel_class'] for t in amb}))} tests from {who} ({', '.join(fuels)}), "
                       f"oxygen {pct(min(t['o2_fraction'] for t in with_o2))} % to {pct(max(t['o2_fraction'] for t in with_o2))} %, "
                       f"pressure {psi(min(t['pressure_atm'] for t in with_p))} to {psi(max(t['pressure_atm'] for t in with_p))} psi.",
                       amb, invs))
    co2 = [t for t in amb if t["co2_fraction"]]
    he = [t for t in amb if t["he_fraction"]]
    if co2:
        tested.append(stmt(f"{len(co2)} ran with carbon dioxide in the air (up to {pct(max(t['co2_fraction'] for t in co2))} %), "
                           f"{len(he)} with helium (up to {pct(max(t['he_fraction'] for t in he))} %).", co2 + [t for t in he if t not in co2],
                           {t["investigation"] for t in co2 + he}))
    by_id = {t["id"]: t for t in tests}
    for st in outcomes["studies"]:
        if st["investigation"] not in invs:
            continue
        if st.get("groups") and st.get("group_by", "").startswith("cabin oxygen"):
            g = [x for x in st["groups"] if x["recorded"]]
            first, last = g[0], g[-1]
            ids = first["test_ids"] + last["test_ids"]
            tested.append(stmt(f"{st['acronym']} flames went out in {first['went_out']} of {first['recorded']} tests at "
                               f"{first['label']} oxygen and in {last['went_out']} of {last['recorded']} at {last['label']} "
                               f"(outcomes.json verdict: {st['verdict']}).", [by_id[x] for x in ids], [st["investigation"]]))
        elif st.get("matched_groups"):
            ids = [x for m in st["matched_groups"] for gr in m["groups"] for x in gr["test_ids"]]
            ok = sum(m["verdict"] == "clear" for m in st["matched_groups"])
            tested.append(stmt(f"The oxygen trend is clear in {ok} of {len(st['matched_groups'])} matched groups "
                               f"({'; '.join(m['group'] for m in st['matched_groups'])}).",
                               [by_id[x] for x in dict.fromkeys(ids)], [st["investigation"]]))
        elif st.get("groups_matched_oxygen"):
            g = st["groups_matched_oxygen"]
            ids = [x for gr in g for x in gr["test_ids"]]
            parts = ", ".join(f"{gr['went_out']} of {gr['recorded']} with {'no gas added' if gr['label'] == 'none' else gr['label']}"
                              for gr in g)
            tested.append(stmt(f"At {st['matched_oxygen_band']} oxygen, flames went out in {parts} "
                               f"(outcomes.json: counted, not tested for a trend).", [by_id[x] for x in ids], [st["investigation"]]))
    t_in, t_out = air_statements(amb, habitats, names(sorted({t["fuel_class"] for t in amb})), invs)
    tested += t_in
    classes = {t["fuel_class"] for t in tests}
    other = [c for c in ("solid", "gas", "droplet") if c not in classes]
    if other:
        missing.append(stmt(f"The suppression pillar's tests are all {names(sorted(classes))} flames: no {' or '.join(other)} "
                            f"fuel in its tables.", [], invs))
    missing += t_out
    return tested, missing


def detection(invs_all, tests, other_tables, acr):
    invs = [i["accession"] for i in invs_all]
    tested, missing = [], []
    smoke = [o for o in other_tables if o["investigation"] in invs]
    if smoke:
        parts = ", ".join(f"{o['acronym']} {len(o['rows'])} rows" for o in smoke)
        tested.append(stmt(f"Smoke tests from {names(o['acronym'] for o in smoke)} are in NASA's tables as per-test smoke "
                           f"tables ({parts}; other_tables.json), not as burns.", [], [o["investigation"] for o in smoke]))
    if not tests:
        missing.append(stmt(f"No detection-pillar investigation ({names(acr[i] for i in invs)}) has a one-row-per-burn table, "
                            f"so no test row in the tables records cabin oxygen, pressure or an ending for a detection test.",
                            [], invs))
    return tested, missing


def main():
    out = os.path.abspath(sys.argv[1])
    load = lambda n: json.load(open(os.path.join(out, n), encoding="utf-8"))
    T, H, OUT, INV, OT = load("tests.json"), load("habitats.json"), load("outcomes.json"), load("investigations.json"), load("other_tables.json")
    T = [t for t in T if not any(f.startswith("duplicate_row") for f in t["flags"])]   # each test once
    acr = {i["accession"]: i["acronym"] or i["accession"] for i in INV}
    gravity = sorted({t["gravity_g"] for t in T})
    pillars = []
    for p in PILLARS:
        invs = [i for i in INV if i["pillar"] == p]
        mine = [t for t in T if t["investigation"] in {i["accession"] for i in invs}]
        if p == "prevention":
            tested, missing = prevention(mine, H, acr)
        elif p == "suppression":
            tested, missing = suppression(mine, H, acr, OUT)
        else:
            tested, missing = detection(invs, mine, OT, acr)
        if mine and gravity == [0.0]:
            missing.append(stmt(f"Every {p} test in the tables ran in microgravity: none at Moon (0.165 g) or Mars gravity.",
                                [], {t["investigation"] for t in mine}))
        pillars.append({"pillar": p, "tested": tested, "not_in_tables": missing})
    gaps = {
        "generated_by": "scripts/gaps_analysis.py",
        "caveats": [
            "NASA's tables are summaries; the investigations' reports may hold more. Say 'not in the tables', never 'never tested'.",
            "NASA burned materials at other pressures and oxygen levels in Saffire-IV to VI, but those results are not in PSI.",
            "Only investigations whose pillar the challenge page states are counted; the gas-flame investigations (ACME, SPICE) "
            "and CFI have no stated pillar, so they are in no column here.",
            "Inverse-flame rows (oxygen fed from the burner) are not cabin air and are left out; duplicate rows count once.",
            "Every test in PSI ran in microgravity; nothing here says how a fire behaves on the Moon or Mars.",
        ],
        "pillars": pillars,
    }
    with open(os.path.join(out, "gaps.json"), "w", encoding="utf-8") as f:
        json.dump(gaps, f, ensure_ascii=False, indent=1)
    print(f"wrote gaps.json: {sum(len(p['tested']) + len(p['not_in_tables']) for p in pillars)} statements")


if __name__ == "__main__":
    main()
