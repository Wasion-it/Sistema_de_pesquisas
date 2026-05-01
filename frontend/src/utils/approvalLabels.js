const APPROVAL_LABEL_OVERRIDES = {
  'Diretor Ravi': 'General Manager',
  'Diretor RAVI': 'General Manager',
  DIRECTOR_RAVI: 'General Manager',
}

export function formatApprovalLabel(label) {
  return APPROVAL_LABEL_OVERRIDES[label] ?? label
}
