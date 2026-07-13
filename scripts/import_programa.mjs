#!/usr/bin/env node
// One-shot importer for the cleaned Programa export (M4).
//
// Reads PG* env vars, connects as service_role, and inserts rows in ONE
// transaction. Before any write we SET LOCAL request.jwt.claims to an
// existing owner/super_admin profile so app_private.current_money_visibility()
// returns 'full' and the enforce_money_write trigger allows money writes —
// the import goes THROUGH the guard, not around it.
//
// Idempotent: all inserts use ON CONFLICT DO NOTHING with deterministic uuids.
//
// Usage:  node scripts/import_programa.mjs [path-to-json]
//   defaults to /mnt/user-uploads/gad_m4_import.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

// Deterministic uuid v5 for a "duplicate item_id" — mints a stable child id
// so we don't lose rows the source file legitimately duplicates.
function derivedItemId(originalId, occurrence) {
  const h = crypto.createHash("sha1").update(`${originalId}:${occurrence}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // v5
  b[8] = (b[8] & 0x3f) | 0x80;
  const s = b.toString("hex");
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20,32)}`;
}

const SRC = process.argv[2] ?? "/mnt/user-uploads/gad_m4_import.json";
const IMPORT_TAG = "programa_2026-07-13";

const EXPECTED_ROOMS = {
  "Living Room": 34,
  "Dining Room / Living Room": 30,
  "Roof Deck": 19,
  "Master Bedroom": 17,
  "Kitchen": 15,
  "Bedroom 3": 11,
  "Master Bathroom": 10,
  "Bedroom 2": 8,
  "Powder Room": 6,
  "Foyer": 5,
  "Bathroom 2": 5,
  "Hallway": 5,
};
const EXPECTED_PROJECT_LEVEL = 16; // room_id IS NULL (fees + project-wide)
const EXPECTED_TOTAL = 700637.79;
const TOTAL_TOL = 50;

const VALID_STATUS = new Set(["paid", "partial_payment", "invoiced", "client_review"]);
const STATUS_MAP = {
  paid: "ordered",
  partial_payment: "ordered",
  invoiced: "committed",
  client_review: "committed",
};

function parseMoney(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseQty(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
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

    // Resolve project.
    const proj = await client.query(
      "SELECT id FROM public.projects WHERE name = $1",
      ["Candida Smith"],
    );
    if (proj.rowCount !== 1) throw new Error("Candida Smith project not found");
    const projectId = proj.rows[0].id;

    // Pick a full-visibility profile.
    const own = await client.query(`
      SELECT p.id
        FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
       WHERE r.money_visibility = 'full'
       ORDER BY (r.key = 'owner') DESC, (r.key = 'super_admin') DESC, p.created_at ASC
       LIMIT 1
    `);
    if (own.rowCount !== 1) {
      throw new Error("No profile with a full money-visibility role — cannot pass money-write trigger");
    }
    const ownerId = own.rows[0].id;

    // Impersonate for this transaction so app_private.current_money_visibility() returns 'full'.
    await client.query(
      `SELECT set_config('request.jwt.claims',
                         json_build_object('sub', $1::text, 'role', 'authenticated')::text,
                         true)`,
      [ownerId],
    );

    // Lookups.
    const rRooms = await client.query("SELECT id, name FROM public.rooms");
    const roomByName = new Map(rRooms.rows.map((r) => [r.name, r.id]));

    const rCats = await client.query("SELECT id, key FROM public.categories");
    const catByKey = new Map(rCats.rows.map((r) => [r.key, r.id]));

    const rVendors = await client.query("SELECT id, name FROM public.vendors");
    const vendorByLc = new Map(rVendors.rows.map((r) => [r.name.toLowerCase(), r.id]));

    // Validate everything before writing.
    const rejects = [];
    for (const [i, r] of rows.entries()) {
      if (r.room != null && !roomByName.has(r.room)) {
        rejects.push(`row ${i} (${r.item_id}): unknown room "${r.room}"`);
      }
      if (r.category != null && !catByKey.has(r.category)) {
        rejects.push(`row ${i} (${r.item_id}): unknown category "${r.category}"`);
      }
      if (r.category == null && !r.is_fee) {
        rejects.push(`row ${i} (${r.item_id}): null category on non-fee row`);
      }
      if (!VALID_STATUS.has(r.programa_status)) {
        rejects.push(`row ${i} (${r.item_id}): invalid programa_status "${r.programa_status}"`);
      }
    }
    if (rejects.length) {
      console.error("VALIDATION FAILED:");
      for (const m of rejects) console.error("  " + m);
      throw new Error(`${rejects.length} row(s) rejected — aborting`);
    }

    // Vendor resolver.
    async function resolveVendor(supplier, supplierEmail) {
      if (supplier == null) return null;
      const name =
        supplier === "Giana Allen Design"
          ? "Giana Allen Design (inventory)"
          : supplier;
      const lc = name.toLowerCase();
      if (vendorByLc.has(lc)) return vendorByLc.get(lc);
      const ins = await client.query(
        `INSERT INTO public.vendors (name, contact_info, account_status)
         VALUES ($1, $2, 'purchased_from')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [name, supplierEmail],
      );
      let id;
      if (ins.rowCount === 1) {
        id = ins.rows[0].id;
      } else {
        const q = await client.query("SELECT id FROM public.vendors WHERE lower(name) = $1", [lc]);
        id = q.rows[0].id;
      }
      vendorByLc.set(lc, id);
      return id;
    }

    // Upsert products then items.
    let productInserts = 0;
    let itemInserts = 0;
    const seenItemIds = new Map(); // originalId -> occurrence count

    for (const r of rows) {
      const seen = seenItemIds.get(r.item_id) ?? 0;
      seenItemIds.set(r.item_id, seen + 1);
      const itemId = seen === 0 ? r.item_id : derivedItemId(r.item_id, seen);
      const vendorId = await resolveVendor(r.supplier, r.supplier_email);

      const pRes = await client.query(
        `INSERT INTO public.products
           (id, name, brand, sku, doc_code, colour, finish, material,
            width_text, length_text, height_text, depth_text, default_vendor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.product_id,
          r.name ?? "Untitled",
          r.brand,
          r.sku,
          r.doc_code,
          r.colour,
          r.finish,
          r.material,
          r.width,
          r.length,
          r.height,
          r.depth,
          vendorId,
        ],
      );
      productInserts += pRes.rowCount;

      const roomId = r.room ? roomByName.get(r.room) : null;
      const categoryId = r.category ? catByKey.get(r.category) : null;

      const iRes = await client.query(
        `INSERT INTO public.items
           (id, project_id, product_id, room_id, category_id, vendor_id,
            title, description, sku, lead_time, qty_needed,
            gad_cost, client_price, gad_paid_vendor,
            is_fee, programa_status, import_source, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.item_id,
          projectId,
          r.product_id,
          roomId,
          categoryId,
          vendorId,
          r.name ?? "Untitled",
          r.description,
          r.sku,
          r.lead_time,
          parseQty(r.qty),
          parseMoney(r.gad_cost),
          parseMoney(r.client_price),
          Boolean(r.gad_paid_vendor),
          Boolean(r.is_fee),
          r.programa_status,
          IMPORT_TAG,
          STATUS_MAP[r.programa_status],
        ],
      );
      itemInserts += iRes.rowCount;
    }

    // Validation report from the DB itself.
    const dbItems = await client.query(
      `SELECT room_id, is_fee, client_price
         FROM public.items
        WHERE import_source = $1`,
      [IMPORT_TAG],
    );
    const dbProducts = await client.query(
      `SELECT count(*)::int AS n FROM public.products
        WHERE id IN (SELECT DISTINCT product_id FROM public.items WHERE import_source = $1)`,
      [IMPORT_TAG],
    );

    const perRoom = {};
    let projectLevel = 0;
    let fees = 0;
    let projectWideNonFee = 0;
    let total = 0;
    for (const row of dbItems.rows) {
      if (row.room_id == null) {
        projectLevel++;
        if (!row.is_fee) projectWideNonFee++;
      }
      if (row.is_fee) fees++;
      total += Number(row.client_price ?? 0);
    }
    const roomNameById = new Map(rRooms.rows.map((r) => [r.id, r.name]));
    for (const row of dbItems.rows) {
      if (row.room_id == null) continue;
      const n = roomNameById.get(row.room_id) ?? "?";
      perRoom[n] = (perRoom[n] ?? 0) + 1;
    }

    console.log("\n=== M4 import report ===");
    console.log(`items in DB (import_source=${IMPORT_TAG}): ${dbItems.rowCount} (expected 181)`);
    console.log(`distinct products: ${dbProducts.rows[0].n} (expected 153)`);
    console.log(`newly-inserted product rows this run: ${productInserts}`);
    console.log(`newly-inserted item rows this run:    ${itemInserts}`);
    console.log(`total client_price: $${total.toFixed(2)} (expected ~$${EXPECTED_TOTAL.toFixed(2)})`);
    console.log(`fees: ${fees}    project-level (room_id IS NULL): ${projectLevel} (expected ${EXPECTED_PROJECT_LEVEL})`);
    console.log(`project-wide non-fee (should be 1): ${projectWideNonFee}`);
    console.log("per-room:");
    let roomFail = false;
    for (const [name, expected] of Object.entries(EXPECTED_ROOMS)) {
      const got = perRoom[name] ?? 0;
      const ok = got === expected;
      if (!ok) roomFail = true;
      console.log(`  ${ok ? "OK " : "!! "} ${name}: ${got} (expected ${expected})`);
    }

    const totalOk = Math.abs(total - EXPECTED_TOTAL) <= TOTAL_TOL;
    const countsOk =
      dbItems.rowCount === 181 &&
      dbProducts.rows[0].n === 153 &&
      projectLevel === EXPECTED_PROJECT_LEVEL &&
      projectWideNonFee === 1;

    if (!totalOk || !countsOk || roomFail) {
      throw new Error("Validation report did not match expectations — ROLLBACK");
    }

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
