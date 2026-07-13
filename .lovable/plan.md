Sweep the remaining French UI strings and translate them to US English. Code, types, state values, keys, and CSS class names stay unchanged — only user-visible text and comments in the affected lines.

## Files and replacements

**src/routes/_authenticated/room.index.tsx**
- "Pièce par pièce" → "Room by room"

**src/routes/_authenticated/room.$roomId.tsx**
- toast "Image mise à jour" → "Image updated"
- toast "Image supprimée" → "Image removed"
- aria-label "Supprimer l'image" → "Remove image"
- fallback "Pièce" → "Room"
- eyebrow "Par catégorie" → "By category"

**src/routes/_authenticated/cashflow.tsx**
- eyebrow "Trésorerie · réel uniquement" → "Cash · actuals only"
- tab "Réconciliation" → "Reconciliation"
- "Aucun paiement enregistré" → "No payments recorded"
- "Ajouter un premier paiement" → "Add a first payment"
- SelectItem "Non planifié" (x2) → "Unscheduled"

**src/routes/_authenticated/dashboard.tsx**
- eyebrow "Ce mois & le suivant" → "This month & next"
- title `À faire` → `To do`, eyebrow "À spec / à commander" → "To spec / to order"
- eyebrow "Priorité haute" → "High priority"
- "Aucun paiement enregistré" → "No payments recorded"
- "Ajouter un paiement →" → "Add a payment →"

**src/routes/_authenticated/logistics.tsx**
- "France · Mississippi · Résidence" → "France · Mississippi · Residence"

**src/routes/_authenticated/budget.tsx**
- "Définir" (x2) → "Set"

**src/components/room/BudgetStrip.tsx**
- "Définir" → "Set"

**src/components/items/ItemDrawer.tsx**
- hint "Partagé entre projets" → "Shared across projects"
- "Aucune photo." → "No photos."

**src/components/cashflow/ReconciliationTab.tsx** (full pass)
- "{n} paiement(s) en attente de confirmation" → "{n} payment(s) awaiting confirmation"
- "Aucun de ces paiements n'entre dans les totaux tant qu'il n'est pas confirmé." → "None of these payments count toward totals until confirmed."
- "À vérifier" → "Needs review"
- "sur {n} paiement(s). Ce fournisseur n'apparaît nulle part…" → "across {n} payment(s). This vendor doesn't appear anywhere…" (keep surrounding sentence structure in English)
- "Ces soldes sont énoncés dans les factures (50%/40% restant). Confirmer nécessite une échéance." → "These balances are stated in the invoices (50% / 40% remaining). Confirming requires a due date."
- "Confirmer & dater" (x2) → "Confirm & date"
- "Facture {n}" → "Invoice {n}"
- "Confirmer facture payée" → "Confirm invoice paid"
- "Confirmer facture due" → "Confirm invoice due"
- title "Confirmer payée" → "Confirm paid"
- "Modifier" → "Edit"
- "Modifier le paiement" → "Edit payment"
- "Échéance (requis)" → "Due date (required)"
- "Échéance" → "Due date"
- SelectItem "Payée" → "Paid"
- "Annuler" (x2) → "Cancel"
- "Confirmer" → "Confirm"
- "Enregistrer" → "Save"
- Any remaining French labels found in the same file during the edit (status pills, tooltips) get the same treatment.

**src/styles.css**
- Comment `Editorial paper palette — "Atelier feutré"` → `Editorial paper palette — "Muted atelier"` (comment only; no token changes).

## Out of scope

- No changes to state values (`"paid" | "due" | "reserved"`), route paths, table/column names, or CSS class names.
- No changes to `src/components/ui/**` (shadcn primitives), generated files, or Supabase types.
- No behavioral changes; text-only sweep.

## Verification

- Grep for remaining French markers (`Pièce`, `Réconciliation`, `Aucun`, `Ajouter`, `Confirmer`, `Modifier`, `Annuler`, `Enregistrer`, `Facture`, `Échéance`, `Définir`, `Payée`, `À faire`, `Résidence`, `Trésorerie`, `Par catégorie`, `Non planifié`, `Partagé`, accented letters in JSX/strings) returns nothing in `src/` outside `components/ui/**` and generated files.
- Typecheck passes.