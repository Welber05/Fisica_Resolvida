'use client';

import { useMemo, useState } from 'react';
import {
  educatorVerificationLabels,
  educationLevels,
  professionalTypeLabels,
  roleLabels,
  statusLabels,
  type AppRole,
  type SafeUser,
} from '@/lib/user-types';

export default function UsersManager({
  initialUsers,
  actorId,
  actorRole,
}: {
  initialUsers: SafeUser[];
  actorId: string;
  actorRole: 'admin' | 'manager';
}) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState(initialUsers[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const filtered = useMemo(() => users.filter((user) => {
    const haystack = `${user.fullName} ${user.email} ${user.phone}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (statusFilter === 'all' || user.status === statusFilter);
  }), [users, query, roleFilter, statusFilter]);
  const allowedRoles: AppRole[] = actorRole === 'admin'
    ? ['user', 'professor', 'manager', 'admin']
    : ['user', 'professor'];

  async function refresh(preferredId?: string) {
    const response = await fetch('/api/admin/users');
    const data = (await response.json()) as { users?: SafeUser[]; error?: string };
    if (!response.ok || !data.users) throw new Error(data.error || 'Não foi possível atualizar a lista.');
    setUsers(data.users);
    const nextId = preferredId && data.users.some((user) => user.id === preferredId)
      ? preferredId
      : data.users[0]?.id ?? '';
    setSelectedId(nextId);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = personPayload(form);
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { user?: SafeUser; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar o cadastro.');
      await refresh(data.user?.id); setShowCreate(false); setMessage('Cadastro criado. Na primeira entrada, a pessoa confirmará os dados e a privacidade.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    await mutate(selected.id, { operation: 'profile', ...personPayload(new FormData(event.currentTarget)), email: selected.email }, 'Perfil atualizado.');
  }

  async function updateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    await mutate(selected.id, { operation: 'role', role: form.get('role') }, 'Papel atualizado.');
  }

  async function updateStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    await mutate(selected.id, { operation: 'status', status: form.get('status'), reason: form.get('reason'), suspendedUntil: form.get('suspendedUntil') }, 'Estado da conta atualizado.');
  }

  async function updateEducatorVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    await mutate(
      selected.id,
      { operation: 'educator-verification', educatorVerificationStatus: form.get('educatorVerificationStatus') },
      'Validação docente atualizada.',
    );
  }

  async function mutate(id: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a alteração.');
      await refresh(id); setMessage(success);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  async function removeUser() {
    if (!selected || !window.confirm(`Anonimizar e excluir o cadastro de ${selected.fullName}? Esta ação remove os dados pessoais.`)) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${selected.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível excluir o cadastro.');
      await refresh(); setMessage('Cadastro anonimizado e removido da listagem.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  const mayManageSelected = Boolean(selected && selected.accountType === 'human' && selected.id !== actorId && (actorRole === 'admin' || !['admin', 'manager'].includes(selected.role)));

  return (
    <main className="dashboard-page users-page">
      <div className="dashboard-heading"><div><p className="eyebrow">CADASTROS E PERMISSÕES</p><h1>Usuários e equipe</h1><p>CRUD, papéis e controle de acesso com registro de auditoria.</p></div><button className="primary" onClick={() => setShowCreate((value) => !value)}>＋ Novo cadastro</button></div>
      {message && <p className={`toast ${message.toLowerCase().includes('não') || message.toLowerCase().includes('erro') ? 'error' : 'success'}`}>{message}</p>}
      {showCreate && <form className="admin-create" onSubmit={createUser} noValidate>
        <header><div><p className="eyebrow">CADASTRO PELO PAINEL</p><h2>Adicionar usuário ou membro da equipe</h2><p>O e-mail será usado para vincular a identidade ChatGPT no primeiro acesso.</p></div><button type="button" onClick={() => setShowCreate(false)}>×</button></header>
        <PersonFields allowedRoles={allowedRoles} includeRole />
        <footer><button type="button" onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Criar cadastro'}</button></footer>
      </form>}
      <section className="users-workspace">
        <div className="users-list">
          <div className="users-tools"><input aria-label="Buscar usuários" placeholder="Buscar por nome, e-mail ou telefone" value={query} onChange={(event) => setQuery(event.target.value)} /><div><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Todos os papéis</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
          <div className="users-count">{filtered.length} de {users.length} cadastros</div>
          {filtered.map((user) => <button key={user.id} className={selectedId === user.id ? 'user-row active' : 'user-row'} onClick={() => { setSelectedId(user.id); setMessage(''); }}><div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user)}</div><div><strong>{user.fullName || 'Cadastro pendente'}</strong><span>{user.email}</span></div><small className={`role ${user.role}`}>{user.accountType === 'system' ? 'Técnica' : roleLabels[user.role]}</small><small className={`state ${user.status}`}>{user.accountType === 'system' ? 'Sem login' : statusLabels[user.status]}</small></button>)}
        </div>
        <div className="user-detail">
          {selected ? <>
            <header><div className="avatar large">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" /> : initials(selected)}</div><div><p className="eyebrow">DETALHES DO CADASTRO</p><h2>{selected.fullName || 'Cadastro pendente'}</h2><span>{selected.email}</span></div></header>
            {selected.accountType === 'system' ? <div className="pending-banner">Ator técnico não autenticável. Identifica automações e implantações do Codex na auditoria.</div> : !selected.profileComplete && <div className="pending-banner">Aguardando confirmação dos dados e aceite de privacidade no primeiro login.</div>}
            <div className="user-facts"><span><small>PAPEL</small><b>{roleLabels[selected.role]}</b></span><span><small>ESTADO</small><b>{statusLabels[selected.status]}</b></span><span><small>VALIDAÇÃO DOCENTE</small><b>{educatorVerificationLabels[selected.educatorVerificationStatus]}</b></span><span><small>CLASSIFICAÇÃO</small><b>{professionalTypeLabels[selected.professionalType]}</b></span><span><small>TELEFONE</small><b>{selected.phone || '—'}</b></span><span><small>NÍVEL</small><b>{educationLevels.find(([value]) => value === selected.educationLevel)?.[1] || '—'}</b></span></div>
            {mayManageSelected ? <>
              <form className="compact-action" key={`role-${selected.id}-${selected.role}`} onSubmit={updateRole}><label>Papel de acesso<select name="role" defaultValue={selected.role}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><button disabled={busy}>Aplicar papel</button></form>
              <form className="compact-action" key={`educator-${selected.id}-${selected.educatorVerificationStatus}`} onSubmit={updateEducatorVerification}><label>Validação docente<select name="educatorVerificationStatus" defaultValue={selected.educatorVerificationStatus}>{Object.entries(educatorVerificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button disabled={busy}>Aplicar validação</button></form>
              <form className="compact-action status-action" key={`status-${selected.id}-${selected.status}`} onSubmit={updateStatus}><label>Estado<select name="status" defaultValue={selected.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Motivo<input name="reason" required minLength={5} placeholder="Justificativa obrigatória" /></label><label>Término da suspensão<input name="suspendedUntil" type="datetime-local" /></label><button disabled={busy}>Atualizar acesso</button></form>
              <details className="edit-details"><summary>Editar dados cadastrais</summary><form key={`profile-${selected.id}`} onSubmit={updateProfile} noValidate><PersonFields user={selected} /><footer><button className="primary" disabled={busy}>Salvar dados</button></footer></form></details>
              <div className="danger-zone"><div><strong>Excluir e anonimizar</strong><p>Remove dados pessoais e faturamento, mantendo apenas a trilha mínima de auditoria.</p></div><button type="button" onClick={removeUser} disabled={busy}>Excluir cadastro</button></div>
            </> : <p className="empty-note">Seu próprio papel e estado, bem como contas hierarquicamente superiores, não podem ser alterados nesta tela.</p>}
          </> : <div className="empty-state"><b>Selecione um cadastro</b><p>Os detalhes e controles aparecerão aqui.</p></div>}
        </div>
      </section>
    </main>
  );
}

function PersonFields({ user, allowedRoles, includeRole = false }: { user?: SafeUser; allowedRoles?: AppRole[]; includeRole?: boolean }) {
  return <div className="admin-form-grid">
    <div className="form-section-title">Dados obrigatórios</div>
    <label>Nome completo <small>obrigatório</small><input name="fullName" required minLength={3} defaultValue={user?.fullName} /></label><label>E-mail <small>obrigatório</small><input name="email" type="email" required defaultValue={user?.email} readOnly={Boolean(user)} /></label><label>Telefone com DDD <small>obrigatório</small><input name="phone" required defaultValue={user?.phone} /></label>
    <label>Nível escolar <small>obrigatório</small><select name="educationLevel" required defaultValue={user?.educationLevel || ''}><option value="">Selecione...</option>{educationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {includeRole && <label>Papel de acesso <small>obrigatório</small><select name="role" required defaultValue="user">{allowedRoles?.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>}
    <div className="form-section-title">Endereço e dados opcionais</div>
    <label>CEP <small>opcional no painel</small><input name="addressPostalCode" defaultValue={user?.address.postalCode} /></label><label className="wide">Logradouro <small>opcional no painel</small><input name="addressStreet" defaultValue={user?.address.street} /></label><label>Número <small>opcional no painel</small><input name="addressNumber" defaultValue={user?.address.number} /></label><label>Cidade <small>opcional no painel</small><input name="addressCity" defaultValue={user?.address.city} /></label><label>Estado <small>opcional no painel</small><input name="addressState" defaultValue={user?.address.state} /></label><label>País <small>opcional no painel</small><input name="addressCountry" defaultValue={user?.address.country || 'Brasil'} /></label>
    <label>Classificação profissional <small>opcional</small><select name="professionalType" defaultValue={user?.professionalType || 'student'}>{Object.entries(professionalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>E-mail institucional <small>opcional</small><input name="institutionalEmail" type="email" defaultValue={user?.institutionalEmail ?? ''} /></label><label>Número funcional <small>opcional</small><input name="functionalId" defaultValue={user?.functionalId ?? ''} /></label><label>CPF para validação <small>opcional</small><input name="cpf" inputMode="numeric" autoComplete="off" defaultValue={user?.cpf ?? ''} /></label>
    <label>Complemento <small>opcional</small><input name="addressComplement" defaultValue={user?.address.complement} /></label><label>Bairro <small>opcional</small><input name="addressNeighborhood" defaultValue={user?.address.neighborhood} /></label>
    <label>Lattes <small>opcional</small><input name="lattesUrl" placeholder="lattes.cnpq.br/..." defaultValue={user?.lattesUrl ?? ''} /></label><label>ORCID <small>opcional</small><input name="orcid" defaultValue={user?.orcid ?? ''} /></label>
    <label>Instagram <small>opcional</small><input name="instagram" placeholder="instagram.com/..." defaultValue={user?.socialLinks.instagram ?? ''} /></label><label>YouTube <small>opcional</small><input name="youtube" placeholder="youtube.com/..." defaultValue={user?.socialLinks.youtube ?? ''} /></label><label>LinkedIn <small>opcional</small><input name="linkedin" placeholder="linkedin.com/in/..." defaultValue={user?.socialLinks.linkedin ?? ''} /></label><label>Facebook <small>opcional</small><input name="facebook" placeholder="facebook.com/..." defaultValue={user?.socialLinks.facebook ?? ''} /></label><label>X / Twitter <small>opcional</small><input name="x" placeholder="x.com/..." defaultValue={user?.socialLinks.x ?? ''} /></label>
  </div>;
}

function personPayload(form: FormData) {
  return { fullName: form.get('fullName'), email: form.get('email'), phone: form.get('phone'), educationLevel: form.get('educationLevel'), role: form.get('role'), professionalType: form.get('professionalType'), institutionalEmail: form.get('institutionalEmail'), functionalId: form.get('functionalId'), cpf: form.get('cpf'), addressPostalCode: form.get('addressPostalCode'), addressStreet: form.get('addressStreet'), addressNumber: form.get('addressNumber'), addressComplement: form.get('addressComplement'), addressNeighborhood: form.get('addressNeighborhood'), addressCity: form.get('addressCity'), addressState: form.get('addressState'), addressCountry: form.get('addressCountry'), lattesUrl: form.get('lattesUrl'), orcid: form.get('orcid'), socialLinks: { instagram: form.get('instagram'), youtube: form.get('youtube'), linkedin: form.get('linkedin'), facebook: form.get('facebook'), x: form.get('x') } };
}

function initials(user: SafeUser) {
  return (user.fullName || user.email).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
