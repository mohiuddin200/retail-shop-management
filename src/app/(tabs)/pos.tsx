import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function PosScreen() {
  return (
    <FeaturePlaceholder
      icon="qrcode-scan"
      phase="Phase 1"
      steps={[
        'Scan one or more product QR codes into a cart',
        'Enter the negotiated selling price for each unit',
        'Choose cash or credit and finalize the transaction',
        'Record staff, business day, cost, revenue, and profit atomically',
      ]}
      summary="This will become the staff-first scan-to-sell workspace."
      title="Point of sale"
    />
  );
}
