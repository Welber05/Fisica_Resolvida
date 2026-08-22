import { listBillingProfiles, requirePageUser } from '@/lib/user-service';
import { maskDocument } from '@/lib/validation';
import { roleLabels, statusLabels } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function BillingManagementPage() {
  await requirePageUser('/painel/faturamento', { roles: ['admin', 'manager'] });
  const profiles = await listBillingProfiles();
  return (
    <main className="dashboard-page">
      <div className="dashboard-heading"><div><p className="eyebrow">GESTÃO FINANCEIRA</p><h1>Perfis de faturamento</h1><p>Área preparada para planos e assinaturas futuras.</p></div><span>{profiles.length} perfis preenchidos</span></div>
      <div className="billing-guardrail"><span>◎</span><div><strong>Dados de pagamento não ficam nesta base.</strong><p>Cartões e transações serão processados por um provedor certificado. Aqui ficam somente os dados cadastrais e os identificadores da futura assinatura.</p></div></div>
      <section className="billing-admin-table">
        <header><span>USUÁRIO</span><span>DOCUMENTO</span><span>PLANO</span><span>STATUS</span></header>
        {profiles.length ? profiles.map((profile) => <article key={profile.userId}><div><strong>{profile.fullName}</strong><small>{profile.email} · {roleLabels[profile.role]}</small></div><span>{profile.documentType.toUpperCase()} · {maskDocument(profile.documentNumber)}</span><span>{profile.planCode}</span><span className={`state ${profile.status}`}>{statusLabels[profile.status]}</span></article>) : <div className="empty-state"><b>Sem perfis financeiros ainda</b><p>Os dados aparecerão quando os usuários preencherem a área de faturamento em “Minha conta”.</p></div>}
      </section>
    </main>
  );
}
