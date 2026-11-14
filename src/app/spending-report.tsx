import { router } from 'expo-router';

import { SpendingBreakdown } from '@/components/spending-breakdown';

export default function SpendingReportScreen() {
  return <SpendingBreakdown onClose={() => router.back()} />;
}
