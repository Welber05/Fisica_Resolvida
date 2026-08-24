import BillingManager from './billing-manager';
import { listBillingPlans, listBillingProfiles, listPaymentMethods, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function BillingManagementPage() {
  await requirePageUser('/painel/faturamento', { roles: ['admin', 'manager'] });
  return (
    <BillingManager
      initialProfiles={await listBillingProfiles()}
      initialPlans={await listBillingPlans()}
      initialPaymentMethods={await listPaymentMethods()}
    />
  );
}
