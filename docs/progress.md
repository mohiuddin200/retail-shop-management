# Project progress

Last updated: 2026-08-20

## Completed

- [x] Create the Expo React Native and TypeScript project
- [x] Add Expo Router and the initial application navigation
- [x] Add placeholder screens for Dashboard, POS, Inventory, and More
- [x] Connect the Convex development deployment
- [x] Configure Convex email/password authentication
- [x] Store authentication tokens securely on Android and iOS
- [x] Add the initial users, shops, memberships, roles, and categories schema
- [x] Add backend health, current-user, and shop functions
- [x] Add architecture, roadmap, and requirements documentation
- [x] Push the project to GitHub
- [x] Build sign-up and sign-in screens
- [x] Add protected navigation for authenticated users
- [x] Build initial shop creation and owner onboarding
- [x] Connect the dashboard to the authenticated shop
- [x] Add owner-managed inventory categories with permanent SKU codes
- [x] Add idempotent bulk stock intake with immutable batch costs
- [x] Create one permanent SKU and versioned QR payload per physical unit
- [x] Add role-aware inventory summaries, batch browsing, and unit details
- [x] Add automated inventory domain and Convex authorization tests
- [x] Add owner/manager label ranges, one/two-copy jobs, and shared QR previews
- [x] Add 48 × 30 mm A4 HTML printing through the system print dialog
- [x] Add native PDF generation and sharing for label jobs
- [x] Add one-page 40 × 30 mm thermal labels and bounded preview navigation
- [x] Manually scan a generated QR code from the on-screen label preview
- [x] Add camera and manual SKU lookup for every active POS role
- [x] Add a multi-item cart with negotiated prices, cash tender, and change
- [x] Complete cash sales atomically with immutable sale, item, and payment records
- [x] Add retry-safe business-day creation and owner/manager End Day controls
- [x] Add immutable one-unit cash returns with exact original-price refunds
- [x] Restore resalable units and quarantine damaged returns with role enforcement
- [x] Post late returns to the current business day without mutating closed days
- [x] Replace setup readiness with a responsive operational Overview dashboard
- [x] Add role-safe business-day and inventory snapshots with a project hero illustration

## Next

- [ ] Review the Overview as owner/manager and cashier on phone and wide web, confirming layout and cost visibility
- [ ] Run authenticated real-device POS and returns acceptance: sell by QR, refund resalable, resell, refund damaged as owner/manager, verify cashier denial, and close a return-only day
- [ ] Add the finalized daily sales report
- [ ] Add credit buyers, due balances, and repayments in Phase 2

## Deferred

- [ ] Print A4 labels at 100%, measure 48 × 30 mm cells, and scan first/middle/last
- [ ] Print thermal labels at 100%, measure 40 × 30 mm output, and scan first/middle/last
- [ ] Record physical results in docs/printing-proof.md and close the QR label phase only after both formats pass

Update this checklist whenever a milestone is completed or the immediate priorities change.
