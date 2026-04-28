import { Link } from 'react-router-dom'

function TimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const BRAND = {
  blue: '#1F4E99',
  orange: '#F28C1B',
  orangeLight: '#FEF3E2',
  orangeBorder: '#FAD49A',
  blueLight: '#EBF1FB',
  blueBorder: '#AABFDE',
}

const MODULES = [
  {
    to: '/pesquisas',
    accent: BRAND.blue,
    accentLight: BRAND.blueLight,
    accentBorder: BRAND.blueBorder,
    kicker: 'Participação',
    title: 'Pesquisas',
    description: 'Veja as campanhas abertas, responda de forma anônima e acompanhe o histórico de pesquisas da empresa.',
    cta: 'Ver pesquisas',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    features: ['Pesquisas abertas', 'Respostas anônimas', 'Histórico de campanhas'],
  },
  {
    to: '/solicitacoes',
    accent: BRAND.orange,
    accentLight: BRAND.orangeLight,
    accentBorder: BRAND.orangeBorder,
    kicker: 'Operacional',
    title: 'Solicitações',
    description: 'Abra requisições de vaga, solicite desligamentos e acompanhe o andamento de cada pedido em tempo real.',
    cta: 'Abrir solicitações',
    helper: 'Requer acesso autenticado',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    features: ['Requisição de vaga', 'Solicitação de demissão', 'Minhas solicitações'],
  },
]

export function HomePage() {
  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="home-header-inner">
          <span className="home-brand">
            <img src="/wasion-logo.png" alt="Wasion América" />
            <span>Recursos Humanos</span>
          </span>
          <Link className="home-admin-link" to="/admin/login" state={{ returnTo: '/admin' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Acesso RH
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-eyebrow">
          <span aria-hidden="true" />
          Portal do colaborador
        </div>

        <h1>
          {TimeGreeting()},<br />
          <span>o que você precisa</span> hoje?
        </h1>

        <p>
          Acesse pesquisas, abra solicitações de RH e acompanhe seus pedidos, tudo em um só lugar.
        </p>
      </section>

      <section className="home-modules" aria-label="Módulos disponíveis">
        {MODULES.map((mod) => (
          <Link
            className="home-module-card"
            key={mod.to}
            to={mod.to}
            style={{
              '--module-accent': mod.accent,
              '--module-accent-light': mod.accentLight,
              '--module-accent-border': mod.accentBorder,
            }}
          >
            <div className="home-module-band" />

            <div className="home-module-body">
              <div className="home-module-top">
                <div className="home-module-icon" aria-hidden="true">
                  {mod.icon}
                </div>
                <span className="home-module-kicker">{mod.kicker}</span>
              </div>

              <div className="home-module-copy">
                <h2>{mod.title}</h2>
                <p>{mod.description}</p>
              </div>

              <div className="home-module-features">
                {mod.features.map((feature) => (
                  <div className="home-module-feature" key={feature}>
                    <span aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <strong>{feature}</strong>
                  </div>
                ))}
              </div>

              <div className="home-module-footer">
                <span className="home-module-cta">
                  {mod.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </span>
                {mod.helper ? <small>{mod.helper}</small> : null}
              </div>
            </div>
          </Link>
        ))}
      </section>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <span>Recursos Humanos</span>
          <nav aria-label="Links rápidos da home">
            <Link to="/pesquisas">Pesquisas</Link>
            <Link to="/solicitacoes">Solicitações</Link>
            <Link to="/admin/login" state={{ returnTo: '/admin' }}>Área RH</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
