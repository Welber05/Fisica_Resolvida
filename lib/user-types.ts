export type AppRole = 'user' | 'professor' | 'manager' | 'admin';
export type AccountStatus = 'active' | 'inactive' | 'blocked' | 'suspended';
export type AccountType = 'human' | 'system';
export type ProfessionalType = 'student' | 'teacher' | 'education_professional';
export type EducatorVerificationStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

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
  professionalType: ProfessionalType;
  educatorVerificationStatus: EducatorVerificationStatus;
  institutionalEmail: string | null;
  functionalId: string | null;
  cpf: string | null;
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

export type TeacherSchool = {
  id: string;
  userId: string;
  name: string;
  city: string;
  state: string;
  institutionalEmail: string;
  functionalId: string;
  logoUrl: string | null;
  headerTitle: string;
  headerSubtitle: string;
  footerText: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  licenseType: string;
  billingCycle: string;
  priceCents: number;
  currency: string;
  maxUsers: number;
  features: string[];
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  methodType: string;
  provider: string;
  instructions: Record<string, string>;
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
};

export type AcademicContentItem = {
  id: string;
  title: string;
  kind: string;
  institution: string;
  topic: string;
  edition: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  ownerUserId: string | null;
  sourceReference: string;
  notes: string;
  createdAt: number;
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

export const professionalTypeLabels: Record<ProfessionalType, string> = {
  student: 'Aluno',
  teacher: 'Professor',
  education_professional: 'Profissional da educação',
};

export const educatorVerificationLabels: Record<EducatorVerificationStatus, string> = {
  not_requested: 'Não solicitada',
  pending: 'Em análise',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

export const educationLevels = [
  ['fundamental', 'Ensino fundamental'],
  ['medio', 'Ensino médio'],
  ['graduacao', 'Graduação'],
  ['pos_graduacao', 'Pós-graduação'],
  ['professor', 'Professor / educador'],
  ['outro', 'Outro'],
] as const;
