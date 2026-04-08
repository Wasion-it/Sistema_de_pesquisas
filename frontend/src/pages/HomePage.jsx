import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getPublishedCampaigns } from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDateShort(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function formatDaysLeft(endAt) {
  const now = new Date()
  const end = new Date(endAt)
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return null
  if (diff === 1) return '1 dia restante'
  return `${diff} dias restantes`
}

const CATEGORY_COLORS = {
  GPTW: '#2563eb',
  PULSE: '#7c3aed',
  CUSTOM: '#0891b2',
}

export function HomePage() {
  const [campaigns, setCampaigns] = useState([])
  const [campaignsError, setCampaignsError] = useState('')
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => getCampaignAvailability(c).isOpen),
    [campaigns],
  )

  const historyCampaigns = useMemo(
    () => campaigns.filter((c) => !getCampaignAvailability(c).isOpen),
    [campaigns],
  )

  useEffect(() => {
    let isMounted = true
    getPublishedCampaigns()
      .then((data) => {
        if (isMounted) { setCampaigns(data.items); setCampaignsError('') }
      })
      .catch((error) => { if (isMounted) setCampaignsError(error.message) })
      .finally(() => { if (isMounted) setIsLoadingCampaigns(false) })
    return () => { isMounted = false }
  }, [])

  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <span className="collab-brand">Pesquisas RH</span>
          <a className="text-muted-link" href="/admin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Acesso RH
          </a>
        </div>
      </header>

      <div className="collab-content">
        {/* Hero */}
        <div style={{
          padding: '36px 40px',
          borderRadius: 'var(--r-2xl)',
          background: 'linear-gradient(135deg, var(--slate-900) 0%, #1e3a8a 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,.25), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase', color: 'rgba(147,197,253,.9)',
            marginBottom: 8,
          }}>Portal do colaborador</p>
          <h1 style={{ color: '#fff', marginBottom: 10, fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
            Sua voz importa.
          </h1>
          <p style={{ color: 'rgba(203,213,225,.85)', maxWidth: 420, lineHeight: 1.75 }}>
            Responda as pesquisas do RH de forma rápida e anônima. Suas respostas
            ajudam a construir um ambiente de trabalho melhor para todos.
          </p>
        </div>

        {campaignsError && <div className="form-error">{campaignsError}</div>}

        {isLoadingCampaigns ? (
          <div className="collab-loading"><span>Carregando pesquisas...</span></div>
        ) : activeCampaigns.length === 0 && historyCampaigns.length === 0 ? (
          <div className="collab-empty">
            <div className="collab-empty-icon">📋</div>
            <strong>Nenhuma pesquisa disponível</strong>
            <span>Quando o RH publicar uma pesquisa, ela aparecerá aqui para você responder.</span>
          </div>
        ) : (
          <>
            {activeCampaigns.length > 0 ? (
              <section>
                <div className="collab-section-header">
                  <h2>Pesquisas abertas</h2>
                  <span className="collab-section-count">{activeCampaigns.length}</span>
                </div>
                <div className="collab-cards-grid">
                  {activeCampaigns.map((campaign) => {
                    const daysLeft = formatDaysLeft(campaign.end_at)
                    const accentColor = CATEGORY_COLORS[campaign.survey_category] || CATEGORY_COLORS.CUSTOM
                    return (
                      <article className="collab-campaign-card" key={campaign.id} style={{ '--card-accent': accentColor }}>
                        <div className="collab-card-top">
                          <span className="collab-open-badge">Aberta agora</span>
                          {daysLeft && (
                            <span style={{
                              fontSize: 12, fontWeight: 600,
                              color: daysLeft.includes('1 dia') ? 'var(--amber-600)' : 'var(--slate-400)',
                              background: daysLeft.includes('1 dia') ? 'var(--amber-50)' : 'transparent',
                              padding: daysLeft.includes('1 dia') ? '3px 10px' : '0',
                              borderRadius: 999,
                              border: daysLeft.includes('1 dia') ? '1px solid var(--amber-200)' : 'none',
                            }}>
                              {daysLeft}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="collab-card-title">{campaign.survey_name}</h3>
                        </div>

                        <p className="collab-card-desc">
                          {campaign.description ?? 'Responda esta pesquisa para contribuir com a melhoria do ambiente de trabalho.'}
                        </p>

                        <div className="collab-card-info">
                          <span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            até {formatDateShort(campaign.end_at)}
                          </span>
                          <span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/>
                            </svg>
                            {campaign.total_questions} pergunta{campaign.total_questions !== 1 ? 's' : ''}
                          </span>
                          <span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Anônima
                          </span>
                        </div>

                        <Link className="collab-cta-button" to={`/campaigns/${campaign.id}`}>
                          Responder pesquisa
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </article>
                    )
                  })}
                </div>
              </section>
            ) : (
              <div className="collab-empty">
                <div className="collab-empty-icon">✓</div>
                <strong>Nenhuma pesquisa aberta agora</strong>
                <span>Você está em dia. Volte mais tarde para verificar novas pesquisas.</span>
              </div>
            )}

            {historyCampaigns.length > 0 && (
              <section>
                <div className="collab-section-header muted">
                  <h2>Encerradas</h2>
                </div>
                <div className="collab-history-list">
                  {historyCampaigns.map((campaign) => (
                    <article className="collab-history-item" key={campaign.id}>
                      <div>
                        <strong>{campaign.survey_name}</strong>
                        <span>Encerrada em {formatDateShort(campaign.end_at)}</span>
                      </div>
                      <span className="collab-closed-badge">Encerrada</span>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}