import { Link, useParams } from 'react-router-dom'

export function AdminCampaignKpisPage() {
  const { campaignId } = useParams()

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">KPIs da Campanha</span>
          <h2>Campanha #{campaignId}</h2>
          <p>Página inicial de KPIs. Os indicadores serão adicionados aqui nas próximas etapas.</p>
        </div>

        <div className="admin-header-actions">
          <Link className="secondary-link-button" to={`/admin/campaigns/${campaignId}/responses`}>
            Ver respostas
          </Link>
        </div>
      </div>

      <section className="admin-panel-card">
        <div className="empty-state" style={{ minHeight: 260 }}>
          <strong>KPIs ainda nao configurados</strong>
          <span>Este espaco foi reservado para visao consolidada da campanha, com indicadores e graficos.</span>
        </div>
      </section>
    </div>
  )
}