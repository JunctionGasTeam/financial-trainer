import { SpendingBreakdown } from '@/components/spending-breakdown';
import { useWipe, WipeScreen } from '@/components/ui/wipe-screen';

export default function SpendingReportScreen() {
  return (
    <WipeScreen from="right">
      <SpendingReport />
    </WipeScreen>
  );
}

function SpendingReport() {
  const { close } = useWipe();
  return <SpendingBreakdown onClose={close} />;
}
