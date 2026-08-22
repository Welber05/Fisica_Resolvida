import { redirect } from 'next/navigation';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { requirePageUser } from '@/lib/user-service';
import { statusLabels } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function AccessStatusPage() {
  const { user } = await requirePageUser('/acesso', {
    allowIncomplete: true,
    allowRestricted: true,
  });
  if (user.status === 'active') redirect(user.profileComplete ? '/' : '/cadastro');
  return (
    <main className="status-page">
      <section className="status-card">
        <span className={`status-symbol ${user.status}`}>!</span>
        <p className="eyebrow">ESTADO DA CONTA</p>
        <h1>Seu acesso está {statusLabels[user.status].toLowerCase()}.</h1>
        <p>{user.statusReason || 'Procure a administração da plataforma para obter mais informações.'}</p>
        {user.status === 'suspended' && user.suspendedUntil && <strong>Previsão de liberação: {new Date(user.suspendedUntil).toLocaleString('pt-BR')}</strong>}
        <a className="auth-cta" href={chatGPTSignOutPath('/login')}>Sair desta conta</a>
      </section>
    </main>
  );
}
