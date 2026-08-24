import { redirect } from 'next/navigation';
import OnboardingForm from './onboarding-form';
import { requireChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { getOrCreateUser, isOwnerEmail, safeUser } from '@/lib/user-service';
import type { AppUser, SafeUser } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function RegistrationPage() {
  const identity = await requireChatGPTUser('/cadastro');
  let initialUser: SafeUser;
  let existingUser: AppUser | null = null;
  try {
    existingUser = await getOrCreateUser(identity);
    initialUser = safeUser(existingUser);
  } catch (error) {
    console.error('Falha ao preparar cadastro; exibindo formulário seguro.', error);
    initialUser = identityToPendingUser(identity);
  }
  if (existingUser?.profileComplete) {
    redirect(['manager', 'admin'].includes(existingUser.role) ? '/painel' : '/acervo');
  }
  return <OnboardingForm initialUser={initialUser} />;
}

function identityToPendingUser(identity: ChatGPTUser): SafeUser {
  const now = Date.now();
  const owner = isOwnerEmail(identity.email);
  return {
    id: 'pending-profile',
    email: identity.email,
    fullName: identity.fullName ?? '',
    phone: '',
    educationLevel: '',
    accountType: 'human',
    role: owner ? 'admin' : 'user',
    status: 'active',
    statusReason: null,
    suspendedUntil: null,
    professionalType: owner ? 'education_professional' : 'student',
    educatorVerificationStatus: owner ? 'approved' : 'not_requested',
    institutionalEmail: null,
    functionalId: null,
    cpf: null,
    profileComplete: false,
    avatarUrl: null,
    lattesUrl: null,
    orcid: null,
    socialLinks: {},
    address: {
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      country: 'Brasil',
    },
    privacyAcceptedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
