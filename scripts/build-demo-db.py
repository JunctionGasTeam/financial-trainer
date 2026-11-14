"""Build assets/data/customer-transactions.db from the full transaction CSV.

The full CSV (docs/tx_junction_transactions.csv, ~363 MB) is too large to ship,
so this streams it once and keeps only the demo customers listed below.

Usage: python3 scripts/build-demo-db.py [path/to/tx_junction_transactions.csv]
"""
import csv
import os
import sqlite3
import sys

DEMO_CUSTOMERS = [
    'CUST00001',  # original default customer
    'CUST02979',  # Aino, 22, Espoo: stretched, main demo (SPEC.md section 2)
    'CUST04767',  # Mikko, 36, Espoo: well covered, mortgage
    'CUST00164',  # Sara, 23, Helsinki: restaurant spike, large one-off
]

COLUMNS = [
    'customer_id', 'bank_account_id', 'tx_date', 'tx_timestamp', 'category',
    'tx_amount_eur', 'balance_after_eur', 'transaction_type', 'merchant_id', 'mcc_code',
]

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'docs', 'tx_junction_transactions.csv')
target = os.path.join(root, 'assets', 'data', 'customer-transactions.db')

wanted = set(DEMO_CUSTOMERS)
rows = []
with open(source, encoding='utf-8-sig', newline='') as handle:
    for row in csv.DictReader(handle):
        if row['customer_id'] not in wanted:
            continue
        rows.append((
            row['customer_id'], row['bank_account_id'], row['tx_date'], row['tx_timestamp'], row['category'],
            float(row['tx_amount_eur']), float(row['balance_after_eur']), row['transaction_type'],
            row['merchant_id'] or None, row['mcc_code'] or None,
        ))

missing = wanted - {row[0] for row in rows}
if missing:
    sys.exit(f'Customers not found in {source}: {sorted(missing)}')

tmp = target + '.tmp'
if os.path.exists(tmp):
    os.remove(tmp)
db = sqlite3.connect(tmp)
db.execute('CREATE TABLE transactions (%s)' % ', '.join(
    f'"{name}" {"REAL" if name in ("tx_amount_eur", "balance_after_eur") else "TEXT"}' for name in COLUMNS))
# Insert in file order so rowid follows the CSV's chronological order.
db.executemany(f'INSERT INTO transactions VALUES ({", ".join("?" * len(COLUMNS))})', rows)
db.execute('CREATE INDEX idx_transactions_customer_date ON transactions(customer_id, tx_date)')
db.commit()
db.execute('VACUUM')
db.close()
os.replace(tmp, target)

print(f'Wrote {len(rows)} transactions for {len(wanted)} customers to {target}')
