# Security regression tests

`scripts/security-regression.sql` re-runs the RLS / view access invariants
that our recent security fixes rely on. Run it after every database
migration:

```
bun run test:security
```

or directly:

```
psql -v ON_ERROR_STOP=1 -f scripts/security-regression.sql
```

It exits non-zero (and prints the failing check) if any of the following
regress:

1. Every `public.*_visible` view has `security_invoker = true` so RLS runs
   as the caller, not the view owner.
2. RLS is enabled on every sensitive `public` table.
3. `anon` has no `SELECT` on `public.user_roles` (when that table exists).
4. `authenticated` has `SELECT` on each money-masking `*_visible` view.
5. `public.has_role(uuid, app_role)` exists as `SECURITY DEFINER`
   (when `user_roles` exists).
6. No RLS-enabled `public` table is policy-less.

Add a new check by editing `scripts/security-regression.sql` and using
`RAISE EXCEPTION` on failure — that's the whole convention.
