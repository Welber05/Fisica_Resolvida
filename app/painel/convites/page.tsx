import InvitesManager from './invites-manager';
import { listAccessInvites, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  const { user } = await requirePageUser('/painel/convites', { roles: ['admin', 'manager'] });
  return <InvitesManager initialInvites={await listAccessInvites()} actorRole={user.role as 'admin' | 'manager'} />;
}
