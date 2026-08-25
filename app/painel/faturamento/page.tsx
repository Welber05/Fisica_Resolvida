import BillingManager from './billing-manager';
import { listBillingPlans, listBillingProfiles, listPaymentMethods, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function BillingManagementPage() {
  await requirePageUser('/painel/faturamento', { roles: ['admin', 'manager'] });
  let profiles = [], plans = [], paymentMethods = [];
  try {
    [profiles, plans, paymentMethods] = await Promise.all([listBillingProfiles(), listBillingPlans(), listPaymentMethods()]);
  } catch (error) { console.warn('Faturamento indisponível para leitura:', error); }
  return (
    <BillingManager
      initialProfiles={profiles}
      initialPlans={plans}
      initialPaymentMethods={paymentMethods}
    />
  );
}
