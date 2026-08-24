'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  educatorVerificationLabels,
  educationLevels,
  professionalTypeLabels,
  roleLabels,
  statusLabels,
  type BillingProfile,
  type SafeUser,
  type TeacherSchool,
} from '@/lib/user-types';

type Tab = 'perfil' | 'faturamento' | 'escolas';

export default function AccountClient({
  initialUser,
  initialBilling,
  initialSchools,
  signOutPath,
}: {
  initialUser: SafeUser;
  initialBilling: BillingProfile;
  initialSchools: TeacherSchool[];
  signOutPath: string;
}) {
  const [tab, setTab] = useState<Tab>('perfil');
  const [user, setUser] = useState(initialUser);
  const [billing, setBilling] = useState(initialBilling);
  const [schools, setSchools] = useState(initialSchools);
  const [editingSchool, setEditingSchool] = useState<TeacherSchool | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const canCustomizeDocuments = user.role === 'professor' || user.role === 'manager' || user.role === 'admin';

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = profilePayload(form, user.email);
    try {
      const response = await fetch('/api/me', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { user?: SafeUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || 'Não foi possível salvar o perfil.');
      setUser(data.user);
      const avatar = form.get('avatar');
      if (avatar instanceof File && avatar.size > 0) {
        const upload = new FormData(); upload.set('avatar', avatar);
        const avatarResponse = await fetch('/api/me/avatar', { method: 'POST', body: upload });
        const avatarData = (await avatarResponse.json()) as { avatarUrl?: string; error?: string };
        if (!avatarResponse.ok) throw new Error(avatarData.error || 'Perfil salvo, mas a imagem falhou.');
        if (avatarData.avatarUrl) setUser((current) => ({ ...current, avatarUrl: `${avatarData.avatarUrl}?v=${Date.now()}` }));
      }
      setMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  async function saveBilling(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/billing', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { billing?: BillingProfile; error?: string };
      if (!response.ok || !data.billing) throw new Error(data.error || 'Não foi possível salvar o faturamento.');
      setBilling(data.billing); setMessage('Informações de faturamento atualizadas.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  async function saveSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    if (editingSchool) form.set('id', editingSchool.id);
    try {
      const response = await fetch('/api/schools', { method: 'POST', body: form });
      const data = (await response.json()) as { schools?: TeacherSchool[]; error?: string };
      if (!response.ok || !data.schools) throw new Error(data.error || 'Não foi possível salvar a escola.');
      setSchools(data.schools); setEditingSchool(null); event.currentTarget.reset();
      setMessage('Escola e modelo de documento atualizados com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  async function activateSchool(id: string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/schools/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isActive: true }),
      });
      const data = (await response.json()) as { schools?: TeacherSchool[]; error?: string };
      if (!response.ok || !data.schools) throw new Error(data.error || 'Não foi possível ativar a escola.');
      setSchools(data.schools); setMessage('Escola ativa definida com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  async function deleteSchool(id: string) {
    if (!confirm('Remover esta escola e sua logomarca?')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { schools?: TeacherSchool[]; error?: string };
      if (!response.ok || !data.schools) throw new Error(data.error || 'Não foi possível remover a escola.');
      setSchools(data.schools); if (editingSchool?.id === id) setEditingSchool(null);
      setMessage('Escola removida com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  const initials = (user.fullName || user.email).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <main className="account-page">
      <aside className="account-sidebar">
        <Link className="auth-brand light" href="/"><span>φ</span><strong>Física <em>Resolvida</em></strong></Link>
        <div className="account-person">
          <div className="avatar large">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</div>
          <strong>{user.fullName}</strong><span>{user.email}</span>
          <small>{roleLabels[user.role]} · {statusLabels[user.status]}</small>
        </div>
        <nav className="account-nav">
          <button className={tab === 'perfil' ? 'active' : ''} onClick={() => { setTab('perfil'); setMessage(''); }}>Perfil e endereço</button>
          <button className={tab === 'faturamento' ? 'active' : ''} onClick={() => { setTab('faturamento'); setMessage(''); }}>Faturamento</button>
          {canCustomizeDocuments && <button className={tab === 'escolas' ? 'active' : ''} onClick={() => { setTab('escolas'); setMessage(''); }}>Escolas e documentos</button>}
          {user.role !== 'user' && <Link href="/painel">Painel de gestão</Link>}
          <Link href="/">Banco de questões</Link>
          <Link href="/ajuda">Guia de uso</Link>
        </nav>
        <a className="signout" href={signOutPath}>Sair da conta</a>
      </aside>
      <section className="account-content">
        {tab === 'perfil' ? (
          <form className="settings-card" onSubmit={saveProfile}>
            <header><div><p className="eyebrow">MINHA CONTA</p><h1>Perfil e endereço</h1><p>Atualize seus dados pessoais e acadêmicos.</p></div><button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button></header>
            <div className="avatar-upload"><div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</div><label>Nova imagem<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPEG, PNG ou WebP · máximo 2 MB</small></label></div>
            <div className="section-title"><b>Dados essenciais</b><span>Obrigatórios</span></div>
            <div className="account-grid">
              <label className="wide">Nome completo<input name="fullName" required defaultValue={user.fullName} /></label>
              <label>E-mail<input value={user.email} readOnly /></label>
              <label>Telefone<input name="phone" required defaultValue={user.phone} /></label>
              <label className="wide">Nível escolar<select name="educationLevel" required defaultValue={user.educationLevel}>{educationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <div className="section-title"><b>Classificação profissional</b><span>{educatorVerificationLabels[user.educatorVerificationStatus]}</span></div>
            <div className="professional-note"><span>✓</span><p>Professores e profissionais da educação podem solicitar validação. E-mail institucional, número funcional e CPF ajudam a comprovar o vínculo, mas a liberação da personalização continua passando por aprovação/gestão.</p></div>
            <div className="account-grid">
              <label>Tipo de perfil<select name="professionalType" defaultValue={user.professionalType}>
                {Object.entries(professionalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label>E-mail institucional<input name="institutionalEmail" type="email" defaultValue={user.institutionalEmail ?? ''} /></label>
              <label>Número funcional<input name="functionalId" defaultValue={user.functionalId ?? ''} /></label>
              <label>CPF para validação<input name="cpf" inputMode="numeric" autoComplete="off" defaultValue={user.cpf ?? ''} /></label>
            </div>
            <div className="section-title"><b>Endereço</b><span>Obrigatório</span></div>
            <div className="account-grid">
              <label>CEP<input name="addressPostalCode" required defaultValue={user.address.postalCode} /></label><label>País<input name="addressCountry" required defaultValue={user.address.country} /></label>
              <label className="wide">Logradouro<input name="addressStreet" required defaultValue={user.address.street} /></label><label>Número<input name="addressNumber" required defaultValue={user.address.number} /></label><label>Complemento<input name="addressComplement" defaultValue={user.address.complement} /></label>
              <label>Bairro<input name="addressNeighborhood" defaultValue={user.address.neighborhood} /></label><label>Cidade<input name="addressCity" required defaultValue={user.address.city} /></label><label>Estado<input name="addressState" required defaultValue={user.address.state} /></label>
            </div>
            <div className="section-title"><b>Perfil acadêmico e redes</b><span>Opcional</span></div>
            <div className="account-grid">
              <label>Currículo Lattes<input name="lattesUrl" type="url" defaultValue={user.lattesUrl ?? ''} /></label><label>ORCID<input name="orcid" defaultValue={user.orcid ?? ''} /></label>
              {(['instagram', 'youtube', 'linkedin', 'facebook', 'x'] as const).map((network) => <label key={network}>{network === 'x' ? 'X / Twitter' : network[0].toUpperCase() + network.slice(1)}<input name={network} type="url" defaultValue={user.socialLinks[network] ?? ''} /></label>)}
            </div>
          </form>
        ) : tab === 'faturamento' ? (
          <form className="settings-card" onSubmit={saveBilling}>
            <header><div><p className="eyebrow">ÁREA DEDICADA</p><h1>Faturamento</h1><p>Dados preparados para a futura contratação de planos.</p></div><button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar faturamento'}</button></header>
            <div className="billing-notice"><span>◉</span><div><strong>Nenhum cartão é armazenado.</strong><p>Quando as assinaturas forem ativadas, o pagamento ocorrerá no ambiente seguro do provedor.</p></div></div>
            <div className="plan-strip"><div><small>PLANO ATUAL</small><strong>{billing.planCode === 'gratuito' ? 'Acesso gratuito' : billing.planCode}</strong></div><span>{billing.subscriptionStatus.replaceAll('_', ' ')}</span></div>
            <div className="section-title"><b>Identificação para cobrança</b><span>Cadastro financeiro</span></div>
            <div className="account-grid">
              <label>Tipo de pagador<select name="payerType" defaultValue={billing.payerType}><option value="individual">Pessoa física</option><option value="company">Empresa</option></select></label>
              <label>Tipo de documento<select name="documentType" defaultValue={billing.documentType}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="other">Outro</option></select></label>
              <label className="wide">Nome / razão social<input name="legalName" required defaultValue={billing.legalName || user.fullName} /></label>
              <label>Documento<input name="documentNumber" defaultValue={billing.documentNumber} autoComplete="off" /></label><label>Nome da empresa<input name="companyName" defaultValue={billing.companyName} /></label>
              <label>E-mail de cobrança<input name="billingEmail" type="email" required defaultValue={billing.billingEmail || user.email} /></label><label>Telefone de cobrança<input name="billingPhone" required defaultValue={billing.billingPhone || user.phone} /></label>
            </div>
            <div className="section-title"><b>Endereço de cobrança</b><span>Pode ser diferente do perfil</span></div>
            <div className="account-grid">
              <label>CEP<input name="postalCode" required defaultValue={billing.postalCode || user.address.postalCode} /></label><label>País<input name="country" required defaultValue={billing.country || user.address.country} /></label>
              <label className="wide">Logradouro<input name="street" required defaultValue={billing.street || user.address.street} /></label><label>Número<input name="number" required defaultValue={billing.number || user.address.number} /></label><label>Complemento<input name="complement" defaultValue={billing.complement || user.address.complement} /></label>
              <label>Bairro<input name="neighborhood" defaultValue={billing.neighborhood || user.address.neighborhood} /></label><label>Cidade<input name="city" required defaultValue={billing.city || user.address.city} /></label><label>Estado<input name="state" required defaultValue={billing.state || user.address.state} /></label>
            </div>
          </form>
        ) : (
          <div className="settings-card">
            <header>
              <div><p className="eyebrow">DOCUMENTOS PERSONALIZADOS</p><h1>Escolas e modelos</h1><p>Cadastre as instituições em que você trabalha e defina cabeçalho, rodapé e logomarca para provas e roteiros.</p></div>
            </header>
            <div className="school-list">
              {schools.length === 0 ? (
                <p className="empty-note">Nenhuma escola cadastrada ainda. Crie a primeira para ativar o cabeçalho personalizado nos geradores.</p>
              ) : schools.map((school) => (
                <article className={`school-card ${school.isActive ? 'active' : ''}`} key={school.id}>
                  <div className="school-logo">{school.logoUrl ? <img src={school.logoUrl} alt="" /> : '🏫'}</div>
                  <div>
                    <strong>{school.name}</strong>
                    <span>{[school.city, school.state].filter(Boolean).join(' / ') || 'Local não informado'}</span>
                    <small>{school.headerTitle} · {school.headerSubtitle}</small>
                    {school.footerText && <small>Rodapé: {school.footerText}</small>}
                  </div>
                  <div className="school-actions">
                    {school.isActive ? <b>Ativa</b> : <button type="button" onClick={() => activateSchool(school.id)} disabled={busy}>Usar</button>}
                    <button type="button" onClick={() => setEditingSchool(school)} disabled={busy}>Editar</button>
                    <button type="button" onClick={() => deleteSchool(school.id)} disabled={busy}>Remover</button>
                  </div>
                </article>
              ))}
            </div>
            <form className="school-form" key={editingSchool?.id ?? 'new-school'} onSubmit={saveSchool}>
              <div className="section-title"><b>{editingSchool ? 'Editar escola' : 'Nova escola'}</b><span>{editingSchool ? 'Atualizando modelo' : 'Modelo de prova/roteiro'}</span></div>
              <div className="account-grid">
                <label className="wide">Nome da escola<input name="name" required defaultValue={editingSchool?.name ?? ''} /></label>
                <label>Cidade<input name="city" defaultValue={editingSchool?.city ?? ''} /></label>
                <label>Estado / UF<input name="state" defaultValue={editingSchool?.state ?? ''} /></label>
                <label>E-mail institucional usado nessa escola<input name="institutionalEmail" type="email" defaultValue={editingSchool?.institutionalEmail ?? user.institutionalEmail ?? ''} /></label>
                <label>Número funcional nessa escola<input name="functionalId" defaultValue={editingSchool?.functionalId ?? user.functionalId ?? ''} /></label>
                <label className="wide">Logomarca<input name="logo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPEG, PNG ou WebP · máximo 2 MB</small></label>
              </div>
              <div className="section-title"><b>Cabeçalho e rodapé</b><span>Aplicado aos geradores</span></div>
              <div className="account-grid">
                <label>Título do cabeçalho<input name="headerTitle" required defaultValue={editingSchool?.headerTitle ?? 'Lista de Exercícios'} /></label>
                <label>Subtítulo<input name="headerSubtitle" required defaultValue={editingSchool?.headerSubtitle ?? 'Física'} /></label>
                <label className="wide">Rodapé<textarea name="footerText" rows={3} defaultValue={editingSchool?.footerText ?? ''} placeholder="Ex.: Bons estudos! Material preparado pelo Prof. Welber." /></label>
                <label className="checkline"><input name="isActive" type="checkbox" defaultChecked={editingSchool?.isActive ?? schools.length === 0} /> Usar como escola ativa</label>
              </div>
              <div className="form-actions">
                {editingSchool && <button type="button" onClick={() => setEditingSchool(null)} disabled={busy}>Cancelar edição</button>}
                <button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar escola'}</button>
              </div>
            </form>
          </div>
        )}
        {message && <p className={`toast ${message.includes('sucesso') || message.includes('atualizadas') ? 'success' : 'error'}`}>{message}</p>}
      </section>
    </main>
  );
}

function profilePayload(form: FormData, email: string) {
  return {
    fullName: form.get('fullName'), email, phone: form.get('phone'), educationLevel: form.get('educationLevel'),
    professionalType: form.get('professionalType'),
    institutionalEmail: form.get('institutionalEmail'),
    functionalId: form.get('functionalId'),
    cpf: form.get('cpf'),
    addressPostalCode: form.get('addressPostalCode'), addressStreet: form.get('addressStreet'), addressNumber: form.get('addressNumber'), addressComplement: form.get('addressComplement'), addressNeighborhood: form.get('addressNeighborhood'), addressCity: form.get('addressCity'), addressState: form.get('addressState'), addressCountry: form.get('addressCountry'),
    lattesUrl: form.get('lattesUrl'), orcid: form.get('orcid'),
    socialLinks: { instagram: form.get('instagram'), youtube: form.get('youtube'), linkedin: form.get('linkedin'), facebook: form.get('facebook'), x: form.get('x') },
  };
}
