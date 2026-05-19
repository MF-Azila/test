#!/usr/bin/env python3
"""Payment Breakdown Verifier — reads an XLSX payment report and checks charge amounts against config rules."""

import json
import sys
import os
from datetime import datetime
from collections import defaultdict

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl..."); import subprocess; subprocess.run([sys.executable, "-m", "pip", "install", "openpyxl", "-q"])
    import openpyxl


def load_config(path="config.json"):
    with open(path) as f:
        return json.load(f)


def load_xlsx(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h).strip() if h else "" for h in rows[0]]
    records = []
    for row in rows[1:]:
        if not any(row):
            continue
        records.append(dict(zip(headers, row)))
    return records


def resolve_rule(rule_def, actual_amount):
    """Return {JPI, FIS, EAUTO, SERVICE_TAX} with formula values resolved."""
    charges = {}
    for key in ("JPI", "FIS", "EAUTO", "SERVICE_TAX"):
        val = rule_def.get(key)
        if isinstance(val, str) and "TOTAL" in val:
            # e.g. "TOTAL - 22.97"
            offset = float(val.split("-")[1].strip())
            charges[key] = round(actual_amount - offset, 2)
        else:
            charges[key] = float(val) if val is not None else None
    return charges


def find_rule(config, txn_type, amount):
    rules = config.get("charge_rules", {})
    rule_def = rules.get(txn_type)
    if rule_def is None:
        return None
    if "tiers" in rule_def:
        for tier in rule_def["tiers"]:
            if tier["total_min"] <= amount <= tier["total_max"]:
                return resolve_rule(tier, amount)
        return None
    return resolve_rule(rule_def, amount)


def charges_sum(charges):
    return round(sum(v for v in charges.values() if v is not None), 2)


def run(xlsx_path, config_path="config.json", out_path="summary.json"):
    config = load_config(config_path)
    records = load_xlsx(xlsx_path)

    # Group records by vehicle
    by_vehicle = defaultdict(list)
    for rec in records:
        vehicle = (rec.get("Vehicle No") or "").strip()
        by_vehicle[vehicle].append(rec)

    # Derive module name from sorted unique transaction types per vehicle
    by_module = defaultdict(list)
    for vehicle, txns in by_vehicle.items():
        types_sorted = sorted(set((t.get("Transaction Type") or "").strip() for t in txns if t.get("Transaction Type")))
        module_name = " + ".join(types_sorted)
        by_module[module_name].append((vehicle, txns))

    stats = {"pass": 0, "fail": 0, "missing": 0, "unmapped": 0, "records": len(records), "modules": len(by_module)}
    modules_out = []

    for module_name in sorted(by_module):
        vehicle_list = by_module[module_name]
        txn_types = module_name.split(" + ")
        module_status = "PASS"
        rows = []

        for txn_type in txn_types:
            # Collect per-vehicle results for this keterangan
            vehicle_results = []
            for vehicle, txns in vehicle_list:
                txn = next((t for t in txns if (t.get("Transaction Type") or "").strip() == txn_type), None)
                if txn is None:
                    stats["missing"] += 1
                    continue
                raw = txn.get("Payment Amount") or 0
                amount = float(str(raw).replace(",", "")) if raw else 0.0
                charges = find_rule(config, txn_type, amount)
                if charges is None:
                    stats["unmapped"] += 1
                    vehicle_results.append({"vehicle": vehicle, "amount": amount, "status": "UNMAPPED", "charges": None})
                    continue
                expected_total = charges_sum(charges)
                ok = abs(expected_total - amount) < 0.02
                if ok:
                    stats["pass"] += 1
                else:
                    stats["fail"] += 1
                vehicle_results.append({
                    "vehicle": vehicle,
                    "amount": amount,
                    "expected_total": expected_total,
                    "charges": charges,
                    "status": "PASS" if ok else "FAIL"
                })

            if not vehicle_results:
                continue

            # Aggregate: use first resolved charges as representative expected values
            representative = next((r for r in vehicle_results if r["charges"] is not None), None)
            row_charges = representative["charges"] if representative else {}
            row_status = "PASS" if all(r["status"] == "PASS" for r in vehicle_results) else "FAIL"
            if row_status == "FAIL":
                module_status = "FAIL"

            charge_cols = {}
            for key in ("JPI", "FIS", "EAUTO", "SERVICE_TAX"):
                exp = row_charges.get(key) if row_charges else None
                # For PASS rows, actual == expected; for FAIL rows show actual amount
                act = exp if row_status == "PASS" else None
                charge_cols[key] = {"expected": exp, "actual": act}

            rows.append({
                "keterangan": txn_type,
                "charges": charge_cols,
                "status": row_status,
                "vehicle_count": len(vehicle_results),
                "fails": [r for r in vehicle_results if r["status"] != "PASS"]
            })

        modules_out.append({
            "name": module_name,
            "record_count": len(vehicle_list),
            "status": module_status,
            "rows": rows
        })

    summary = {
        "run_id": datetime.now().strftime("%Y-%m-%dT%H-%M-%S"),
        "started": datetime.now().strftime("%d/%m/%Y, %H:%M:%S"),
        "source_file": os.path.basename(xlsx_path),
        "stats": stats,
        "modules": modules_out
    }

    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Done. PASS={stats['pass']} FAIL={stats['fail']} MISSING={stats['missing']} UNMAPPED={stats['unmapped']}")
    print(f"Report written to: {out_path}")
    return summary


if __name__ == "__main__":
    xlsx = sys.argv[1] if len(sys.argv) > 1 else "Payment_Report.xlsx"
    cfg = sys.argv[2] if len(sys.argv) > 2 else "config.json"
    out = sys.argv[3] if len(sys.argv) > 3 else "summary.json"
    run(xlsx, cfg, out)
