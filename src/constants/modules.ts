import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type ModuleDefinition = {
  key: string;
  title: string;
  description: string;
  phase: 1 | 2 | 3;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
};

export const coreModules: ModuleDefinition[] = [
  {
    key: 'inventory',
    title: 'Inventory and QR labels',
    description: 'Bulk intake, unit-level cost, permanent SKUs, QR generation, and label printing.',
    phase: 1,
    icon: 'package-variant-closed',
  },
  {
    key: 'pos',
    title: 'POS and business-day close',
    description: 'Scan-to-sell carts, flexible selling prices, refunds, and explicit End Day closing.',
    phase: 1,
    icon: 'qrcode-scan',
  },
  {
    key: 'audit',
    title: 'Stock audit and reconciliation',
    description: 'Physical scanning, missing-stock resolution, and safe recovery after usage gaps.',
    phase: 2,
    icon: 'clipboard-check-outline',
  },
  {
    key: 'accounts',
    title: 'Dues and payroll',
    description: 'Credit-buyer balances, repayments, staff withdrawals, and salary records.',
    phase: 2,
    icon: 'account-cash-outline',
  },
  {
    key: 'reporting',
    title: 'Financial reporting',
    description: 'Deterministic profit and loss, expenses, purchases, exports, and printable reports.',
    phase: 3,
    icon: 'chart-box-outline',
  },
];
