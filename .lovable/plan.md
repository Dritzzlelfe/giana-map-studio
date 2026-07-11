Reorder the top navigation in `src/components/shell/AppShell.tsx` to:

1. Dashboard
2. Rooms
3. Matrix
4. Schedule
5. Mind map
6. Admin

Also rename the "Room" label to "Rooms" to match.

No routes, logic, or permissions change — only the order and label in the `NAV` array. Visibility rules (role rights, admin gating) stay identical.