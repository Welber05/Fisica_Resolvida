import AccountClient from './account-client';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { getBillingProfile, requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { user } = await requirePageUser('/conta');
  return (
    <AccountClient
      initialUser={safeUser(user)}
      initialBilling={await getBillingProfile(user.id)}
      signOutPath={chatGPTSignOutPath('/login')}
    />
  );
}
