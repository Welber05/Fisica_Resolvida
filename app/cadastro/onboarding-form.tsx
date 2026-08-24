'use client';

import { useState } from 'react';
import { educationLevels, professionalTypeLabels, type SafeUser } from '@/lib/user-types';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal';

export default function OnboardingForm({ initialUser }: { initialUser: SafeUser }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: form.get('fullName'),
      email: initialUser.email,
      inviteCode: form.get('inviteCode'),
      phone: form.get('phone'),
      educationLevel: form.get('educationLevel'),
      professionalType: form.get('professionalType'),
      institutionalEmail: form.get('institutionalEmail'),
      functionalId: form.get('functionalId'),
      cpf: form.get('cpf'),
      addressPostalCode: form.get('addressPostalCode'),
      addressStreet: form.get('addressStreet'),
      addressNumber: form.get('addressNumber'),
      addressComplement: form.get('addressComplement'),
      addressNeighborhood: form.get('addressNeighborhood'),
      addressCity: form.get('addressCity'),
      addressState: form.get('addressState'),
      addressCountry: form.get('addressCountry'),
      lattesUrl: form.get('lattesUrl'),
      orcid: form.get('orcid'),
      socialLinks: {
        instagram: form.get('instagram'),
        youtube: form.get('youtube'),
        linkedin: form.get('linkedin'),
        facebook: form.get('facebook'),
        x: form.get('x'),
      },
      privacyAccepted: form.get('privacyAccepted') === 'on',
    };

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { user?: SafeUser; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o cadastro.');

      const avatar = form.get('avatar');
      if (avatar instanceof File && avatar.size > 0) {
        const upload = new FormData();
        upload.set('avatar', avatar);
        const avatarResponse = await fetch('/api/me/avatar', { method: 'POST', body: upload });
        const avatarData = (await avatarResponse.json()) as { error?: string };
        if (!avatarResponse.ok) throw new Error(avatarData.error || 'Cadastro salvo, mas a imagem não foi enviada.');
      }
      window.location.href = data.user && ['manager', 'admin'].includes(data.user.role) ? '/painel' : '/acervo';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ocorreu um erro inesperado.');
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <aside className="onboarding-side">
        <a className="auth-brand light" href="/login"><span>φ</span><strong>Física <em>Resolvida</em></strong></a>
        <div>
          <p className="eyebrow">PRIMEIRO ACESSO</p>
          <h1>Vamos preparar seu perfil.</h1>
          <p>Seus dados permitem personalizar o acesso, apoiar o atendimento e preparar o faturamento futuro.</p>
        </div>
        <ol>
          <li className={step === 1 ? 'active' : ''}><b>1</b><span>Dados essenciais<small>Identificação e contato</small></span></li>
          <li className={step === 2 ? 'active' : ''}><b>2</b><span>Endereço<small>Opcional</small></span></li>
          <li className={step === 3 ? 'active' : ''}><b>3</b><span>Perfil opcional<small>Trajetória e redes</small></span></li>
        </ol>
      </aside>
      <section className="onboarding-form-wrap">
        <form className="account-form" onSubmit={submit} noValidate>
          <header><span>Etapa {step} de 3</span><a href="/api/auth/logout">Sair</a></header>

          <div hidden={step !== 1} className="form-step">
            <p className="eyebrow">DADOS OBRIGATÓRIOS</p><h2>Informações pessoais</h2>
            <p>O e-mail vem da identidade usada no login e não pode ser alterado aqui.</p>
            <div className="account-grid">
              {initialUser.role === 'user' && !initialUser.profileComplete && (
                <label className="wide">Código de acesso
                  <input name="inviteCode" required placeholder="Ex.: FR-TURMA-2026" autoComplete="off" />
                  <small>Solicite o código ao administrador da plataforma. Ele define se seu perfil será aluno, professor, gerente ou administrador.</small>
                </label>
              )}
              <label className="wide">Nome completo<input name="fullName" required minLength={3} defaultValue={initialUser.fullName} /></label>
              <label>E-mail<input name="email" type="email" value={initialUser.email} readOnly /></label>
              <label>Telefone com DDD<input name="phone" required placeholder="(11) 99999-9999" defaultValue={initialUser.phone} /></label>
              <label className="wide">Nível escolar<select name="educationLevel" required defaultValue={initialUser.educationLevel}><option value="">Selecione...</option>{educationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Classificação profissional<input type="hidden" name="professionalTypeRequired" value="1" /><select name="professionalType" required defaultValue={initialUser.professionalType}>{Object.entries(professionalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>E-mail institucional<input name="institutionalEmail" type="email" defaultValue={initialUser.institutionalEmail ?? ''} /></label>
              <label>Número funcional<input name="functionalId" defaultValue={initialUser.functionalId ?? ''} /></label>
              <label>CPF para validação<input name="cpf" inputMode="numeric" autoComplete="off" defaultValue={initialUser.cpf ?? ''} /></label>
            </div>
          </div>

          <div hidden={step !== 2} className="form-step">
            <p className="eyebrow">ENDEREÇO OPCIONAL</p><h2>Onde você está</h2>
            <p>Você pode concluir o cadastro sem preencher endereço. Estes dados poderão ser informados depois em Minha conta.</p>
            <div className="account-grid">
              <label>CEP<input name="addressPostalCode" defaultValue={initialUser.address.postalCode} /></label>
              <label>País<input name="addressCountry" defaultValue={initialUser.address.country || 'Brasil'} /></label>
              <label className="wide">Logradouro<input name="addressStreet" defaultValue={initialUser.address.street} /></label>
              <label>Número<input name="addressNumber" defaultValue={initialUser.address.number} /></label>
              <label>Complemento<input name="addressComplement" defaultValue={initialUser.address.complement} /></label>
              <label>Bairro<input name="addressNeighborhood" defaultValue={initialUser.address.neighborhood} /></label>
              <label>Cidade<input name="addressCity" defaultValue={initialUser.address.city} /></label>
              <label>Estado<input name="addressState" defaultValue={initialUser.address.state} /></label>
            </div>
          </div>

          <div hidden={step !== 3} className="form-step">
            <p className="eyebrow">INFORMAÇÕES OPCIONAIS</p><h2>Perfil acadêmico e social</h2>
            <div className="account-grid">
              <label className="wide">Imagem de perfil <small>JPEG, PNG ou WebP · máximo 2 MB</small><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /></label>
              <label>Currículo Lattes<input name="lattesUrl" placeholder="lattes.cnpq.br/..." defaultValue={initialUser.lattesUrl ?? ''} /></label>
              <label>ORCID<input name="orcid" placeholder="0000-0000-0000-0000" defaultValue={initialUser.orcid ?? ''} /></label>
              {(['instagram', 'youtube', 'linkedin', 'facebook', 'x'] as const).map((network) => <label key={network}>{network === 'x' ? 'X / Twitter' : network[0].toUpperCase() + network.slice(1)}<input name={network} placeholder="https://" defaultValue={initialUser.socialLinks[network] ?? ''} /></label>)}
              <label className="consent wide"><input name="privacyAccepted" type="checkbox" required /><span>Declaro que as informações são verdadeiras, li e aceito os <a href="/termos" target="_blank">Termos de Uso</a> e o <a href="/privacidade" target="_blank">Aviso de Privacidade</a> (versão {LEGAL_DOCUMENT_VERSION}).</span></label>
            </div>
          </div>

          {message && <p className="form-message error">{message}</p>}
          <footer>
            {step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)}>← Voltar</button>}
            {step < 3 ? <button className="primary" type="button" onClick={() => setStep((current) => current + 1)}>Continuar →</button> : <button className="primary" disabled={busy}>{busy ? 'Salvando...' : 'Concluir cadastro'}</button>}
          </footer>
        </form>
      </section>
    </main>
  );
}
