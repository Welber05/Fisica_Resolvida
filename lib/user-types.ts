export type AppRole = 'user' | 'professor' | 'manager' | 'admin';
export type AccountStatus = 'active' | 'inactive' | 'blocked' | 'suspended';
export type AccountType = 'human' | 'system';

export type SocialLinks = {
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  facebook?: string;
  x?: string;
};

export type AppUser = {
  id: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  phone: string;
  educationLevel: string;
  accountType: AccountType;
  role: AppRole;
  status: AccountStatus;
  statusReason: string | null;
  suspendedUntil: number | null;
  profileComplete: boolean;
  avatarKey: string | null;
  lattesUrl: string | null;
  orcid: string | null;
  socialLinks: SocialLinks;
  address: {
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
  };
  privacyAcceptedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type SafeUser = Omit<AppUser, 'authUserId' | 'avatarKey' | 'deletedAt'> & {
  avatarUrl: string | null;
};

export type BillingProfile = {
  userId: string;
  payerType: 'individual' | 'company';
  legalName: string;
  documentType: 'cpf' | 'cnpj' | 'other';
  documentNumber: string;
  companyName: string;
  billingEmail: string;
  billingPhone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  planCode: string;
  subscriptionStatus: string;
  updatedAt: number;
};

export const roleLabels: Record<AppRole, string> = {
  user: 'Usuário',
  professor: 'Professor',
  manager: 'Gerente',
  admin: 'Administrador',
};

export const statusLabels: Record<AccountStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
  suspended: 'Suspenso',
};

export const educationLevels = [
  ['fundamental', 'Ensino fundamental'],
  ['medio', 'Ensino médio'],
  ['graduacao', 'Graduação'],
  ['pos_graduacao', 'Pós-graduação'],
  ['professor', 'Professor / educador'],
  ['outro', 'Outro'],
] as const;
