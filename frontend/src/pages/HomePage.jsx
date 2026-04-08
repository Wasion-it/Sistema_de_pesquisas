import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getPublishedCampaigns } from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDateShort(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

export function HomePage() {
  const [campaigns, setCampaigns] = useState([])
  const [campaignsError, setCampaignsError] = useState('')
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => getCampaignAvailability(campaign).isOpen),
    [campaigns],
  )

  const historyCampaigns = useMemo(
    () => campaigns.filter((campaign) => !getCampaignAvailability(campaign).isOpen),
    [campaigns],
  )

  useEffect(() => {
    let isMounted = true

    getPublishedCampaigns()
      .then((data) => {
        if (isMounted) {
          setCampaigns(data.items)
          setCampaignsError('')
        }
      })
      .catch((error) => {
        if (isMounted) {
          setCampaignsError(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCampaigns(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <span className="collab-brand">Pesquisas RH</span>
          <a className="text-muted-link" href="/admin">Acesso RH</a>
        </div>
      </header>

      <div className="collab-content">
        {campaignsError ? <div className="form-error">{campaignsError}</div> : null}

        {isLoadingCampaigns ? (
          <div className="collab-loading">
            <span>Carregando pesquisas...</span>
          </div>
        ) : activeCampaigns.length === 0 && historyCampaigns.length === 0 ? (
          <div className="collab-empty">
            <div className="collab-empty-icon"></div>
            <strong>Nenhuma pesquisa disponivel no momento</strong>
            <span>Quando o RH publicar uma pesquisa, ela aparecera aqui para voce responder.</span>
          </div>
        ) : (
          <>
            {activeCampaigns.length > 0 ? (
              <section className="collab-section">
                <div className="collab-section-header">
                  <h2>Pesquisas abertas</h2>
                  <span className="collab-section-count">{activeCampaigns.length}</span>
                </div>
                <div className="collab-cards-grid">
                  {activeCampaigns.map((campaign) => (
                    <article className="collab-campaign-card open" key={campaign.id}>
                      <div className="collab-card-top">
                        <span className="collab-open-badge">Aberta</span>
                        <span className="collab-card-deadline">ate {formatDateShort(campaign.end_at)}</span>
                      </div>
                      <h3 className="collab-card-title">{campaign.survey_name}</h3>
                      <p className="collab-card-desc">
                        {campaign.description ?? 'Responda esta pesquisa para contribuir com a melhoria do ambiente de trabalho.'}
                      </p>
                      <div className="collab-card-info">
                        <span>{campaign.total_questions} pergunta(s)</span>
                        <span>Anonima</span>
                      </div>
                      <Link className="collab-cta-button" to={`/campaigns/${campaign.id}`}>
                        Responder pesquisa
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <div className="collab-empty">
                <div className="collab-empty-icon"></div>
                <strong>Nenhuma pesquisa aberta agora</strong>
                <span>Voce esta em dia. Volte mais tarde para verificar novas pesquisas.</span>
              </div>
            )}

            {historyCampaigns.length > 0 ? (
              <section className="collab-section">
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
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}