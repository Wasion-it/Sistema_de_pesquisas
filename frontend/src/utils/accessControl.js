export const ACCESS_MODULES = [
  'DASHBOARD',
  'ADMISSION',
  'DISMISSAL',
  'SURVEYS',
  'APPROVALS',
  'ACCESS_CONTROL',
]

export const ACCESS_MODULE_META = {
  DASHBOARD: { label: 'Dashboard', description: 'Painel principal e indicadores do portal.' },
  ADMISSION: { label: 'Admissão', description: 'Solicitações, checklist e acompanhamento de admissões.' },
  DISMISSAL: { label: 'Demissão', description: 'Solicitações, checklist e acompanhamento de desligamentos.' },
  SURVEYS: { label: 'Pesquisas', description: 'Pesquisas, campanhas e análise de respostas.' },
  APPROVALS: { label: 'Aprovações', description: 'Fila de aprovações de admissão e demissão.' },
  ACCESS_CONTROL: { label: 'Delegação de acesso', description: 'Gestão de permissões por módulo para usuários do AD.' },
}

const FULL_PORTAL_ROLES = new Set(['RH_ADMIN', 'TI_SUPORTE'])
const RH_ANALYST_MODULES = new Set(['ADMISSION', 'DISMISSAL'])
const APPROVAL_ONLY_ROLES = new Set(['GESTOR', 'DIRETOR_RAVI'])

export function hasPortalAccess(user) {
  if (!user) return false
  if (FULL_PORTAL_ROLES.has(user.role) || APPROVAL_ONLY_ROLES.has(user.role) || user.role === 'RH_ANALISTA') return true
  return Boolean(user.access_grants?.some((grant) => grant.is_active !== false))
}

export function hasModuleAccess(user, moduleName) {
  if (!user) return false
  if (FULL_PORTAL_ROLES.has(user.role)) return true
  if (user.role === 'RH_ANALISTA') return RH_ANALYST_MODULES.has(moduleName)
  if (APPROVAL_ONLY_ROLES.has(user.role)) return moduleName === 'APPROVALS'
  return Boolean(user.access_grants?.some((grant) => grant.is_active !== false && grant.module === moduleName))
}

export function hasAdminSectionAccess(user, sectionName) {
  if (!user) return false
  if (FULL_PORTAL_ROLES.has(user.role)) return true
  if (user.role === 'RH_ANALISTA') {
    return new Set(['HOME', 'REQUESTS', 'DEPARTMENTS', 'JOB_TITLES', 'ADMISSION', 'DISMISSAL']).has(sectionName)
  }
  if (APPROVAL_ONLY_ROLES.has(user.role)) {
    return sectionName === 'HOME' || sectionName === 'APPROVALS'
  }

  return false
}

export function isApprovalOnlyUser(user) {
  if (!user) return false
  if (APPROVAL_ONLY_ROLES.has(user.role)) return true
  if (FULL_PORTAL_ROLES.has(user.role) || user.role === 'RH_ANALISTA') return false

  const activeModules = user.access_grants?.filter((grant) => grant.is_active !== false).map((grant) => grant.module) ?? []
  return activeModules.length > 0 && activeModules.every((moduleName) => moduleName === 'APPROVALS')
}