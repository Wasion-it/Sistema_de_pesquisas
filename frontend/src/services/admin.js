const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'

function formatErrorDetail(detail) {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object') {
          const location = Array.isArray(item.loc) ? item.loc.join('.') : ''
          const message = typeof item.msg === 'string' ? item.msg : JSON.stringify(item)
          return location ? `${location}: ${message}` : message
        }

        return String(item)
      })
      .join(' | ')
  }

  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail)
  }

  return null
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(formatErrorDetail(data.detail) ?? 'Erro ao carregar dados administrativos')
  }

  return data
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

function buildJsonOptions(token, method, payload) {
  return {
    method,
    headers: {
      ...buildHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
  const response = await fetch(`${API_URL}/admin/surveys`, buildJsonOptions(token, 'POST', payload))

  return parseResponse(response)
}

export async function deleteAdminSurvey(token, surveyId) {
  const response = await fetch(`${API_URL}/admin/surveys/${surveyId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function getAdminSurveyDetail(token, surveyId) {
  const response = await fetch(`${API_URL}/admin/surveys/${surveyId}`, {
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function updateAdminSurvey(token, surveyId, payload) {
  const response = await fetch(
    `${API_URL}/admin/surveys/${surveyId}`,
    buildJsonOptions(token, 'PUT', payload),
  )

  return parseResponse(response)
}

export async function createSurveyDimension(token, surveyId, payload) {
  const response = await fetch(
    `${API_URL}/admin/surveys/${surveyId}/dimensions`,
    buildJsonOptions(token, 'POST', payload),
  )

  return parseResponse(response)
}

export async function updateSurveyDimension(token, dimensionId, payload) {
  const response = await fetch(
    `${API_URL}/admin/dimensions/${dimensionId}`,
    buildJsonOptions(token, 'PATCH', payload),
  )

  return parseResponse(response)
}

export async function deleteSurveyDimension(token, dimensionId) {
  const response = await fetch(`${API_URL}/admin/dimensions/${dimensionId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function createSurveyQuestion(token, surveyId, payload) {
  const response = await fetch(
    `${API_URL}/admin/surveys/${surveyId}/questions`,
    buildJsonOptions(token, 'POST', payload),
  )

  return parseResponse(response)
}

export async function updateSurveyQuestion(token, questionId, payload) {
  const response = await fetch(
    `${API_URL}/admin/questions/${questionId}`,
    buildJsonOptions(token, 'PATCH', payload),
  )

  return parseResponse(response)
}

export async function deleteSurveyQuestion(token, questionId) {
  const response = await fetch(`${API_URL}/admin/questions/${questionId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}

export async function publishAdminSurvey(token, surveyId, payload) {
  const response = await fetch(
    `${API_URL}/admin/surveys/${surveyId}/publish`,
    buildJsonOptions(token, 'POST', payload),
  )

  return parseResponse(response)
}

export async function getAdminCampaignResponses(token, campaignId) {
  const response = await fetch(`${API_URL}/admin/campaigns/${campaignId}/responses`, {
    headers: buildHeaders(token),
  })

  return parseResponse(response)
}
