import { redirect } from 'next/navigation';
import OnboardingForm from './onboarding-form';
import { requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function RegistrationPage() {
  const { user } = await requirePageUser('/cadastro', { allowIncomplete: true });
  if (user.profileComplete) redirect('/');
  return <OnboardingForm initialUser={safeUser(user)} />;
}
