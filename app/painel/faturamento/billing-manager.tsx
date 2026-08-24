'use client';

import { useState } from 'react';
import { roleLabels, statusLabels, type BillingPlan, type BillingProfile, type PaymentMethod } from '@/lib/user-types';

type BillingTab = 'profiles' | 'plans' | 'methods';

export default function BillingManager({
  initialProfiles,
  initialPlans,
  initialPaymentMethods,
}: {
  initialProfiles: (BillingProfile & { fullName: string; email: string; role: keyof typeof roleLabels; status: keyof typeof statusLabels })[];
  initialPlans: BillingPlan[];
  initialPaymentMethods: PaymentMethod[];
}) {
  const [tab, setTab] = useState<BillingTab>('profiles');
  const [plans, setPlans] = useState(initialPlans);
  const [methods, setMethods] = useState(initialPaymentMethods);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    payload.priceCents = String(Math.round(Number(payload.priceReais || 0) * 100));
    const url = editingPlan ? `/api/admin/billing/plans/${editingPlan.id}` : '/api/admin/billing/plans';
    const method = editingPlan ? 'PATCH' : 'POST';
    try {
      const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { plans?: BillingPlan[]; error?: string };
      if (!response.ok || !data.plans) throw new Error(data.error || 'Não foi possível salvar o plano.');
      setPlans(data.plans); setEditingPlan(null); setMessage('Plano/licença salvo com sucesso.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  async function saveMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const url = editingMethod ? `/api/admin/billing/payment-methods/${editingMethod.id}` : '/api/admin/billing/payment-methods';
    const method = editingMethod ? 'PATCH' : 'POST';
    try {
      const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { methods?: PaymentMethod[]; error?: string };
      if (!response.ok || !data.methods) throw new Error(data.error || 'Não foi possível salvar a forma de pagamento.');
      setMethods(data.methods); setEditingMethod(null); setMessage('Forma de pagamento salva com sucesso.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  async function remove(kind: 'plans' | 'payment-methods', id: string) {
    if (!confirm('Remover este registro da gestão?')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/billing/${kind}/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { plans?: BillingPlan[]; methods?: PaymentMethod[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível remover.');
      if (data.plans) setPlans(data.plans);
      if (data.methods) setMethods(data.methods);
      setMessage('Registro removido com sucesso.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading"><div><p className="eyebrow">GESTÃO FINANCEIRA</p><h1>Faturamento</h1><p>Cadastre perfis, tipos de licença e formas de pagamento para a cobrança futura.</p></div><span>{initialProfiles.length} perfis preenchidos</span></div>
      {message && <p className={`toast ${message.toLowerCase().includes('não') || message.toLowerCase().includes('erro') ? 'error' : 'success'}`}>{message}</p>}
      <div className="management-tabs"><button className={tab === 'profiles' ? 'active' : ''} onClick={() => setTab('profiles')}>Perfis de usuários</button><button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Licenças e planos</button><button className={tab === 'methods' ? 'active' : ''} onClick={() => setTab('methods')}>Formas de pagamento</button></div>
      <div className="billing-guardrail"><span>◎</span><div><strong>Cartões e transações não ficam nesta base.</strong><p>Esta área cadastra regras, identificadores e instruções. O pagamento real deve passar por provedor certificado quando as assinaturas forem ativadas.</p></div></div>
      {tab === 'profiles' && <section className="billing-admin-table"><header><span>USUÁRIO</span><span>DOCUMENTO</span><span>PLANO</span><span>STATUS</span></header>{initialProfiles.length ? initialProfiles.map((profile) => <article key={profile.userId}><div><strong>{profile.fullName}</strong><small>{profile.email} · {roleLabels[profile.role]}</small></div><span>{profile.documentType.toUpperCase()} · {maskDocument(profile.documentNumber)}</span><span>{profile.planCode}</span><span className={`state ${profile.status}`}>{statusLabels[profile.status]}</span></article>) : <div className="empty-state"><b>Sem perfis financeiros ainda</b><p>Os dados aparecerão quando os usuários preencherem a área de faturamento em “Minha conta”.</p></div>}</section>}
      {tab === 'plans' && <section className="admin-crud-grid"><div className="admin-list">{plans.map((plan) => <article key={plan.id}><div><strong>{plan.name}</strong><small>{plan.code} · {plan.licenseType} · {plan.billingCycle}</small><p>{money(plan.priceCents, plan.currency)} · até {plan.maxUsers} usuário(s)</p></div><span className={`state ${plan.status}`}>{plan.status}</span><button onClick={() => setEditingPlan(plan)}>Editar</button><button onClick={() => remove('plans', plan.id)} disabled={busy}>Remover</button></article>)}</div><form className="admin-create inline" key={editingPlan?.id ?? 'new-plan'} onSubmit={savePlan}><h2>{editingPlan ? 'Editar plano' : 'Novo plano/licença'}</h2><div className="admin-form-grid"><label>Código<input name="code" required defaultValue={editingPlan?.code ?? ''} /></label><label>Nome<input name="name" required defaultValue={editingPlan?.name ?? ''} /></label><label>Tipo de licença<select name="licenseType" defaultValue={editingPlan?.licenseType ?? 'individual'}><option value="individual">Individual</option><option value="school">Escola</option><option value="team">Equipe</option></select></label><label>Ciclo<select name="billingCycle" defaultValue={editingPlan?.billingCycle ?? 'monthly'}><option value="monthly">Mensal</option><option value="annual">Anual</option><option value="lifetime">Vitalício</option></select></label><label>Preço em R$<input name="priceReais" type="number" min="0" step="0.01" defaultValue={editingPlan ? editingPlan.priceCents / 100 : 0} /></label><label>Moeda<input name="currency" defaultValue={editingPlan?.currency ?? 'BRL'} /></label><label>Máx. usuários<input name="maxUsers" type="number" min="1" defaultValue={editingPlan?.maxUsers ?? 1} /></label><label>Status<select name="status" defaultValue={editingPlan?.status ?? 'active'}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label><label className="wide">Recursos<textarea name="features" rows={4} defaultValue={editingPlan?.features.join('\n') ?? ''} placeholder="Um recurso por linha" /></label></div><footer>{editingPlan && <button type="button" onClick={() => setEditingPlan(null)}>Cancelar</button>}<button className="primary" disabled={busy}>Salvar plano</button></footer></form></section>}
      {tab === 'methods' && <section className="admin-crud-grid"><div className="admin-list">{methods.map((method) => <article key={method.id}><div><strong>{method.name}</strong><small>{method.methodType} · {method.provider}</small><p>{method.instructions.label || 'Sem instruções públicas'}</p></div><span className={`state ${method.status}`}>{method.status}</span><button onClick={() => setEditingMethod(method)}>Editar</button><button onClick={() => remove('payment-methods', method.id)} disabled={busy}>Remover</button></article>)}</div><form className="admin-create inline" key={editingMethod?.id ?? 'new-method'} onSubmit={saveMethod}><h2>{editingMethod ? 'Editar pagamento' : 'Nova forma de pagamento'}</h2><div className="admin-form-grid"><label>Nome<input name="name" required defaultValue={editingMethod?.name ?? ''} /></label><label>Tipo<select name="methodType" defaultValue={editingMethod?.methodType ?? 'pix'}><option value="pix">PIX</option><option value="card">Cartão</option><option value="boleto">Boleto</option><option value="manual">Manual</option></select></label><label>Provedor<input name="provider" defaultValue={editingMethod?.provider ?? 'manual'} /></label><label>Status<select name="status" defaultValue={editingMethod?.status ?? 'active'}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label><label>Rótulo da instrução<input name="instructionsLabel" defaultValue={editingMethod?.instructions.label ?? ''} placeholder="Ex.: Chave PIX" /></label><label>Valor/instrução<input name="instructionsValue" defaultValue={editingMethod?.instructions.value ?? ''} /></label><label className="wide">Observações<textarea name="instructionsNotes" rows={4} defaultValue={editingMethod?.instructions.notes ?? ''} /></label></div><footer>{editingMethod && <button type="button" onClick={() => setEditingMethod(null)}>Cancelar</button>}<button className="primary" disabled={busy}>Salvar forma</button></footer></form></section>}
    </main>
  );
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

function maskDocument(value: string) {
  if (!value) return 'Não informado';
  const clean = value.replace(/\s/g, '');
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}
