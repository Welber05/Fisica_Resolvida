import InvitesManager from './invites-manager';
import { listAccessInvites, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  const { user } = await requirePageUser('/painel/convites', { roles: ['admin', 'manager'] });
  let invites = [];
  try { invites = await listAccessInvites(); } catch (error) { console.warn('Convites indisponíveis para leitura:', error); }
  return <InvitesManager initialInvites={invites} actorRole={user.role as 'admin' | 'manager'} />;
}
