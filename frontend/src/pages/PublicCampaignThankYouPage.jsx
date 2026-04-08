import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPublishedCampaignDetail } from '../services/api'

export function PublicCampaignThankYouPage() {
  const { campaignId } = useParams()
  const [campaign, setCampaign] = useState(null)

  useEffect(() => {
    let isMounted = true

    getPublishedCampaignDetail(campaignId)
      .then((data) => {
        if (isMounted) {
          setCampaign(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCampaign(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [campaignId])

  return (
    <main className="page-shell">
      <div className="public-home-layout">
        <section className="hero-card public-hero-card public-thank-you-card">
          <span className="eyebrow">Participacao Concluida</span>
          <h1>Obrigado pela sua resposta</h1>
          <p>
            Sua participacao foi registrada com sucesso. Nesta fase do produto, as
            respostas da campanha sao tratadas como anonimas.
          </p>

          <div className="public-hero-metrics">
            <article className="public-metric-card">
              <span>Campanha</span>
              <strong>{campaign?.name ?? 'Campanha publicada'}</strong>
            </article>
            <article className="public-metric-card">
              <span>Status</span>
              <strong>Enviada</strong>
            </article>
          </div>

          <div className="form-actions-row public-detail-actions">
            <Link className="primary-link-button" to="/">
              Voltar para tela inicial
            </Link>
            <Link className="secondary-link-button" to={`/campaigns/${campaignId}`}>
              Ver campanha
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
