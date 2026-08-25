import AccountClient from './account-client';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { getBillingProfile, listTeacherSchools, requirePageUser, safeUser } from '@/lib/user-service';
import type { BillingProfile, TeacherSchool } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { user } = await requirePageUser('/conta');
  let billing: BillingProfile = {
    userId: user.id, payerType: 'individual', legalName: user.fullName, documentType: 'cpf',
    documentNumber: '', companyName: '', billingEmail: user.email, billingPhone: user.phone,
    postalCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    country: 'Brasil', planCode: 'gratuito', subscriptionStatus: 'sem_assinatura', updatedAt: 0,
  };
  let schools: TeacherSchool[] = [];
  try {
    [billing, schools] = await Promise.all([getBillingProfile(user.id), listTeacherSchools(user.id)]);
  } catch (error) {
    console.warn('Conta pública em modo somente leitura:', error);
  }
  return (
    <AccountClient
      initialUser={safeUser(user)}
      initialBilling={billing}
      initialSchools={schools}
      signOutPath={chatGPTSignOutPath('/login')}
    />
  );
}
