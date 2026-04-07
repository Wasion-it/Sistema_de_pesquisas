const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

export async function getApiStatus() {
  const response = await fetch(`${API_URL}/health`)

  if (!response.ok) {
    throw new Error('Erro ao consultar backend')
  }

  return response.json()
}
