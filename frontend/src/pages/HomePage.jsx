import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { StatusPanel } from '../components/StatusPanel'
import { getApiStatus, getPublishedCampaigns } from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function HomePage() {
  const [apiStatus, setApiStatus] = useState('carregando...')
  const [campaigns, setCampaigns] = useState([])
  const [summary, setSummary] = useState({ total_published_campaigns: 0, active_campaigns: 0 })
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

    getApiStatus()
      .then((data) => {
        if (isMounted) {
          setApiStatus(data.status)
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('indisponivel')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    getPublishedCampaigns()
      .then((data) => {
        if (isMounted) {
          setCampaigns(data.items)
          setSummary(data.summary)
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
    <main className="page-shell">
      <div className="public-home-layout">
        <section className="hero-card public-hero-card">
          <span className="eyebrow">Campanhas Publicadas</span>
          <h1>Sistema de Pesquisas</h1>
          <p>
            Acompanhe as campanhas que ja foram publicadas pelo RH e a estrutura
            atual de pesquisas disponiveis na plataforma.
          </p>

          <div className="public-hero-metrics">
            <article className="public-metric-card">
              <span>Campanhas publicadas</span>
              <strong>{summary.total_published_campaigns}</strong>
            </article>
            <article className="public-metric-card">
              <span>Disponiveis agora</span>
              <strong>{activeCampaigns.length}</strong>
            </article>
          </div>

          <p className="supporting-copy">
            O acesso do RH ao portal administrativo continua disponivel pelo botao
            no canto superior da tela.
          </p>

          <StatusPanel status={apiStatus} />
        </section>

        <section className="public-campaigns-panel">
          <div className="panel-header-row">
            <div>
              <span className="eyebrow">Vitrine Publica</span>
              <h2>Campanhas ativas</h2>
              <p>Campanhas publicadas e prontas para entrada do colaborador.</p>
            </div>
          </div>

          {campaignsError ? <div className="form-error">{campaignsError}</div> : null}

          {isLoadingCampaigns ? (
            <div className="public-empty-state">
              <strong>Carregando campanhas...</strong>
            </div>
          ) : activeCampaigns.length === 0 ? (
            <div className="public-empty-state">
              <strong>Nenhuma campanha ativa no momento</strong>
              <span>Assim que o RH publicar uma campanha ativa, ela aparecera aqui.</span>
            </div>
          ) : (
            <div className="public-campaigns-grid">
              {activeCampaigns.map((campaign) => (
                (() => {
                  const availability = getCampaignAvailability(campaign)

                  return (
                <article className="public-campaign-card" key={campaign.id}>
                  <div className="public-campaign-top">
                    <div>
                      <span className={`status-pill ${availability.variant}`}>
                        {availability.label}
                      </span>
                      <h3>{campaign.name}</h3>
                    </div>
                    <span className="public-campaign-code">{campaign.code}</span>
                  </div>

                  <p>{campaign.description ?? 'Campanha publicada sem descricao adicional.'}</p>

                  <div className="public-campaign-meta">
                    <span>{campaign.survey_name}</span>
                    <span>{campaign.survey_category} · {campaign.version_title}</span>
                    <span>{campaign.total_questions} pergunta(s)</span>
                    <span>{campaign.audience_count} colaborador(es) no publico</span>
                  </div>

                  <div className="public-campaign-dates">
                    <span>Publicada em {formatDate(campaign.published_at)}</span>
                    <span>Periodo: {formatDate(campaign.start_at)} ate {formatDate(campaign.end_at)}</span>
                  </div>

                  <div className="form-actions-row public-card-actions">
                    <Link className="primary-link-button" to={`/campaigns/${campaign.id}`}>
                      Entrar na campanha
                    </Link>
                  </div>
                </article>
                  )
                })()
              ))}
            </div>
          )}
        </section>

        <section className="public-campaigns-panel">
          <div className="panel-header-row">
            <div>
              <span className="eyebrow">Historico</span>
              <h2>Campanhas encerradas ou inativas</h2>
              <p>Separacao da vitrine publica entre o que esta aberto e o que ja saiu de circulacao.</p>
            </div>
          </div>

          {isLoadingCampaigns ? (
            <div className="public-empty-state">
              <strong>Carregando historico...</strong>
            </div>
          ) : historyCampaigns.length === 0 ? (
            <div className="public-empty-state">
              <strong>Nenhuma campanha no historico</strong>
              <span>Quando existirem campanhas encerradas, elas aparecerao aqui.</span>
            </div>
          ) : (
            <div className="public-campaigns-grid public-history-grid">
              {historyCampaigns.map((campaign) => (
                (() => {
                  const availability = getCampaignAvailability(campaign)

                  return (
                <article className="public-campaign-card public-campaign-card-muted" key={campaign.id}>
                  <div className="public-campaign-top">
                    <div>
                      <span className={`status-pill ${availability.variant}`}>
                        {availability.label}
                      </span>
                      <h3>{campaign.name}</h3>
                    </div>
                    <span className="public-campaign-code">{campaign.code}</span>
                  </div>

                  <p>{campaign.description ?? 'Campanha publicada sem descricao adicional.'}</p>

                  <div className="public-campaign-meta">
                    <span>{campaign.survey_name}</span>
                    <span>{campaign.survey_category} · {campaign.version_title}</span>
                    <span>{campaign.total_questions} pergunta(s)</span>
                  </div>

                  <div className="public-campaign-dates">
                    <span>Publicada em {formatDate(campaign.published_at)}</span>
                    <span>Periodo: {formatDate(campaign.start_at)} ate {formatDate(campaign.end_at)}</span>
                  </div>
                </article>
                  )
                })()
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
