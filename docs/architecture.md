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
