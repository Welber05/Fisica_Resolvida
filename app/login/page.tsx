import { chatGPTSignInPath } from '@/app/chatgpt-auth';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
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
        <p>Entre com o e-mail e a senha cadastrados no painel de gestão.</p>
        <LoginForm />
        <div className="login-divider"><span>ou</span></div>
        <a className="auth-cta secondary" href={chatGPTSignInPath('/cadastro')}>Continuar com ChatGPT <span>→</span></a>
        <small>Na primeira entrada, você preencherá seu perfil obrigatório e poderá adicionar informações profissionais opcionais.</small>
        <div className="legal-links"><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></div>
      </section>
    </main>
  );
}
