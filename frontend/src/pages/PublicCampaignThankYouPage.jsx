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
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <Link className="text-muted-link" to="/pesquisas">← Todas as pesquisas</Link>
        </div>
      </header>

      <div className="collab-content">
        <div className="collab-thankyou-card">
          <div className="collab-thankyou-icon">✓</div>
          <h1>Obrigado pela sua participacao!</h1>
          <p>
            Sua resposta foi registrada com sucesso e de forma anonima.
            {campaign ? ` A pesquisa "${campaign.survey_name}" agradece a sua contribuicao.` : ''}
          </p>
          <Link className="collab-start-button" to="/pesquisas">
            Voltar para pesquisas
          </Link>
        </div>
      </div>
    </main>
  )
}
