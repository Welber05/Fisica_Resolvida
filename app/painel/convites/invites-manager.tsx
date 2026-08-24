'use client';

import { useMemo, useState } from 'react';
import {
  professionalTypeLabels,
  roleDescriptions,
  roleLabels,
  type AccessInvite,
  type AccessInviteStatus,
  type AppRole,
} from '@/lib/user-types';

const statusLabels: Record<AccessInviteStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  expired: 'Expirado',
  exhausted: 'Esgotado',
};

export default function InvitesManager({
  initialInvites,
  actorRole,
}: {
  initialInvites: AccessInvite[];
  actorRole: 'admin' | 'manager';
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [selectedId, setSelectedId] = useState(initialInvites[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = invites.find((invite) => invite.id === selectedId) ?? invites[0] ?? null;
  const allowedRoles: AppRole[] = actorRole === 'admin'
    ? ['user', 'professor', 'manager', 'admin']
    : ['user', 'professor'];
  const filtered = useMemo(
    () =>
      invites.filter((invite) =>
        `${invite.code} ${invite.email} ${invite.role} ${invite.licenseType} ${invite.notes}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [invites, query],
  );

  async function refresh(preferredId?: string, data?: { invites?: AccessInvite[] }) {
    const nextInvites = data?.invites ?? await fetchInvites();
    setInvites(nextInvites);
    setSelectedId(
      preferredId && nextInvites.some((invite) => invite.id === preferredId)
        ? preferredId
        : nextInvites[0]?.id ?? '',
    );
  }

  async function fetchInvites() {
    const response = await fetch('/api/admin/invites');
    const data = (await response.json()) as { invites?: AccessInvite[]; error?: string };
    if (!response.ok || !data.invites) throw new Error(data.error || 'Não foi possível atualizar convites.');
    return data.invites;
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit('/api/admin/invites', 'POST', invitePayload(new FormData(event.currentTarget)), 'Convite criado.');
    event.currentTarget.reset();
  }

  async function updateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await submit(`/api/admin/invites/${selected.id}`, 'PATCH', { operation: 'details', ...invitePayload(new FormData(event.currentTarget)) }, 'Convite atualizado.', selected.id);
  }

  async function changeStatus(status: AccessInviteStatus) {
    if (!selected) return;
    await submit(`/api/admin/invites/${selected.id}`, 'PATCH', { operation: 'status', status }, 'Estado do convite atualizado.', selected.id);
  }

  async function removeInvite() {
    if (!selected || !window.confirm(`Excluir o convite ${selected.code}?`)) return;
    await submit(`/api/admin/invites/${selected.id}`, 'DELETE', {}, 'Convite excluído.');
  }

  async function submit(url: string, method: string, payload: Record<string, unknown>, success: string, preferredId?: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(url, {
        method,
        headers: method === 'DELETE' ? undefined : { 'content-type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(payload),
      });
      const data = (await response.json()) as { invites?: AccessInvite[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
      await refresh(preferredId, data);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">ACESSO CONTROLADO</p>
          <h1>Convites e códigos</h1>
          <p>Crie códigos para liberar cadastro e já definir o perfil de acesso da pessoa.</p>
        </div>
      </div>
      {message && <p className={`toast ${message.toLowerCase().includes('não') || message.toLowerCase().includes('erro') ? 'error' : 'success'}`}>{message}</p>}
      <section className="permission-grid">
        {allowedRoles.map((role) => (
          <article key={role}>
            <span>{roleLabels[role]}</span>
            <p>{roleDescriptions[role]}</p>
          </article>
        ))}
      </section>
      <section className="admin-crud-grid">
        <div>
          <form className="admin-create" onSubmit={createInvite}>
            <header>
              <div>
                <p className="eyebrow">NOVO CONVITE</p>
                <h2>Criar código de acesso</h2>
                <p>Deixe o e-mail em branco para um código geral ou informe um e-mail para convite individual.</p>
              </div>
            </header>
            <InviteFields allowedRoles={allowedRoles} />
            <footer><button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Criar convite'}</button></footer>
          </form>
          <div className="admin-list invite-list">
            <div className="users-tools"><input placeholder="Buscar código, e-mail, perfil ou licença" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            {filtered.map((invite) => (
              <article key={invite.id} className={invite.status !== 'active' ? 'muted-row' : ''}>
                <div>
                  <strong>{invite.code}</strong>
                  <p>{invite.email || 'Código geral'} · {roleLabels[invite.role]} · {invite.licenseType}</p>
                </div>
                <small className={`state ${invite.status === 'active' ? 'active' : 'inactive'}`}>{statusLabels[invite.status]}</small>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(invite.code); setMessage('Código copiado.'); }}>Copiar</button>
                <button type="button" onClick={() => setSelectedId(invite.id)}>Editar</button>
              </article>
            ))}
            {!filtered.length && <p className="empty-note">Nenhum convite encontrado.</p>}
          </div>
        </div>
        <aside className="admin-create inline invite-editor">
          {selected ? (
            <>
              <h2>Editar convite</h2>
              <p className="empty-note">Usado {selected.usedCount} de {selected.maxUses} vez(es). {selected.expiresAt ? `Expira em ${new Date(selected.expiresAt).toLocaleDateString('pt-BR')}.` : 'Sem prazo de expiração.'}</p>
              <form key={selected.id} onSubmit={updateInvite}>
                <InviteFields invite={selected} allowedRoles={allowedRoles} />
                <footer><button className="primary" disabled={busy}>Salvar alterações</button></footer>
              </form>
              <div className="school-actions invite-actions">
                <button disabled={busy} onClick={() => changeStatus(selected.status === 'active' ? 'inactive' : 'active')}>
                  {selected.status === 'active' ? 'Inativar' : 'Ativar'}
                </button>
                <button disabled={busy} onClick={removeInvite}>Excluir</button>
              </div>
            </>
          ) : (
            <div className="empty-state"><b>Selecione um convite</b><p>Os detalhes aparecerão aqui.</p></div>
          )}
        </aside>
      </section>
    </main>
  );
}

function InviteFields({ invite, allowedRoles }: { invite?: AccessInvite; allowedRoles: AppRole[] }) {
  const expiresValue = invite?.expiresAt ? new Date(invite.expiresAt).toISOString().slice(0, 10) : '';
  return (
    <div className="admin-form-grid">
      <label>Código<input name="code" defaultValue={invite?.code ?? ''} placeholder="Gerar automático se vazio" /></label>
      <label>E-mail vinculado<input name="email" type="email" defaultValue={invite?.email ?? ''} placeholder="opcional" /></label>
      <label>Perfil<select name="role" defaultValue={invite?.role ?? 'user'}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
      <label>Classificação<select name="professionalType" defaultValue={invite?.professionalType ?? 'student'}>
        {Object.entries(professionalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Tipo de licença<input name="licenseType" defaultValue={invite?.licenseType ?? 'gratuito'} placeholder="gratuito, mensal, escola..." /></label>
      <label>Limite de usos<input name="maxUses" type="number" min="1" max="500" defaultValue={invite?.maxUses ?? 1} /></label>
      <label>Validade<input name="expiresAt" type="date" defaultValue={expiresValue} /></label>
      <label className="wide">Observações<input name="notes" defaultValue={invite?.notes ?? ''} placeholder="Turma, escola, campanha ou regra interna" /></label>
    </div>
  );
}

function invitePayload(form: FormData) {
  return {
    code: form.get('code'),
    email: form.get('email'),
    role: form.get('role'),
    professionalType: form.get('professionalType'),
    licenseType: form.get('licenseType'),
    maxUses: form.get('maxUses'),
    expiresAt: form.get('expiresAt'),
    notes: form.get('notes'),
  };
}
