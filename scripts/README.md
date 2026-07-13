# scripts/

## `security-regression.sql`

Re-runs the RLS / view-access regression suite. Wired to `bun run test:security`.
Must stay green after every migration.

## `import_programa.mjs` (M4)

One-shot importer for the cleaned Programa export.

```
node scripts/import_programa.mjs [path-to-json]
# default path: /mnt/user-uploads/gad_m4_import.json
```

Runs in a single transaction as the DB role provided by `PG*` env vars
(`service_role`). Before any write it calls `set_config('request.jwt.claims', ...)`
to impersonate an existing owner/super_admin profile, so
`app_private.current_money_visibility()` returns `'full'` and the
`enforce_money_write` trigger allows money writes. The import passes THROUGH
the guard — the trigger is never disabled.

All inserts use `ON CONFLICT DO NOTHING` with the file's deterministic uuid5
ids; a re-run is a no-op. When the source file has genuine duplicate
`item_id`s (e.g. two "SEAT CUSHION/FABRICS" rows in Living Room), the second
occurrence gets a stable derived id so no row is lost while idempotency holds.

At the end it prints a validation report (per-room counts, project-level
count, fee count, total client price) and rolls back if any figure drifts
from the expected values (181 items / 153 products / $700,637.79).

## `import_reconciliation.mjs` (M4-bis)

One-shot importer for the QuickBooks reconciliation extract. Rows land
UNCONFIRMED (`confirmed = false`) so nothing enters any total until Giana/Abe
validate each row in the **Réconciliation** tab of `/cashflow`.

```
node scripts/import_reconciliation.mjs [path-to-json]
# default path: /mnt/user-uploads/gad_payments_import.json
```

Same skeleton as `import_programa.mjs` (single transaction, jwt-claim
impersonation, deterministic ids, `ON CONFLICT DO NOTHING`). Validation
report before commit; rollback on any drift. Expected shape:

- 42 rows total
- 19 vendor / paid / confirmed → $132,974.67
- 19 client / due / unconfirmed across invoices 00304, 00308, 00309,
  00310, 00312, 00313, 00315 → $223,541.37
- 4 derived contract-balance rows (unconfirmed, no due date) → $95,698.18

