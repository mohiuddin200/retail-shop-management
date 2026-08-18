import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function InventoryScreen() {
  return (
    <FeaturePlaceholder
      icon="package-variant-closed"
      phase="Phase 1"
      steps={[
        'Create owner-defined categories and SKU prefixes',
        'Bulk-add stock while preserving each batch cost',
        'Generate one permanent SKU and QR identity per unit',
        'Prepare print-ready label sheets without exposing cost prices',
      ]}
      summary="Inventory will track each physical unit from intake through sale, return, or write-off."
      title="Inventory"
    />
  );
}
