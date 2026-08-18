# **Retail Shop Inventory, Sales & Accounts Management System**

Software Requirements Document (SRD)

_Prepared for handoff to a development team / SaaS builder_

## 1. Executive Summary

This document describes the requirements for a shop management application aimed at small retail businesses (example use case: clothing shop) that need to manage inventory, QR/barcode-based product identification, point-of-sale (POS) selling, staff payroll, supplier/credit-buyer (“Paikaar”) dues, and financial reporting (profit/loss, monthly and yearly).

The core workflow is: the owner defines categories → bulk-adds stock into a category with a buying price → the system auto-generates a unique SKU and a QR code per unit (or per batch) → QR codes are printed as stickers and attached to the physical product → at the counter, the staff scans the QR code and enters the selling price to record a sale → all sales, refunds, staff payments, and supplier dues roll up into daily, monthly, and yearly reports.

This is a multi-module system: Inventory, QR/Label Printing, POS/Sales, Returns & Refunds, Stock Audit, HR/Payroll, Accounts Receivable/Payable (credit buyers), and Analytics/Reporting. Each module is detailed below with the business rules described by the shop owner, plus notes on edge cases the development team should clarify or account for.

## 2. Goals

- Remove manual/paper-based stock tracking and replace it with scan-based entry and sale.

- Give every physical product a unique, printable identity (SKU + QR code) generated automatically — no manual product-name typing during bulk intake.

- Make daily sales entry a single scan + price action, usable by non-technical shop staff.

- Give the owner an accurate, real-time picture of stock on hand, stock cost, cash vs. due (credit) sales, staff cost, and true profit/loss.

- Support physical stock audits via scanning, and reconcile audit results against system records.

- Handle real-world gaps in usage (e.g., owner doesn’t use the app for several days) without corrupting stock or revenue history.

## 3. User Roles & Permissions

|**Role**|**Description / Access**|
|---|---|
|Owner / Admin|Full access: inventory, categories, QR/pricing-cipher setup, staff & payroll,<br>credit buyers, all analytics and reports, settings.|
|Staff / Cashier|POS screen only (scan → sell → refund), and stock-audit scanning. No access<br>to costs, salaries, or profit/loss unless granted.|
|Manager (optional)|Everything staff can do, plus inventory bulk-add, stock audit, and view (not<br>necessarily edit) reports — configurable per shop.|



**_<mark>NOTE:</mark>_** _<mark>Multi-staff / multi-device login with per-staff activity logs (who scanned/sold what) is strongly recommended even though it wasn’t explicitly requested — it is needed to make refunds, missing-stock investigations, and staff accountability workable. Flagging this for confirmation.</mark>_

## 4. Functional Modules

### 4.1 Category & Bulk Product Intake

Categories are fully user-defined (e.g., Shirt, Pant, Baby Pant, Baby Shirt, Oversize Shirt). The owner creates and manages the category list himself — there is no fixed/global category list.

**Bulk-add workflow:** the owner does not type individual  product names. Instead, in one intake action he selects a category, enters a buying price, and enters a quantity. Example: “40 units → Shirt → buying price 300” and separately “20 units → Shirt → buying price 400”. The system then auto-generates one SKU + one QR code per unit in that batch.

- **Batch fields:** category, buying price (per unit), quantity,  intake date, optional supplier/paikaar reference (if bought on credit), optional notes.

- **Repeat intake:** the same category can be re-stocked  at any time with a different buying price — each batch is tracked separately so cost basis per unit is preserved (this matters for accurate profit calculation later, since two units of the “same” shirt may have cost 300 and 400 respectively).

- **Selling price:** not fixed at intake. The selling price  is entered at the point of sale (scan time), giving staff flexibility (bargaining, discounts, size/damage adjustments).

### 4.2 SKU Generation

Each unit gets a unique SKU automatically — no manual entry. Recommended SKU composition:

- Category code (short, derived from the category name or an owner-assigned 2–4 letter code, e.g., SHT for Shirt, BPT for Baby Pant).

- Batch date or batch number.

- A sequential unique unit number within the batch/category.

Example SKU pattern: SHT-20260817-014 (category – date – running unit number). The exact pattern should be confirmed with the owner, but it must guarantee no two physical units ever share a SKU.

### 4.3 QR Code Generation, Pricing Cipher & Printing

Each unit’s QR code encodes two pieces of information: the SKU, and the buying price — the buying price is not shown in plain numbers on the sticker but encoded using a substitution cipher that the owner himself defines (e.g., a=1, b=2, c=3 … or any mapping he chooses), so that customers who see the sticker cannot read the shop’s cost price.

- **Cipher management:** the owner sets up and can edit  a letter→digit (or digit→letter) mapping in a settings screen. The system uses this mapping only to render a human-glance-resistant code on the printed sticker; the QR code payload itself should still carry the real machine-readable data (SKU + actual buying price, or an internal batch ID) so the app can always decode it correctly regardless of what’s printed.

- **Printed sticker content:** QR code image, SKU, and the  ciphered buying-price string (for the owner’s/staff’s own quick reference — not customer-facing meaning).

- **Print options:** at print time, the owner chooses how  many copies to print per unit/SKU (e.g., 1 or 2 copies per product), and can select a range or the full batch. Output should be a print-ready sheet/PDF sized for standard sticker label sheets.

**_<mark>NOTE:</mark>_** _<mark>Clarify with the owner: does he want price-cipher  shown per unit, or is the QR payload alone sufficient and the printed cipher text is just a nice-to-have? Also confirm target label/printer size (e.g., 40mm×30mm thermal labels vs. A4 sticker sheets) since this drives the print-layout design.</mark>_

### 4.4 Sales / Point-of-Sale (POS)

At the counter, staff scans a product’s QR code (via phone camera or a barcode scanner) which looks up the SKU, and staff enters the actual selling price for that sale (since selling price varies by negotiation/discount). This creates a sale record with: SKU, category, buying price (pulled automatically from the batch), selling price (entered), profit margin (computed), timestamp, and staff ID.

- **Multiple items per sale:** the POS should support scanning  several units into one “cart”/receipt/transaction before finalizing, rather than one scan = one isolated sale, so a customer buying 3 items gets one receipt.

- **Payment type:** each sale should be tagged as Cash or  Credit/Due (linked to a paikaar/customer, see Section 4.9), since this feeds directly into the cash-vs-due analytics the owner wants.

### 4.5 Refunds & Returns

After a sale, a sold item can be scanned again to initiate a refund or return.

- **Refund:** reverses the sale — money is returned to the  customer; the unit’s status reverts to “in stock” (assuming it’s resalable) and it is added back to available inventory.

- **Return with damage:** the owner should be able to mark  a returned unit as damaged/unsellable rather than putting it back into sellable stock — this affects stock count without affecting resale availability.

- **Reporting impact:** refunds must reduce that day’s (or  the original sale-day’s) net revenue correctly — see Section 4.6 for how this interacts with a closed sales day.

### 4.6 Daily Sales & “End Day” Closing

Because the shop may stay open past midnight (e.g., until 2:00 AM), a calendar-midnight cutoff would incorrectly split one business day’s sales across two dates. Instead, the business day is defined by an explicit “End Day” action:

- **Behavior:** all sales made after the previous End Day  click, regardless of what the clock/calendar date says, belong to the current open business day. When the owner/staff presses “End Day,” that business day is closed — its totals (revenue, cost, profit, refunds, cash vs. due) are locked in as a finalized daily report, and a new business day begins.

- **Locked day edits:** once a day is closed, sales within  it should not be silently editable — any correction (e.g., a late refund against a closed day) should be logged as an adjustment against that historical day rather than mutating the original closed totals.

- **Multiple business days without closing:** if staff forgets  to click End Day, the system should still be usable — sales keep accumulating under the same open “current day” bucket until someone closes it. The report should still show the actual date/time of each sale even while the bucket stays “open.”

### 4.7 Stock Verification / Physical Audit

A dedicated “Check Stock” page lets the owner physically scan every product currently on the shelves.

- **Process:** owner opens the audit page, scans every item  he can find in the shop; each scan marks that SKU as “physically confirmed.”

- **End-of-audit result:** the system compares scanned SKUs  against SKUs that should be in stock (in-stock in the system minus anything already sold/refunded-out). Two outcomes are shown:

   - Missing products: in-system as “in stock” but not scanned during the audit (possible theft, loss, or an unrecorded sale).

   - Unlisted/extra products: physically scanned but not expected to be in stock per system records (the owner noted

      - this case is unlikely in practice since all owned stock should already be entered, but the system should still handle it gracefully rather than error out).

- **Damage marking:** for any missing item, the owner can choose to write it off as damage/loss directly from the audit results screen, adjusting stock and cost records accordingly instead of leaving it as an unexplained discrepancy.

### 4.8 Staff Management & Payroll

- **Staff profiles:** name, role, contact info, joining  date, base salary/rate, and any other staff details the owner wants to keep.

- **Ad-hoc withdrawals:** a staff member can “take” money  on different dates in different amounts (salary advances, incidental cash draws) — each entry logged with date, amount, staff, and optional note.

- **Salary sheet:** the system nets out base salary against  the sum of withdrawals for a period, producing a per-staff and all-staff salary sheet.

- **Reporting:** monthly (and yearly) printable salary/payroll  reports, feeding into the overall outlay/expense total used in profit & loss.

### 4.9 Credit Buyers / “Paikaars” (Accounts Receivable)

The owner can add people (“paikaars”) who are allowed to take products on credit.

- **Entry:** name, contact info, product/amount taken, description/notes,  and date — building a running due (outstanding balance) per paikaar.

- **Payments against due:** partial or full repayments should  be logged against the paikaar’s balance over time, not just a single add/clear.

- **Analytics tie-in:** the reporting/analytics pages should  clearly separate “due amount currently outstanding (product given, cash not yet received)” from “cash actually collected,” so the owner can see, at a glance, how much of his apparent revenue is still owed to him versus already in hand.

### 4.10 Analytics & Reporting

Reporting should roll up from the transactional data captured in the modules above. Key views:

- **Inventory snapshot:** current stock count and stock  cost value (by category and overall), split between sellable and damaged/written-off stock.

- **Cash position:** cash-in-hand from completed cash sales  vs. outstanding due from credit sales.

- **Profit & Loss (monthly/yearly):** revenue − cost of  goods sold (using each unit’s actual recorded buying price, not an average) − salaries/withdrawals − maintenance/other outlays = net profit or loss, for a selected month or year.

- **Purchases report:** how much stock (units and cost)  was bought in a given month, by category.

- **Expenses/outlays:** a general “expense” entry type (maintenance,  rent, utilities, etc.) that the owner can log ad hoc, feeding into the P&L alongside salaries and COGS.

- **Printable sheets:** monthly and yearly sales sheets,  expense sheets, and P&L statements, exportable/printable (PDF).

### 4.11 Predictive / “Is this really profit?” Insight

The owner asked about an AI/RAG-style system to double-check whether he is truly in profit or loss. In practice, the accuracy the owner needs here comes from correct accounting logic, not from an AI model — profit/loss must be computed deterministically from actual recorded buying prices, actual sale prices, refunds, staff costs, and outlays (as defined in 4.10). A retrieval-augmented-generation (RAG) system is not the right tool for arithmetic that must be exact.

What can reasonably be added on top, as an optional enhancement rather than a core requirement, is a lightweight insights layer that reviews the already-correct ledger data and flags anomalies in plain language — for example: unusually low margins on a category, a spike in refunds, due balances aging without payment, or a month where outlays outpaced revenue. This should be built as a secondary feature after the core accounting engine is solid and trustworthy.

### 4.12 Handling Extended Gaps in Usage (Owner Away, Then Resumes)

**_<mark>NOTE:</mark>_** _<mark>Worked example provided by the owner: he stops  using the app for 6 days. Products already exist and are physically in the shop, but no sales/intake were logged during that gap. When he resumes, he scans the products he currently has. How should stock and revenue be handled?</mark>_

- **Principle:** scanning a product in this context means  “I physically confirm I have this item,” which should behave like the Stock Audit flow in 4.7, not like a brand-new intake and not like a sale.

- **Recommended behavior:** run a stock audit for the gap  period — items scanned and already known to the system stay “in stock” with their original SKU, batch, and buying price untouched (their identity doesn’t change just because time passed). Items that were in stock before the gap but are not found when scanning should surface as “missing” per 4.7, letting the owner mark them sold-outside-the-system, lost, or damaged — his choice, since the system cannot know what happened during an untracked gap.

- **Revenue during the gap:** the system must never invent  or backfill revenue for the gap period — revenue only exists where an actual sale was recorded. If items are missing after the gap and the owner confirms they were in fact sold while he was away, the recommended flow is to let him log those as manual/backdated sales (with a real or estimated sale price he supplies) attributed to the gap dates, rather than the system guessing a value.

- **No silent new stock:** scanning existing SKUs during  this catch-up should not create duplicate stock entries or new batches — it should only reconcile against what already exists. A genuinely new batch (freshly bought stock) still goes through the normal bulk-intake flow in 4.1, separately from this reconciliation scan.

## 5. Core Data Entities (for the development team)

|**Entity**|**Key Fields**|
|---|---|
|Category|id, name, code (for SKU prefix), created_by, created_at|
|Product Batch|id, category_id, buying_price, quantity, intake_date, supplier/paikaar_ref (optional),<br>notes|
|Unit / SKU|sku (unique), batch_id, category_id, buying_price, status (in_stock / sold / refunded /<br>damaged), qr_payload|
|Sale|id, date/time, business_day_id, items[] (sku, selling_price), payment_type (cash/credit),<br>paikaar_ref (if credit), staff_id, total|
|Refund/Return|id, original_sale_id, sku, refund_amount, condition (resalable/damaged), date/time,<br>staff_id|
|Business Day|id, opened_at, closed_at (nullable until End Day), totals (revenue, cost, refunds, profit)|
|Staff|id, name, role, contact, base_salary, joined_date|
|Staff Transaction|id, staff_id, date, amount, type (advance/withdrawal/salary_payment), note|
|Paikaar (Credit Buyer)|id, name, contact, running_balance|
|Paikaar Transaction|id, paikaar_id, date, type (charge/payment), amount, description|
|Expense/Outlay|id, date, category (rent/maintenance/other), amount, note|
|Stock Audit|id, date, scanned_skus[], missing_skus[], extra_skus[], resolutions[]|



## 6. Key Business Rules Summary

● A SKU is generated once per physical unit and never reused, even after that unit is sold, refunded, or written off.

- Buying price is fixed per unit at intake (per batch) and is what COGS/profit calculations use — never a category-wide average.

- Selling price is only decided at the point of sale.

- A “business day” is defined by the End Day action, not by calendar midnight.

- Stock-audit scanning reconciles reality against records; it does not create new stock or new revenue by itself.

- Every due (credit) transaction must be traceable to a specific paikaar and reflected as outstanding, not as collected cash, until a payment is logged against it.

- Profit/Loss is computed from real recorded numbers (buying price, selling price, refunds, salaries, outlays) — no estimation layer sits between raw data and the reported P&L.

## 7. Non-Functional Requirements

- **Platform:** mobile-friendly web app or native app for  the POS/scanning screens (used constantly on the shop floor); admin/reporting screens can be desktop-first. To confirm with the owner: Android-only, iOS+Android, or web-based scanning via phone camera.

- **Offline tolerance:** brief network drops shouldn’t block  a sale from being scanned/queued and synced once connectivity returns, given retail counters don’t always have reliable internet.

- **Printing:** QR sticker sheets and report PDFs must be  generated in formats compatible with common label/thermal and A4 printers.

- **Auditability:** every stock, sale, refund, staff-payment,  and due transaction should be timestamped and attributed to a user, since money and inventory reconciliation depend on it.

- **Data ownership/export:** the owner should be able to  export his sales, inventory, and financial data (CSV/PDF) at any time.

## 8. Open Questions for the Owner (Recommended Before Development Starts)

- Exact SKU format and category-code convention.

- Exact QR payload structure and whether the printed price-cipher is required on every label or optional.

- Label/printer hardware (thermal roll printer vs. A4 sticker sheets) and label size.

- Scanning hardware: dedicated barcode scanner, or phone camera only?

- Whether multiple shop branches/locations need to be supported, or single-shop only for now.

- Whether staff need individual logins with restricted permissions, or one shared device login is acceptable initially.

- Definition of “damaged” write-off: does it reduce reported cost, or is it tracked separately as a loss category in P&L?

- Currency and tax handling, if applicable.

## 9. Suggested Build Phasing

#### Phase 1 — Core (MVP)

- Category management, bulk intake, SKU + QR generation and printing.

- POS scan-to-sell with cash/credit tagging, End Day closing.

- Basic refunds/returns.

- Daily sales report.

#### Phase 2

- Stock audit/reconciliation flow (including the gap-usage scenario in 4.12).

- Paikaar/due management with running balances.

- Staff & payroll module.

#### Phase 3

- Monthly/yearly P&L, purchases, and expense reporting with print/export.

- Optional insights/anomaly-flagging layer (Section 4.11).

- Multi-branch support, if needed.

_End of document._
