# Foundation architecture

## Application surfaces

- **React Native mobile app:** cashier POS, QR scanning, returns, and physical stock audits.
- **Shared Expo web surface:** suitable for early owner administration and reports; a dedicated React web dashboard can be split out later if desktop workflows outgrow it.
- **Convex backend:** authoritative data, transactional business operations, live synchronization, authorization, and files needed by reports and labels.

## Non-negotiable domain rules

1. A physical unit receives one SKU that is never reused.
2. Buying cost is stored per unit and is not replaced by a category average.
3. Money is stored as integer minor units, never floating-point currency values.
4. Selling inventory, posting payment, and recording ledger effects happen in one server mutation.
5. A closed business day is immutable. Later corrections are explicit adjustments.
6. Stock audits reconcile existing identities; scanning never silently creates stock or revenue.
7. Credit sales and collected cash remain separate until a payment is recorded.
8. Every public backend function checks shop membership, role, and resource ownership.

## Multi-tenant boundary

Every shop-owned record will include a `shopId`. Queries use indexed shop-scoped access, and authorization is enforced inside Convex functions rather than trusted to the client UI.

## Offline strategy

Convex remains the source of truth. Critical mobile writes will use a persistent local outbox with client-generated idempotency keys. The UI may show a sale as pending, but only a Convex acknowledgement marks it synchronized. Conflict rules must be designed before offline POS is enabled.

## Authentication

Convex Auth is the identity system. Development email/password authentication is configured, and native tokens are stored with Expo SecureStore. Password reset and email verification are launch blockers for production and require an email provider.

Roles are modeled as shop memberships: owner, manager, and cashier. Permissions are enforced by backend helpers, not only route visibility.

## Reporting

Financial reports are deterministic projections over immutable transactions and adjustments. Any future AI insight layer may explain anomalies but cannot calculate or overwrite accounting totals.

## Inventory identity and intake

Category codes are confirmed by the owner and contain 2-4 uppercase letters or numbers. Unit SKUs use `CODE-YYYYMMDD-BATCH-UNIT`, with a minimum four-digit batch number and three-digit unit number. Codes become immutable once a category has stock.

Each intake is one atomic, idempotent Convex mutation. It creates an immutable batch plus one inventory-unit record per physical item, with quantity limited to 500. Every unit keeps its original buying cost in integer minor units. The QR payload contract is `RSM:1:SKU:<sku>` and never contains cost.

Inventory access is limited to active owners and managers. Only owners manage category lifecycle; managers can view costs and add stock. Cashiers cannot query inventory or open its routes.

## Label preview and printing

The label-data query is read-only, shop-scoped, and restricted to active owners and managers. It accepts an inclusive unit range and returns only shop/category/batch context plus ordered unit numbers, SKUs, and QR payloads. Buying costs never enter the label response or printable document.

One QR matrix generator uses error-correction level M and a four-module quiet zone. Both the React Native SVG preview and printable inline SVG consume that matrix, so they encode identical data.

A4 output uses a 210 × 297 mm page with 9 mm horizontal margins and 13.5 mm vertical margins. Its 192 × 270 mm content area is a 4 × 9 grid of 48 × 30 mm cut cells. Thermal output uses a 40 × 30 mm page with zero page margin and a 1 mm internal safety margin.

Large jobs are expanded with consecutive copies per SKU and rendered to HTML in asynchronous chunks. The UI limits A4 preview to the first 36 labels and thermal preview to one label at a time.

Android and iOS send supplied HTML to Expo Print and can generate a PDF for Expo Sharing. Web uses an isolated temporary iframe because Expo Print on web prints the current document instead of supplied HTML. Printer connectivity, media selection, and scaling remain system-dialog and driver responsibilities.

Printing never records a print event or changes an inventory unit. Physical acceptance remains open until the A4 and thermal measurements and first/middle/last scan results are recorded in docs/printing-proof.md.
