#!/usr/bin/env node
// M4-bis: one-shot importer for reconciled payments (QuickBooks report).
//
// Same shape as scripts/import_programa.mjs:
//   - single transaction
//   - impersonates a full-visibility owner via set_config('request.jwt.claims',...)
//     so enforce_money_write allows the amount writes (passes THROUGH the guard)
//   - deterministic UUIDs from the file's payment_id + ON CONFLICT DO NOTHING → no-op on re-run
//   - validation report BEFORE commit; rollback on any drift
//
// Usage:  node scripts/import_reconciliation.mjs [path-to-json]
//   defaults to /mnt/user-uploads/gad_payments_import.json

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const SRC = process.argv[2] ?? "/mnt/user-uploads/gad_payments_import.json";

const EXPECTED_TOTAL = 42;
const EXPECTED_VENDOR_TOTAL = 132974.67;
const EXPECTED_CLIENT_INVOICED_TOTAL = 223541.37;
const EXPECTED_DERIVED_TOTAL = 95698.18;
const EXPECTED_INVOICES = new Set(["00304", "00308", "00309", "00310", "00312", "00313", "00315"]);
const MONEY_TOL = 0.5;

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const rawPath = path.resolve(SRC);
  if (!fs.existsSync(rawPath)) {
    console.error(`Source file not found: ${rawPath}`);
    process.exit(2);
  }
  const rows = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  if (!Array.isArray(rows)) throw new Error("Expected a top-level JSON array");
  console.log(`Loaded ${rows.length} rows from ${rawPath}`);

  const client = new pg.Client({ ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("BEGIN");

    // Impersonate a full-visibility owner so enforce_money_write allows writes.
    const own = await client.query(`
      SELECT p.id
        FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
       WHERE r.money_visibility = 'full'
       ORDER BY (r.key = 'owner') DESC, (r.key = 'super_admin') DESC, p.created_at ASC
       LIMIT 1
    `);
    if (own.rowCount !== 1) {
      throw new Error("No profile with full money-visibility — cannot pass money-write trigger");
    }
    const ownerId = own.rows[0].id;
    await client.query(
      `SELECT set_config('request.jwt.claims',
                         json_build_object('sub', $1::text, 'role', 'authenticated')::text,
                         true)`,
      [ownerId],
    );

    // Vendor lookup (create if missing).
    const rVendors = await client.query("SELECT id, name FROM public.vendors");
    const vendorByLc = new Map(rVendors.rows.map((r) => [r.name.toLowerCase(), r.id]));

    async function resolveVendor(name) {
      if (name == null) return null;
      const lc = name.toLowerCase();
      if (vendorByLc.has(lc)) return vendorByLc.get(lc);
      const ins = await client.query(
        `INSERT INTO public.vendors (name, account_status)
         VALUES ($1, 'purchased_from')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [name],
      );
      let id;
      if (ins.rowCount === 1) {
        id = ins.rows[0].id;
      } else {
        const q = await client.query("SELECT id FROM public.vendors WHERE lower(name) = $1", [lc]);
        id = q.rows[0].id;
      }
      vendorByLc.set(lc, id);
      console.log(`  + created vendor: ${name}`);
      return id;
    }

    // Insert each row.
    let inserted = 0;
    for (const r of rows) {
      const vendorId = await resolveVendor(r.vendor_name);
      const res = await client.query(
        `INSERT INTO public.payments
           (id, item_id, vendor_id, invoice_num, description,
            amount, direction, state, confirmed, due_date, phase_id, source, dismissed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL,$11,false)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.payment_id,
          r.item_id ?? null,
          vendorId,
          r.invoice_num ?? null,
          r.description ?? null,
          r.amount,
          r.direction,
          r.state,
          Boolean(r.confirmed),
          r.due_date ?? null,
          r.source,
        ],
      );
      inserted += res.rowCount;
    }

    // Validate against the DB.
    const q = await client.query(
      `SELECT direction, state, confirmed, source, invoice_num, amount, due_date
         FROM public.payments
        WHERE source IN ('reconciliation_import','reconciliation_derived')`,
    );
    let total = 0;
    let vendorConfirmed = 0;
    let clientInvoiced = 0;
    let derived = 0;
    const seenInvoices = new Set();
    for (const row of q.rows) {
      total++;
      const amt = Number(row.amount ?? 0);
      if (row.direction === "gad_to_vendor" && row.state === "paid" && row.confirmed) {
        vendorConfirmed += amt;
      } else if (
        row.direction === "client_to_gad" &&
        row.state === "due" &&
        !row.confirmed &&
        row.source === "reconciliation_import"
      ) {
        clientInvoiced += amt;
        if (row.invoice_num) seenInvoices.add(row.invoice_num);
      } else if (row.source === "reconciliation_derived") {
        derived += amt;
        if (row.due_date != null) {
          throw new Error(`derived row unexpectedly has a due_date: ${row.due_date}`);
        }
      }
    }

    console.log("\n=== M4-bis reconciliation import report ===");
    console.log(`inserted this run: ${inserted}`);
    console.log(`total reconciliation rows in DB: ${total} (expected ${EXPECTED_TOTAL})`);
    console.log(`vendor / paid / confirmed total: $${round2(vendorConfirmed)} (expected $${EXPECTED_VENDOR_TOTAL})`);
    console.log(`client / due / unconfirmed total: $${round2(clientInvoiced)} (expected $${EXPECTED_CLIENT_INVOICED_TOTAL})`);
    console.log(`derived unconfirmed total: $${round2(derived)} (expected $${EXPECTED_DERIVED_TOTAL})`);
    console.log(`invoices seen: ${[...seenInvoices].sort().join(", ")}`);

    const invoicesOk =
      seenInvoices.size === EXPECTED_INVOICES.size &&
      [...seenInvoices].every((x) => EXPECTED_INVOICES.has(x));
    const ok =
      total === EXPECTED_TOTAL &&
      Math.abs(vendorConfirmed - EXPECTED_VENDOR_TOTAL) <= MONEY_TOL &&
      Math.abs(clientInvoiced - EXPECTED_CLIENT_INVOICED_TOTAL) <= MONEY_TOL &&
      Math.abs(derived - EXPECTED_DERIVED_TOTAL) <= MONEY_TOL &&
      invoicesOk;

    if (!ok) throw new Error("Validation report did not match expectations — ROLLBACK");

    await client.query("COMMIT");
    console.log("\nCOMMIT ok.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\nImport failed, rolled back:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
