import AppTabs from '@/components/app-tabs';
import { useSmsAutoImport } from '@/hooks/use-sms-auto-import';

export default function TabsLayout() {
  useSmsAutoImport();
  return <AppTabs />;
}