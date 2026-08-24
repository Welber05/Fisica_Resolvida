import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="about-page">
      <header className="landing-top compact">
        <Link className="landing-brand" href="/">
          <span>φ</span>
          <strong>Física <em>Resolvida</em></strong>
        </Link>
        <nav aria-label="Navegação principal">
          <a href="mailto:welber05@gmail.com?subject=Contato%20-%20F%C3%ADsica%20Resolvida">Contato</a>
          <Link href="/login">Cadastrar / Login</Link>
        </nav>
      </header>
      <article className="about-card">
        <p className="eyebrow">QUEM SOMOS</p>
        <h1>Sobre a Física Resolvida</h1>
        <p>
          Este espaço foi criado para apresentar o projeto, sua história, seus objetivos
          pedagógicos e a equipe responsável. O conteúdo abaixo é provisório e pode ser
          editado posteriormente.
        </p>
        <section>
          <h2>Missão</h2>
          <p>Organizar questões de Física, resoluções, roteiros e ferramentas de avaliação para apoiar estudantes e professores.</p>
        </section>
        <section>
          <h2>Visão</h2>
          <p>Tornar o estudo de Física mais acessível, estruturado e conectado à prática de resolução de problemas.</p>
        </section>
        <section>
          <h2>Valores</h2>
          <p>Clareza, rigor, autoria, curadoria responsável e compromisso com a aprendizagem.</p>
        </section>
        <footer>
          <Link className="primary" href="/login">Acessar a plataforma</Link>
          <Link href="/">Voltar para a homepage</Link>
        </footer>
      </article>
    </main>
  );
}
