import Link from 'next/link';

const formulas = [
  'F = ma',
  'E = mc²',
  'v = v₀ + at',
  'ΔS = v₀t + at²/2',
  'τ = F · d',
  'P = U · i',
  'Q = mcΔT',
  'f = 1/T',
  'λ = v/f',
  '∑F = 0',
  'p = mv',
  'U = kq/r',
  'Φ = BAcosθ',
  'n₁senθ₁ = n₂senθ₂',
];

const words = [
  'cinemática',
  'ondas',
  'ITA',
  'IME',
  'ENEM',
  'energia',
  'vetores',
  'gravitação',
  'óptica',
  'calor',
  'eletromagnetismo',
  'BNCC',
  'simulados',
  'resolução',
];

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-top">
        <Link className="landing-brand" href="/">
          <span>φ</span>
          <strong>Física <em>Resolvida</em></strong>
        </Link>
        <nav aria-label="Navegação principal">
          <a href="mailto:welber05@gmail.com?subject=Contato%20-%20F%C3%ADsica%20Resolvida">Contato por e-mail</a>
          <a href="https://wa.me/5527997886378" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="/sobre">Sobre</a>
          <a className="landing-login" href="/login">Cadastrar / Login</a>
        </nav>
      </header>

      <section className="idea-storm" aria-label="Tempestade de ideias de física">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="formula-card hero-formula">∫F·ds = ΔE</div>
        <div className="physics-drawing pendulum"><i /><b /></div>
        <div className="physics-drawing wave"><span /><span /><span /></div>
        <div className="physics-drawing prism"><b /></div>
        {formulas.map((formula, index) => (
          <span key={formula} className={`storm-item formula item-${index + 1}`}>{formula}</span>
        ))}
        {words.map((word, index) => (
          <span key={word} className={`storm-item word word-${index + 1}`}>{word}</span>
        ))}
        <div className="landing-core">
          <p className="eyebrow">ACERVO · PROVAS · ROTEIROS</p>
          <h1>Física Resolvida</h1>
          <p>Uma plataforma para praticar questões, montar provas, organizar classificações e transformar resolução em aprendizagem.</p>
          <form action="/login" method="get">
            <button className="landing-cta" type="submit">Entrar no sistema <span>→</span></button>
          </form>
        </div>
      </section>
    </main>
  );
}
