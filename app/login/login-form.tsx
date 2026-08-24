'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const data = (await response.json()) as { returnTo?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      window.location.assign(data.returnTo || '/acervo');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
      setBusy(false);
    }
  }

  return (
    <form className="email-login-form" onSubmit={submit}>
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" />
      </label>
      <label>
        Senha
        <input name="password" type="password" required minLength={8} autoComplete="current-password" placeholder="••••••••" />
      </label>
      {message && <p className="form-message error">{message}</p>}
      <button className="auth-cta" disabled={busy}>
        {busy ? 'Entrando...' : 'Entrar com e-mail e senha'} <span>→</span>
      </button>
    </form>
  );
}
