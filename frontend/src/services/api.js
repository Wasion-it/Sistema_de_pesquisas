const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function getApiStatus() {
  const response = await fetch(`${API_URL}/health`)

  if (!response.ok) {
    throw new Error('Erro ao consultar backend')
  }

  return response.json()
}

export async function getPublishedCampaigns() {
  const response = await fetch(`${API_URL}/campaigns/published`)

  if (!response.ok) {
    throw new Error('Erro ao consultar campanhas publicadas')
  }

  return response.json()
}

export async function getPublishedCampaignDetail(campaignId) {
  const response = await fetch(`${API_URL}/campaigns/published/${campaignId}`)

  if (!response.ok) {
    throw new Error('Erro ao consultar a campanha publicada')
  }

  return response.json()
}

export async function startPublishedCampaignParticipation(campaignId, payload) {
  const response = await fetch(`${API_URL}/campaigns/published/${campaignId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail ?? 'Erro ao iniciar participacao na campanha')
  }

  return data
}

export async function submitPublishedCampaignResponse(campaignId, payload) {
  const response = await fetch(`${API_URL}/campaigns/published/${campaignId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail ?? 'Erro ao enviar respostas da campanha')
  }

  return data
}
