import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { hasAdminSectionAccess, hasModuleAccess, isApprovalOnlyUser } from '../utils/accessControl'

// Wasion América brand palette
const BRAND = {
  blue:        '#1F4E99',
  blueSecond:  '#2E5DA8',
  blueTertiary:'#3A6BB5',
  orange:      '#F28C1B',
  blueLight:   '#EBF1FB',
  blueBorder:  '#AABFDE',
  orangeLight: '#FEF3E2',
  orangeBorder:'#FAD49A',
  slate:       '#475569',
  slateLight:  '#F1F5F9',
  slateBorder: '#CBD5E1',
  white:       '#FFFFFF',
}

// Map accent names to brand tokens
const ACCENT_MAP = {
  blue:  { color: BRAND.blue,   light: BRAND.blueLight,   border: BRAND.blueBorder },
  amber: { color: BRAND.orange, light: BRAND.orangeLight,  border: BRAND.orangeBorder },
  green: { color: BRAND.blueSecond, light: BRAND.blueLight, border: BRAND.blueBorder },
  slate: { color: BRAND.slate,  light: BRAND.slateLight,   border: BRAND.slateBorder },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const ADMIN_MODULES = [
  {
    title: 'Pesquisas',
    description: 'Gerencie pesquisas, versões, campanhas e respostas do portal.',
    to: '/admin/surveys',
    accent: 'blue',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    title: 'Departamentos',
    description: 'Mantenha os setores e a base de segmentação atualizados.',
    to: '/admin/departments',
    accent: 'slate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21h16" />
        <path d="M6 21V7l6-4 6 4v14" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
      </svg>
    ),
  },
  {
    title: 'Cargos',
    description: 'Cadastre os cargos com descrição para apoiar admissões e aprovações.',
    to: '/admin/job-titles',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
      </svg>
    ),
  },
  {
    title: 'Aprovações',
    description: 'Acompanhe e avance a fila de admissão e demissão.',
    to: '/admin/approvals',
    accent: 'green',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l4 4L19 6" />
      </svg>
    ),
  },
  {
    title: 'Admissão',
    description: 'Acesse a fila de solicitações de admissão.',
    to: '/admin/admission-requests',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M20 6H4" />
        <path d="M20 18H4" />
      </svg>
    ),
  },
  {
    title: 'Demissão',
    description: 'Acesse a fila de solicitações de demissão.',
    to: '/admin/dismissal-requests',
    accent: 'slate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M20 6H4" />
        <path d="M20 18H4" />
      </svg>
    ),
  },
  {
    title: 'Dashboard',
    description: 'Abra a página principal do admin com acesso aos indicadores de pesquisas.',
    to: '/admin/dashboard/pesquisas',
    accent: 'green',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l4-4 4 4 6-6 4 4" />
        <path d="M21 7v6h-6" />
      </svg>
    ),
  },
  {
    title: 'KPIs de admissão',
    description: 'Acompanhe o tempo de fechamento das vagas por perfil de contratação.',
    to: '/admin/dashboard/admissao',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
]

export function AdminHomePage() {
  const { user } = useAuth()
  const isApprovalOnlyRole = isApprovalOnlyUser(user)
  if (isApprovalOnlyRole) {
    return <Navigate replace to="/admin/approvals" />
  }

  const visibleModules = isApprovalOnlyRole
    ? ADMIN_MODULES.filter((module) => module.title === 'Aprovações')
    : ADMIN_MODULES.filter((module) => {
        if (module.to.startsWith('/admin/dashboard/pesquisas')) return hasModuleAccess(user, 'SURVEYS')
        if (module.to.startsWith('/admin/dashboard/admissao')) return hasModuleAccess(user, 'DASHBOARD')
        if (module.to.startsWith('/admin/dashboard')) return hasModuleAccess(user, 'DASHBOARD')
        if (module.to.startsWith('/admin/departments')) return hasAdminSectionAccess(user, 'DEPARTMENTS')
        if (module.to.startsWith('/admin/job-titles')) return hasAdminSectionAccess(user, 'JOB_TITLES')
        if (module.to.startsWith('/admin/requests') || module.to.startsWith('/admin/admission-requests') || module.to.startsWith('/admin/admission-checklist')) return hasModuleAccess(user, 'ADMISSION')
        if (module.to.startsWith('/admin/dismissal-requests') || module.to.startsWith('/admin/dismissal-checklist')) return hasModuleAccess(user, 'DISMISSAL')
        if (module.to.startsWith('/admin/approvals')) return hasModuleAccess(user, 'APPROVALS')
        if (module.to.startsWith('/admin/surveys') || module.to.startsWith('/admin/campaigns')) return hasModuleAccess(user, 'SURVEYS')
        return false
      })

  return (
    <div className="admin-view admin-home-view">
      <section
        className="admin-home-hero"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueSecond} 60%, ${BRAND.blueTertiary} 100%)`,
          borderRadius: 20,
          padding: '36px 40px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          color: BRAND.white,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: `${BRAND.white}0D`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -80,
          width: 180, height: 180, borderRadius: '50%',
          background: `${BRAND.orange}1A`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: `${BRAND.white}CC`,
            marginBottom: 10,
          }}>
            Portal do RH
          </span>
          <h2 style={{
            margin: '0 0 10px',
            fontSize: 'clamp(1.6rem, 3vw, 2rem)',
            fontWeight: 800,
            color: BRAND.white,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            fontFamily: 'var(--font-display)',
          }}>
            {getGreeting()}, {user?.full_name?.split(' ')[0] ?? 'Administrador'}
          </h2>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: `${BRAND.white}B3`,
            lineHeight: 1.6,
            maxWidth: 460,
          }}>
            A home administrativa concentra os módulos principais do portal para que o RH
            entre direto no fluxo certo.
          </p>
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          flexShrink: 0,
          background: `${BRAND.white}14`,
          border: `1px solid ${BRAND.white}33`,
          borderRadius: 16,
          padding: '16px 24px',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ display: 'block', fontSize: 11, color: `${BRAND.white}99`, fontWeight: 600, marginBottom: 4 }}>
            Entrada administrativa
          </span>
          <strong style={{ display: 'block', fontSize: 15, color: BRAND.white, fontWeight: 700 }}>
            Operação RH
          </strong>
        </div>
      </section>

      <section
        className="admin-home-modules"
        aria-label="Módulos administrativos"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {visibleModules.map((module) => {
          const tokens = ACCENT_MAP[module.accent] ?? ACCENT_MAP.blue
          return (
            <Link
              className={`admin-home-module module-${module.accent}`}
              key={module.title}
              to={module.to}
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                background: BRAND.white,
                border: `1.5px solid ${tokens.border}`,
                borderRadius: 18,
                padding: '24px 24px 20px',
                boxShadow: '0 2px 12px rgba(15,23,42,.05)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 10px 32px ${tokens.color}22`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(15,23,42,.05)'
              }}
            >
              {/* Top accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tokens.color, borderRadius: '18px 18px 0 0' }} />

              <div className="admin-home-module-icon" style={{
                width: 48, height: 48, borderRadius: 14,
                background: tokens.light,
                border: `1.5px solid ${tokens.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: tokens.color,
                flexShrink: 0,
              }}>
                {module.icon}
              </div>

              <div className="admin-home-module-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="admin-home-module-kicker" style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: tokens.color,
                }}>
                  Módulo
                </span>
                <h3 style={{
                  margin: 0, fontSize: '1.05rem', fontWeight: 800,
                  color: '#0f172a', letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-display)',
                }}>
                  {module.title}  
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  {module.description}
                </p>
              </div>

              <span className="admin-home-module-action" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 700,
                color: tokens.color,
                paddingTop: 4,
                borderTop: `1px solid ${tokens.border}`,
              }}>
                Abrir
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          )
        })}
      </section>
    </div>
  )
}