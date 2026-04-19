import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { createAdminAdmissionHire } from '../services/admin'

function buildLocalDateInputValue(value = new Date()) {
  const date = new Date(value)
  const offsetMinutes = date.getTimezoneOffset()
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10)
}

function createCandidateDraft() {
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    full_name: '',
    email: '',
    phone_number: '',
    hire_date: '',
    is_hired: false,
  }
}

function makeInitialForm() {
  return {
    candidates: [createCandidateDraft()],
  }
}

function formatRequestLabel(request) {
  if (!request) {
    return ''
  }

  const hiredCount = request.hired_employee_count ?? 0
  const totalPeople = request.quantity_people ?? 0
  const candidateCount = request.candidates?.length ?? 0
  return `${request.cargo} • ${request.setor} • ${hiredCount}/${totalPeople} contratados • ${candidateCount} participantes`
}

export function AdmissionHireModal({ request, token, onClose, onSubmitted }) {
  const [form, setForm] = useState(makeInitialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const requestLabel = useMemo(() => formatRequestLabel(request), [request])

  useEffect(() => {
    if (!request) {
      setForm(makeInitialForm())
      setErrorMessage('')
      setIsSubmitting(false)
      return undefined
    }

    setForm(makeInitialForm())
    setErrorMessage('')
  }, [request, token])

  if (!request) {
    return null
  }

  const remainingPositions = request.remaining_positions ?? 0
  const candidateCount = form.candidates.length
  const hiredCount = form.candidates.filter((candidate) => candidate.is_hired).length
  const slotsLeft = remainingPositions - hiredCount

  function updateCandidate(candidateId, fieldName, value) {
    setForm((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) => (
        candidate.id === candidateId
          ? { ...candidate, [fieldName]: value }
          : candidate
      )),
    }))
  }

  function addCandidate() {
    if (isSubmitting) {
      return
    }

    setForm((current) => ({
      ...current,
      candidates: [...current.candidates, createCandidateDraft()],
    }))
  }

  function toggleCandidateHired(candidateId, nextValue) {
    if (nextValue && hiredCount >= remainingPositions) {
      setErrorMessage('Não há vagas disponíveis para marcar mais candidatos como contratados.')
      return
    }

    setErrorMessage('')
    updateCandidate(candidateId, 'is_hired', nextValue)
  }

  function removeCandidate(candidateId) {
    setForm((current) => {
      if (current.candidates.length <= 1) {
        return current
      }

      return {
        ...current,
        candidates: current.candidates.filter((candidate) => candidate.id !== candidateId),
      }
    })
  }

  function buildCandidatePayload(candidate) {
    return {
      full_name: candidate.full_name.trim(),
      email: candidate.email.trim(),
      phone_number: candidate.phone_number.trim() || null,
      hire_date: candidate.hire_date || null,
      is_hired: Boolean(candidate.is_hired),
    }
  }

  function validateCandidatePayloads(candidatePayloads) {
    if (candidatePayloads.length === 0) {
      return 'Adicione pelo menos um candidato.'
    }

    const seenWorkEmails = new Set()
    let hiredSelectionCount = 0

    for (const [index, candidatePayload] of candidatePayloads.entries()) {
      if (!candidatePayload.full_name || !candidatePayload.email) {
        return `Preencha todos os campos obrigatórios do candidato ${index + 1}.`
      }

      const normalizedEmail = candidatePayload.email.toLowerCase()

      if (seenWorkEmails.has(normalizedEmail)) {
        return `O email corporativo do candidato ${index + 1} já foi informado em outro registro.`
      }

      if (candidatePayload.is_hired) {
        hiredSelectionCount += 1
      }

      seenWorkEmails.add(normalizedEmail)
    }

    if (hiredSelectionCount > remainingPositions) {
      return 'Não há vagas suficientes para todos os candidatos marcados como contratados.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!token) {
      setErrorMessage('Sessão inválida. Faça login novamente.')
      return
    }

    if (form.candidates.length === 0) {
      setErrorMessage('Adicione pelo menos um candidato.')
      return
    }

    const candidatePayloads = form.candidates.map(buildCandidatePayload)
    const validationError = validateCandidatePayloads(candidatePayloads)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const latestResult = await createAdminAdmissionHire(token, request.id, { candidates: candidatePayloads })
      if (onSubmitted) {
        onSubmitted(latestResult)
      }
      onClose()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div
      className="request-modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: 32, paddingBottom: 32 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hire-request-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(100%, 760px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 24,
          background: '#fff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 64px rgba(15,23,42,.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '24px 28px 20px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 80%, #2563eb 100%)',
            borderRadius: '24px 24px 0 0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', top: -40, right: -40,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(96,165,250,.22), transparent 68%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)',
                  color: 'rgba(226,232,240,.9)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Contratação
                </span>
              </div>
              <h3
                id="hire-request-title"
                style={{
                  margin: '0 0 4px',
                  fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                  fontFamily: 'var(--font-display, Georgia, serif)',
                  fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-.01em',
                }}
              >
                Cadastrar candidatos
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(203,213,225,.85)' }}>{requestLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                flexShrink: 0, width: 34, height: 34, borderRadius: 10,
                border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.18)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
              aria-label="Fechar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Slot indicators */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            {[
              { icon: '🎯', label: 'Vagas abertas', value: remainingPositions, color: remainingPositions > 0 ? '#34d399' : '#f87171' },
              { icon: '✅', label: 'Contratados neste envio', value: `${hiredCount}/${request.quantity_people}`, color: '#60a5fa' },
              { icon: '👥', label: 'Participantes', value: candidateCount, color: '#a78bfa' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 13px', borderRadius: 10,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                }}
              >
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,.8)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 28px 0' }}>
          {/* Slots status banner */}
          <div style={{
            padding: '14px 18px',
            borderRadius: 14,
            background: slotsLeft > 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${slotsLeft > 0 ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 20,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: slotsLeft > 0 ? '#dcfce7' : '#fee2e2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {slotsLeft > 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, color: slotsLeft > 0 ? '#15803d' : '#b91c1c', marginBottom: 2 }}>
                {slotsLeft > 0 ? `${slotsLeft} vaga${slotsLeft !== 1 ? 's' : ''} disponível para preenchimento` : 'Todas as vagas já foram preenchidas'}
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: slotsLeft > 0 ? '#16a34a' : '#dc2626', opacity: .85 }}>
                {slotsLeft > 0
                  ? 'Marque candidatos como "Contratado" para preencher as posições abertas.'
                  : 'Você ainda pode registrar participantes sem marcar como contratados.'}
              </p>
            </div>
            {remainingPositions > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: slotsLeft > 0 ? '#86efac' : '#fca5a5', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Preenchimento</div>
                <div
                  style={{
                    width: 60, height: 6, borderRadius: 999,
                    background: slotsLeft > 0 ? '#bbf7d0' : '#fecaca',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((remainingPositions - slotsLeft) / remainingPositions) * 100)}%`,
                    background: slotsLeft > 0 ? '#16a34a' : '#dc2626',
                    borderRadius: 999,
                    transition: 'width .4s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: slotsLeft > 0 ? '#15803d' : '#b91c1c', marginTop: 2 }}>
                  {remainingPositions - slotsLeft}/{remainingPositions}
                </div>
              </div>
            )}
          </div>

          {errorMessage ? (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px', borderRadius: 12,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: 14, fontWeight: 500,
              marginBottom: 16,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errorMessage}
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
                textTransform: 'uppercase', color: '#94a3b8',
              }}>
                Candidatos
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22, padding: '0 7px',
                borderRadius: 999, background: '#f1f5f9',
                color: '#64748b', fontSize: 11, fontWeight: 700,
              }}>
                {candidateCount}
              </span>
              <div style={{ height: 1, width: 40, background: '#e2e8f0' }} />
            </div>
            <button
              type="button"
              onClick={addCandidate}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                border: '1.5px solid #bfdbfe',
                background: '#eff6ff', color: '#1d4ed8',
                fontSize: 13, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all .15s',
                opacity: isSubmitting ? 0.5 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicionar candidato
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {form.candidates.map((candidate, index) => {
              const isHired = candidate.is_hired
              const canToggleOn = !isSubmitting && slotsLeft > 0
              const canToggle = isHired ? !isSubmitting : canToggleOn

              return (
                <article
                  key={candidate.id}
                  style={{
                    borderRadius: 16,
                    border: `1.5px solid ${isHired ? '#bbf7d0' : '#e2e8f0'}`,
                    background: isHired ? 'linear-gradient(180deg, #f0fdf4 0%, #fff 100%)' : 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
                    overflow: 'hidden',
                    transition: 'border-color .2s, box-shadow .2s',
                    boxShadow: isHired ? '0 2px 12px rgba(22,163,74,.08)' : '0 1px 4px rgba(15,23,42,.04)',
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 18px',
                    background: isHired ? 'rgba(22,163,74,.06)' : 'rgba(15,23,42,.02)',
                    borderBottom: `1px solid ${isHired ? '#bbf7d0' : '#f1f5f9'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: isHired ? '#dcfce7' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: isHired ? '#16a34a' : '#94a3b8',
                      }}>
                        {candidate.full_name ? candidate.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() : index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: isHired ? '#86efac' : '#cbd5e1', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          Candidato {index + 1}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isHired ? '#15803d' : '#64748b' }}>
                          {candidate.full_name || request.cargo}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Hired toggle */}
                      <label
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          padding: '6px 12px', borderRadius: 999,
                          border: `1.5px solid ${isHired ? '#86efac' : canToggleOn ? '#e2e8f0' : '#f1f5f9'}`,
                          background: isHired ? '#dcfce7' : canToggleOn ? '#fff' : '#f8fafc',
                          color: isHired ? '#15803d' : canToggleOn ? '#64748b' : '#cbd5e1',
                          fontSize: 12, fontWeight: 700,
                          cursor: canToggle ? 'pointer' : 'not-allowed',
                          userSelect: 'none',
                          transition: 'all .15s',
                        }}
                        title={!canToggle && !isHired ? 'Não há vagas disponíveis' : undefined}
                      >
                        <div
                          style={{
                            width: 32, height: 18, borderRadius: 9,
                            background: isHired ? '#16a34a' : '#cbd5e1',
                            position: 'relative', transition: 'background .2s',
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: 3,
                            left: isHired ? 17 : 3,
                            width: 12, height: 12, borderRadius: '50%',
                            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                            transition: 'left .2s',
                          }} />
                        </div>
                        <input
                          type="checkbox"
                          checked={isHired}
                          onChange={(event) => toggleCandidateHired(candidate.id, event.target.checked)}
                          disabled={isSubmitting || (!isHired && hiredCount >= remainingPositions)}
                          style={{ display: 'none' }}
                        />
                        {isHired ? 'Contratado ✓' : 'Participante'}
                      </label>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeCandidate(candidate.id)}
                        disabled={form.candidates.length <= 1 || isSubmitting}
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: '#fff', color: '#94a3b8',
                          cursor: form.candidates.length <= 1 || isSubmitting ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .15s',
                          opacity: form.candidates.length <= 1 ? 0.4 : 1,
                        }}
                        onMouseEnter={(e) => { if (form.candidates.length > 1 && !isSubmitting) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca' } }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                        title="Remover candidato"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Fields */}
                  <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <label className="field-group" style={{ margin: 0 }}>
                        <span>Nome completo</span>
                        <input
                          required
                          value={candidate.full_name}
                          onChange={(event) => updateCandidate(candidate.id, 'full_name', event.target.value)}
                          placeholder="Nome do candidato"
                          style={{ fontSize: 14 }}
                        />
                      </label>
                      <label className="field-group" style={{ margin: 0 }}>
                        <span>Email</span>
                        <input
                          required
                          type="email"
                          value={candidate.email}
                          onChange={(event) => updateCandidate(candidate.id, 'email', event.target.value)}
                          placeholder="nome@empresa.com"
                          style={{ fontSize: 14 }}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isHired ? '1fr 1fr' : '1fr', gap: 12 }}>
                      <label className="field-group" style={{ margin: 0 }}>
                        <span>
                          Telefone{' '}
                          <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>· opcional</span>
                        </span>
                        <input
                          value={candidate.phone_number}
                          onChange={(event) => updateCandidate(candidate.id, 'phone_number', event.target.value)}
                          placeholder="(11) 99999-9999"
                          style={{ fontSize: 14 }}
                        />
                      </label>
                      {isHired ? (
                        <label className="field-group" style={{ margin: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#22c55e', boxShadow: '0 0 0 2px #dcfce7',
                                flexShrink: 0,
                              }}
                            />
                            Data de admissão
                          </span>
                          <input
                            type="date"
                            value={candidate.hire_date}
                            onChange={(event) => updateCandidate(candidate.id, 'hire_date', event.target.value)}
                            style={{ fontSize: 14 }}
                          />
                        </label>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Helper text */}
          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            Registre todos os candidatos que participaram do processo. Apenas os marcados como{' '}
            <strong style={{ color: '#15803d' }}>Contratado</strong> contam para as vagas em aberto.
          </p>

          {/* Actions */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            marginTop: 22, paddingTop: 20,
            borderTop: '1px solid #f1f5f9',
          }}>
            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
              style={{ minWidth: 180 }}
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Cadastrar candidatos
                </>
              )}
            </button>
            <button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              {candidateCount} participante{candidateCount !== 1 ? 's' : ''} · {hiredCount} contratado{hiredCount !== 1 ? 's' : ''}
            </span>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return modalContent
  }

  return createPortal(modalContent, document.body)
}