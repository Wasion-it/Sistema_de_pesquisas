const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail ?? 'Erro ao carregar dados administrativos')
  }

  return data
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function getAdminDashboard(token) {
  const response = await fetch(`${API_URL}/admin/dashboard`, {
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function getAdminSurveys(token) {
  const response = await fetch(`${API_URL}/admin/surveys`, {
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function createAdminSurvey(token, payload) {
  const response = await fetch(`${API_URL}/admin/surveys`, {
    method: 'POST',
    headers: {
      ...buildHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}
