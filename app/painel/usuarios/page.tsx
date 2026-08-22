import UsersManager from './users-manager';
import { listUsers, requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function UsersManagementPage() {
  const { user } = await requirePageUser('/painel/usuarios', { roles: ['admin', 'manager'] });
  return (
    <UsersManager
      initialUsers={(await listUsers()).map(safeUser)}
      actorId={user.id}
      actorRole={user.role as 'admin' | 'manager'}
    />
  );
}
