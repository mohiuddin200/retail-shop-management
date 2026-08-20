# QR label printing proof

Status: implementation and automated validation passed; physical A4 and thermal acceptance are pending.

The QR label phase must remain open until both physical formats pass every measurement and scan gate below. Do not replace pending fields with assumptions.

## Automated evidence

- Owner and manager label access is allowed; cashier and cross-shop access is denied.
- Inclusive ranges, copy order, page counts, HTML escaping, QR determinism, and exact page CSS are covered by automated tests.
- A4 output is defined as 210 × 297 mm with 9 mm horizontal margins, 13.5 mm vertical margins, and a 4 × 9 grid of 48 × 30 mm cells.
- Thermal output is defined as one 40 × 30 mm label per page with zero page margin and a 1 mm internal safety margin.
- Web and Android production exports pass.
- Printing is read-only and does not write print history or change inventory records.

## Required setup

Use a batch range with at least three units so the first, middle, and last selected labels can be checked. For a two-copy run, also confirm that both copies of every SKU are adjacent.

Every scan must equal the inventory unit's stored payload exactly:

`RSM:1:SKU:<sku>`

## A4 physical proof

Print at 100% or Actual Size. Disable Fit, Shrink, Scale to Fit, and printer-driver enlargement.

| Field | Recorded value |
| --- | --- |
| Proof date and time | Pending |
| Printer make and model | Pending |
| Operating system and version | Pending |
| Printer driver and version | Pending |
| Paper setting | Pending |
| Scaling option | Pending |
| Measured cell width | Pending; must be 48 mm |
| Measured cell height | Pending; must be 30 mm |
| Two-copy labels adjacent | Pending |
| Overall result | Pending |

| Scan position | SKU | Expected payload | Actual scan | Result |
| --- | --- | --- | --- | --- |
| First selected label | Pending | Pending | Pending | Pending |
| Middle selected label | Pending | Pending | Pending | Pending |
| Last selected label | Pending | Pending | Pending | Pending |

A4 acceptance passes only when dimensions are correct, all three scans match exactly, and a two-copy sample is consecutive.

## Thermal physical proof

Configure the system printer driver and paper setting for 40 × 30 mm media, then print at 100% or Actual Size.

| Field | Recorded value |
| --- | --- |
| Proof date and time | Pending |
| Printer make and model | Pending |
| Operating system and version | Pending |
| Printer driver and version | Pending |
| Connection used by system driver | Pending |
| Paper setting | Pending |
| Scaling option | Pending |
| Measured label width | Pending; must be 40 mm |
| Measured label height | Pending; must be 30 mm |
| Two-copy labels adjacent | Pending |
| Overall result | Pending |

| Scan position | SKU | Expected payload | Actual scan | Result |
| --- | --- | --- | --- | --- |
| First selected label | Pending | Pending | Pending | Pending |
| Middle selected label | Pending | Pending | Pending | Pending |
| Last selected label | Pending | Pending | Pending | Pending |

Thermal acceptance passes only when dimensions are correct, all three scans match exactly, and a two-copy sample is consecutive.

## Milestone decision

- [ ] A4 physical gate passed.
- [ ] Thermal physical gate passed.
- [ ] QR label preview and printing proof phase may be marked complete.
