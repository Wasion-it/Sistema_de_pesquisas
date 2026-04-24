import { Link } from 'react-router-dom'

function TimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Wasion América brand palette
const BRAND = {
  blue:        '#1F4E99',
  blueSecond:  '#2E5DA8',
  blueTertiary:'#3A6BB5',
  orange:      '#F28C1B',
  orangeLight: '#FEF3E2',
  orangeBorder:'#FAD49A',
  blueLight:   '#EBF1FB',
  blueBorder:  '#AABFDE',
  white:       '#FFFFFF',
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
    <main style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 32px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueSecond})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 2px 8px ${BRAND.blue}44`,
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-.01em' }}>
              Sistema RH
            </span>
          </div>
          <Link
            to="/admin/login"
            state={{ returnTo: '/admin' }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px',
              borderRadius: 999,
              border: `1.5px solid ${BRAND.blueBorder}`,
              background: BRAND.white,
              color: BRAND.blueSecond,
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 140ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.blue; e.currentTarget.style.color = BRAND.white; e.currentTarget.style.background = BRAND.blue }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BRAND.blueBorder; e.currentTarget.style.color = BRAND.blueSecond; e.currentTarget.style.background = BRAND.white }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Acesso RH
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', width: '100%',
        padding: '72px 32px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 16,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 14px',
          borderRadius: 999,
          background: BRAND.blueLight,
          border: `1px solid ${BRAND.blueBorder}`,
          fontSize: 12, fontWeight: 700,
          color: BRAND.blue,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND.orange, animation: 'pulse 2s ease-in-out infinite' }} />
          Portal do colaborador
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
          fontWeight: 900,
          color: '#0f172a',
          lineHeight: 1.1,
          letterSpacing: '-.04em',
          fontFamily: 'var(--font-display)',
          maxWidth: 600,
        }}>
          {TimeGreeting()},<br />
          <span style={{ color: BRAND.blue }}>o que você precisa</span>{' '}
          hoje?
        </h1>

        <p style={{
          margin: 0,
          fontSize: 17,
          color: '#64748b',
          lineHeight: 1.7,
          maxWidth: 480,
          fontWeight: 400,
        }}>
          Acesse pesquisas, abra solicitações de RH e acompanhe seus pedidos — tudo em um só lugar.
        </p>
      </section>

      {/* Module cards */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', width: '100%',
        padding: '0 32px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 20,
      }}>
        {MODULES.map(mod => (
          <Link
            key={mod.to}
            to={mod.to}
            style={{
              textDecoration: 'none',
              borderRadius: 24,
              background: BRAND.white,
              border: `1.5px solid ${mod.accentBorder}`,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(15,23,42,.06)',
              transition: 'transform 160ms ease, box-shadow 160ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(15,23,42,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,.06)' }}
          >
            {/* Top band */}
            <div style={{ height: 4, background: mod.accent }} />

            {/* Card body */}
            <div style={{ padding: '32px 36px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Icon + kicker */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: mod.accentLight,
                  border: `1.5px solid ${mod.accentBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: mod.accent, flexShrink: 0,
                }}>
                  {mod.icon}
                </div>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: mod.accentLight,
                  border: `1px solid ${mod.accentBorder}`,
                  fontSize: 11, fontWeight: 700,
                  color: mod.accent,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}>
                  {mod.kicker}
                </span>
              </div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-.03em', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>
                  {mod.title}
                </h2>
                <p style={{ margin: 0, fontSize: 15, color: '#64748b', lineHeight: 1.65 }}>
                  {mod.description}
                </p>
              </div>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mod.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: mod.accentLight, border: `1px solid ${mod.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={mod.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px',
                  borderRadius: 12,
                  background: mod.accent,
                  color: BRAND.white,
                  fontSize: 14, fontWeight: 700,
                  letterSpacing: '.01em',
                  boxShadow: `0 4px 14px ${mod.accent}44`,
                }}>
                  {mod.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid #e2e8f0',
        background: BRAND.white,
        padding: '20px 32px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            Sistema de Recursos Humanos
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/pesquisas" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 140ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = BRAND.blue }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
            >Pesquisas</Link>
            <Link to="/solicitacoes" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 140ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = BRAND.orange }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
            >Solicitações</Link>
            <Link to="/admin/login" state={{ returnTo: '/admin' }} style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 140ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = BRAND.blue }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
            >Área RH</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>
    </main>
  )
}