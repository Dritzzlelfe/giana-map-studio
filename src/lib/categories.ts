// Category axis policy — see `categories.axis` column (migration M3):
// - Fees follow their item's category axis.
// - Project-level fees (no category) count toward 'construction' by default.
// - `null` axis in the DB is treated as 'construction' by `budgetMath.axisOf`
//   so unclassified categories never silently drop out of the totals; Giana
//   can reclassify them at any time without a redeploy.
export const CATEGORY_AXIS_FALLBACK = "construction" as const;
