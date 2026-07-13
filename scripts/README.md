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
