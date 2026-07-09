
-- Data correction pass following review with Giana. Idempotent.

-- 1. Rooms
UPDATE public.rooms SET active = true WHERE name = 'Roof Deck';

-- 2. Categories
INSERT INTO public.categories (key, label, sort_order)
VALUES ('fencing', 'Fencing (exterior)', 150)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

-- 3. People
-- Reaz -> Mohammad "Reaz" Hussain
UPDATE public.people
SET name = 'Mohammad "Reaz" Hussain',
    role = 'trade',
    notes = 'General contractor, R&SS. Full GC: responsible for everything in the DOB permits and all building including the deck. Carries his own insurance. Pulls the permit.'
WHERE name IN ('Reaz', 'Mohammad "Reaz" Hussain');

-- Belal Hussain
INSERT INTO public.people (name, role, notes)
SELECT 'Belal Hussain', 'trade',
       'On-site lead, R&SS. On site daily with the crew. Frequent point of contact for Giana.'
WHERE NOT EXISTS (SELECT 1 FROM public.people WHERE name = 'Belal Hussain');

-- Shauna: null references then delete
UPDATE public.items SET ordered_by = NULL
WHERE ordered_by IN (SELECT id FROM public.people WHERE name = 'Shauna');
UPDATE public.items SET installer = NULL
WHERE installer IN (SELECT id FROM public.people WHERE name = 'Shauna');
DELETE FROM public.people WHERE name = 'Shauna';

-- Kimberly rename + notes
UPDATE public.people
SET name = 'Kimberly Birn',
    role = 'client_assistant',
    notes = 'Pays Candida''s bills only. Does NOT open trade accounts.'
WHERE name IN ('Kimberly Byrne', 'Kimberly Birn');

-- Abe
UPDATE public.people
SET notes = 'Executive assistant and documentation hub. Opens and tracks trade accounts (including logins and passwords), creates invoices, tracks budget, places orders, holds SKUs, works in QuickBooks, manages resale listings on the website and Chairish including photo uploads. Reducing her bottleneck is a core purpose of the app.'
WHERE name = 'Abe';

-- Giana
UPDATE public.people
SET notes = 'Principal, decides everything. On Candida Smith also co-general contractor: manages permit submissions and the construction budget. Designs and manages the full roof deck.'
WHERE name = 'Giana Allen';

-- Paige
UPDATE public.people
SET notes = 'Logistics: carries the France to Mississippi to NYC flow, and the resale split to Giana''s warehouse for website sale.'
WHERE name = 'Paige';

-- MESH notes on people if present
UPDATE public.people
SET notes = 'Architecture firm. Eric Lifton owner, Spencer weekly contact. Created all drawings, works with the structural engineer, files the DOB.'
WHERE name ILIKE 'MESH%';

-- 4. Vendors
INSERT INTO public.vendors (name, account_status, notes)
VALUES ('Verellen', 'trade_account_open', 'Sofas, not yet ordered.')
ON CONFLICT (name) DO UPDATE SET
  account_status = EXCLUDED.account_status,
  notes = EXCLUDED.notes;

INSERT INTO public.vendors (name, account_status, notes)
VALUES ('Brownstone Movers', 'purchased_from',
        'US moves and receiving for new US orders (Roche Bobois, Verellen, Better-Ex when finished). Receives Candida''s own belongings July 20-21.')
ON CONFLICT (name) DO UPDATE SET
  account_status = EXCLUDED.account_status,
  notes = EXCLUDED.notes;

-- Better Tex -> Better-Ex
UPDATE public.vendors
SET name = 'Better-Ex',
    notes = 'Upholstery vendor.'
WHERE name IN ('Better Tex', 'Better-Ex');

-- MESH vendors
UPDATE public.vendors
SET notes = 'Architecture firm. Eric Lifton owner, Spencer weekly contact. Created all drawings, works with the structural engineer, files the DOB.'
WHERE name ILIKE 'MESH%';

-- 5. Items schema
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS option_source text;
