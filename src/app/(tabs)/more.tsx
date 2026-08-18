import { FeaturePlaceholder } from '@/components/feature-placeholder';

export default function MoreScreen() {
  return (
    <FeaturePlaceholder
      icon="dots-grid"
      phase="Phases 2–3"
      steps={[
        'Stock audits and gap reconciliation',
        'Credit-buyer balances and payments',
        'Staff payroll and withdrawals',
        'Expenses, reports, exports, and owner settings',
      ]}
      summary="Supporting modules will build on the same transaction and permission foundations."
      title="Operations and reports"
    />
  );
}
