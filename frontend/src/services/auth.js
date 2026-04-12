const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001/api/v1'

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail ?? 'Erro na autenticacao')
  }

  return data
}

export async function loginAdmin(credentials) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  return parseResponse(response)
}

export async function getAdminSession(token) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response)
}
