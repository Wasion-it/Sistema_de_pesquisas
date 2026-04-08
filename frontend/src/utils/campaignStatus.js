function toDate(value) {
  return value ? new Date(value) : null
}

export function getCampaignAvailability(campaign) {
  const now = new Date()
  const startAt = toDate(campaign.start_at)
  const endAt = toDate(campaign.end_at)

  if (campaign.status !== 'ACTIVE') {
    return {
      label: campaign.status === 'CLOSED' ? 'Encerrada' : 'Inativa',
      variant: 'inactive',
      isOpen: false,
    }
  }

  if (startAt && now < startAt) {
    return {
      label: 'Em breve',
      variant: 'inactive',
      isOpen: false,
    }
  }

  if (endAt && now > endAt) {
    return {
      label: 'Encerrada',
      variant: 'inactive',
      isOpen: false,
    }
  }

  return {
    label: 'Em andamento',
    variant: 'active',
    isOpen: true,
  }
}