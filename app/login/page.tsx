import { redirect } from 'next/navigation';
import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { getOrCreateUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const identity = await getChatGPTUser();
  if (identity) {
    const user = await getOrCreateUser(identity);
    if (user.status !== 'active') redirect(`/acesso?status=${user.status}`);
    redirect(user.profileComplete ? '/' : '/cadastro');
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <a className="auth-brand" href="/login"><span>φ</span><strong>Física <em>Resolvida</em></strong></a>
        <div className="auth-copy">
          <p className="eyebrow">ACESSO À PLATAFORMA</p>
          <h1>Seu acervo de Física, organizado para aprender e ensinar.</h1>
          <p>Questões oficiais do ITA e do IME, atividades, roteiros e ferramentas de gestão em um só lugar.</p>
          <div className="auth-stats"><span><b>625</b> questões</span><span><b>39</b> edições</span><span><b>2</b> instituições</span></div>
        </div>
      </section>
      <section className="login-card">
        <div className="secure-mark">✓</div>
        <p className="eyebrow">IDENTIDADE SEGURA</p>
        <h2>Entrar na Física Resolvida</h2>
        <p>Use sua conta ChatGPT para confirmar sua identidade. O sistema não armazena sua senha.</p>
        <a className="auth-cta" href={chatGPTSignInPath('/cadastro')}>Continuar com ChatGPT <span>→</span></a>
        <small>Na primeira entrada, você preencherá seu perfil obrigatório e poderá adicionar informações profissionais opcionais.</small>
        <div className="legal-links"><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></div>
      </section>
    </main>
  );
}
