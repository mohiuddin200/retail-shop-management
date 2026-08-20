# Delivery roadmap

## Foundation — current milestone

- Expo and TypeScript project
- File-based navigation and module shell
- Convex-ready client configuration
- Architecture and business-rule guardrails
- Local quality checks and Git repository

## Phase 1 — core shop operation

- Convex deployment, schema, authentication, shops, memberships, and roles
- Owner-defined categories and bulk product intake - complete
- Permanent unit SKU and versioned lookup payload generation - complete
- Label preview, system printing, and native PDF implementation - complete
- Physical A4 and 40 × 30 mm thermal print-and-scan proof - pending
- Multi-item POS cart with QR/manual entry and cash payment - implementation complete; real-device acceptance pending
- Explicit business-day open/close flow - implementation complete; authenticated acceptance pending
- Resalable and damaged return handling
- Daily sales report

## Phase 2 — reconciliation and people

- Persistent offline sale outbox and synchronization rules
- Physical stock audit and gap reconciliation
- Credit-buyer charges, balances, and repayments
- Staff profiles, withdrawals, and payroll records
- Staff activity log

## Phase 3 — accounting and insight

- Expenses and purchases reporting
- Monthly and yearly profit and loss
- CSV and PDF exports
- Owner anomaly insights based on deterministic ledger data
- Multi-branch support if confirmed

## Decisions required before the relevant feature starts

- Target platforms and minimum Android/iOS versions
- Phone camera versus dedicated scanner
- Printer model, connection type, label dimensions, and A4 requirements
- Printed cost-cipher requirement; SKU format is locked as `CODE-YYYYMMDD-BATCH-UNIT` and QR payload as `RSM:1:SKU:<sku>`
- Single shop versus multiple branches
- Currency, tax, and damaged-stock accounting rules
