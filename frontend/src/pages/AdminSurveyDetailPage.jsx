import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import {
  createSurveyDimension,
  createSurveyQuestion,
  deleteSurveyDimension,
  deleteSurveyQuestion,
  getAdminSurveyDetail,
  publishAdminSurvey,
  updateAdminSurvey,
  updateSurveyDimension,
  updateSurveyQuestion,
} from '../services/admin'

// ─── Constants ─────────────────────────────────────────────────────────────

const INITIAL_METADATA_FORM = {
  name: '',
  description: '',
  category: '',
  isActive: true,
  versionTitle: '',
}

const INITIAL_QUESTION_FORM = {
  id: null,
  code: '',
  questionText: '',
  helpText: '',
  questionType: 'SCALE_1_5',
  dimensionId: '',
  isRequired: true,
  displayOrder: '',
  scaleMin: 1,
  scaleMax: 5,
  scoreWeight: 1,
  isNegative: false,
  isActive: true,
  optionsText: '',
}

const INITIAL_DIMENSION_FORM = {
  id: null,
  name: '',
  description: '',
  isActive: true,
}

const INITIAL_PUBLISH_FORM = {
  startAt: '',
  endAt: '',
}

const TABS = [
  {
    id: 'pesquisa',
    label: 'Pesquisa',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: 'dimensoes',
    label: 'Dimensões',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'perguntas',
    label: 'Perguntas',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'publicar',
    label: 'Publicar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13"/>
        <path d="M22 2L15 22 11 13 2 9l20-7z"/>
      </svg>
    ),
  },
]

const QUESTION_TYPE_CONFIG = {
  SCALE_1_5: { label: 'Escala', hint: '1 a 5', color: '#7c3aed', bg: '#ede9fe' },
  TEXT: { label: 'Texto', hint: 'Aberta', color: '#0284c7', bg: '#e0f2fe' },
  SINGLE_CHOICE: { label: 'Opções', hint: 'Escolha', color: '#059669', bg: '#dcfce7' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildQuestionForm(question) {
  if (!question) return INITIAL_QUESTION_FORM
  return {
    id: question.id,
    code: question.code,
    questionText: question.question_text,
    helpText: question.help_text ?? '',
    questionType: question.question_type,
    dimensionId: question.dimension_id ? String(question.dimension_id) : '',
    isRequired: question.is_required,
    displayOrder: String(question.display_order),
    scaleMin: question.scale_min ?? 1,
    scaleMax: question.scale_max ?? 5,
    scoreWeight: question.score_weight ?? 1,
    isNegative: question.is_negative ?? false,
    isActive: question.is_active,
    optionsText: (question.options ?? []).map((o) => o.label).join('\n'),
  }
}

function buildOptionValue(label, usedValues, index) {
  const normalizedBase = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const fallbackBase = normalizedBase || `OPTION_${index + 1}`
  let candidate = fallbackBase
  let suffix = 2
  while (usedValues.has(candidate)) { candidate = `${fallbackBase}_${suffix}`; suffix++ }
  usedValues.add(candidate)
  return candidate
}

function parseOptions(optionsText, existingOptions = []) {
  const existingByLabel = new Map(existingOptions.map((o) => [o.label.trim().toLowerCase(), o]))
  const usedValues = new Set(existingOptions.map((o) => o.value?.trim().toUpperCase()).filter(Boolean))
  return optionsText
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .map((label, index) => {
      const existing = existingByLabel.get(label.toLowerCase())
      if (existing) { usedValues.add(existing.value.trim().toUpperCase()); return { label, value: existing.value, score_value: existing.score_value } }
      return { label, value: buildOptionValue(label, usedValues, index), score_value: null }
    })
}

function buildMetadataForm(data) {
  return {
    name: data.name,
    description: data.description ?? '',
    category: data.category,
    isActive: data.is_active,
    versionTitle: data.current_version?.title ?? '',
  }
}

function buildDimensionForm(dimension) {
  if (!dimension) return INITIAL_DIMENSION_FORM
  return { id: dimension.id, name: dimension.name, description: dimension.description ?? '', isActive: dimension.is_active }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FieldGroup({ label, hint, optional, children }) {
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}
        {optional && <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--slate-400)', marginLeft: 6 }}>opcional</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 12, color: 'var(--slate-400)', lineHeight: 1.5 }}>{hint}</span>}
    </div>
  )
}

function inputStyle(extra = {}) {
  return {
    width: '100%',
    padding: '10px 13px',
    border: '1.5px solid var(--slate-200)',
    borderRadius: 10,
    background: 'var(--color-surface)',
    color: 'var(--slate-900)',
    fontSize: 14,
    transition: 'border-color 140ms, box-shadow 140ms',
    outline: 'none',
    ...extra,
  }
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={onChange}
        style={{
          width: 40, height: 22,
          borderRadius: 11,
          background: checked ? 'var(--blue-600)' : 'var(--slate-200)',
          position: 'relative',
          transition: 'background 160ms',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3, left: checked ? 21 : 3,
          width: 16, height: 16,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          transition: 'left 160ms',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>{label}</span>
    </label>
  )
}

function QuestionTypePicker({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {Object.entries(QUESTION_TYPE_CONFIG).map(([type, cfg]) => {
        const isActive = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '12px 8px',
              borderRadius: 12,
              border: isActive ? `2px solid ${cfg.color}` : '1.5px solid var(--slate-200)',
              background: isActive ? cfg.bg : 'var(--color-surface)',
              cursor: 'pointer',
              transition: 'all 140ms',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? cfg.color : 'var(--slate-600)' }}>{cfg.label}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              background: isActive ? cfg.color : 'var(--slate-100)',
              color: isActive ? '#fff' : 'var(--slate-500)',
              fontSize: 10, fontWeight: 700,
              transition: 'all 140ms',
            }}>{cfg.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

function FlagChip({ checked, onChange, label }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999,
      border: checked ? '1.5px solid var(--blue-300)' : '1.5px solid var(--slate-200)',
      background: checked ? 'var(--blue-50)' : 'var(--color-surface)',
      color: checked ? 'var(--blue-700)' : 'var(--slate-600)',
      fontSize: 12, fontWeight: 600,
      cursor: 'pointer', userSelect: 'none',
      transition: 'all 140ms',
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {label}
    </label>
  )
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'var(--font-display)', color: 'var(--slate-900)' }}>{title}</h3>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptySlate({ icon, title, subtitle }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      gap: 10, padding: '56px 24px',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'var(--slate-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
        color: 'var(--slate-400)',
      }}>{icon}</div>
      <strong style={{ fontSize: 15, color: 'var(--slate-700)', fontWeight: 600 }}>{title}</strong>
      <span style={{ fontSize: 13, color: 'var(--slate-400)', maxWidth: 260, lineHeight: 1.65 }}>{subtitle}</span>
    </div>
  )
}

// ─── Panel: Pesquisa ────────────────────────────────────────────────────────

function PesquisaPanel({ form, onChange, onSubmit, isSaving }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <SectionHeader
        title="Metadados da pesquisa"
        subtitle="Identidade, categoria e título da versão atual."
      />
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <FieldGroup label="Categoria">
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              placeholder="Great Place to Work…"
              style={inputStyle()}
            />
          </FieldGroup>
          <FieldGroup label="Nome da pesquisa">
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              style={inputStyle()}
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Descrição" optional>
          <textarea
            name="description"
            rows="3"
            value={form.description}
            onChange={onChange}
            style={inputStyle({ resize: 'vertical', lineHeight: 1.65 })}
          />
        </FieldGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'end' }}>
          <FieldGroup label="Título da versão atual">
            <input name="versionTitle" value={form.versionTitle} onChange={onChange} style={inputStyle()} />
          </FieldGroup>
          <div style={{ paddingBottom: 2 }}>
            <ToggleSwitch checked={form.isActive} onChange={() => onChange({ target: { name: 'isActive', type: 'checkbox', checked: !form.isActive } })} label="Pesquisa ativa" />
          </div>
        </div>

        <div style={{ paddingTop: 8, borderTop: '1px solid var(--slate-100)' }}>
          <button
            className="primary-button"
            type="submit"
            disabled={isSaving}
            style={{ minWidth: 140 }}
          >
            {isSaving ? (
              <>
                <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando…
              </>
            ) : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Panel: Dimensões ───────────────────────────────────────────────────────

function DimensoesPanel({ dimensions, form, onChange, onSubmit, onEdit, onDelete, isSaving }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 480 }}>
      {/* Form pane */}
      <div style={{
        borderRight: '1px solid var(--slate-100)',
        padding: '28px 24px',
        background: 'linear-gradient(180deg, var(--slate-50) 0%, #fff 100%)',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: form.id ? 'var(--blue-700)' : 'var(--slate-700)' }}>
              {form.id ? '✎ Editando dimensão' : '+ Nova dimensão'}
            </p>
          </div>
          {form.id && (
            <button
              className="text-button"
              type="button"
              onClick={() => onChange({ target: { name: '__reset__' } })}
            >
              Cancelar
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          <FieldGroup label="Nome">
            <input
              name="name"
              placeholder="Ex: Liderança"
              value={form.name}
              onChange={onChange}
              style={inputStyle()}
            />
          </FieldGroup>

          <FieldGroup label="Descrição" optional>
            <textarea
              name="description"
              rows="3"
              placeholder="Objetivo desta dimensão…"
              value={form.description}
              onChange={onChange}
              style={inputStyle({ resize: 'vertical', lineHeight: 1.65 })}
            />
          </FieldGroup>

          {form.id && (
            <ToggleSwitch
              checked={form.isActive}
              onChange={() => onChange({ target: { name: 'isActive', type: 'checkbox', checked: !form.isActive } })}
              label="Dimensão ativa"
            />
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={isSaving || !form.name.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSaving ? 'Salvando…' : form.id ? 'Salvar dimensão' : 'Adicionar dimensão'}
          </button>
        </form>
      </div>

      {/* List pane */}
      <div style={{ padding: '28px 24px', overflowY: 'auto' }}>
        {dimensions.length === 0 ? (
          <EmptySlate
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
            title="Nenhuma dimensão ainda"
            subtitle="Crie dimensões para organizar as perguntas por tema."
          />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {dimensions.map((dim, i) => (
              <article
                key={dim.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                  padding: '16px 18px',
                  borderRadius: 14,
                  border: '1px solid var(--slate-200)',
                  background: dim.is_active ? '#fff' : 'var(--slate-50)',
                  opacity: dim.is_active ? 1 : 0.65,
                  transition: 'border-color 140ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0 }}>
                  <div style={{
                    flexShrink: 0,
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: `hsl(${(i * 47) % 360},60%,90%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: `hsl(${(i * 47) % 360},50%,35%)`,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 3 }}>{dim.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--slate-400)', fontFamily: 'Courier New, monospace' }}>{dim.code}</span>
                    {dim.description && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.55 }}>{dim.description}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    className="icon-button"
                    title="Editar"
                    type="button"
                    onClick={() => onEdit(dim)}
                    style={{ borderRadius: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="icon-button danger"
                    title="Excluir"
                    type="button"
                    onClick={() => onDelete(dim.id)}
                    style={{ borderRadius: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel: Perguntas ────────────────────────────────────────────────────────

function PerguntasPanel({ questions, dimensions, dimensionMap, form, onChange, onSubmit, onEdit, onDelete, isSaving }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 540 }}>
      {/* Form pane */}
      <div style={{
        borderRight: '1px solid var(--slate-100)',
        padding: '24px',
        background: 'linear-gradient(180deg, var(--slate-50) 0%, #fff 100%)',
        display: 'flex', flexDirection: 'column', gap: 18,
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: form.id ? 'var(--blue-700)' : 'var(--slate-700)' }}>
            {form.id ? '✎ Editando pergunta' : '+ Nova pergunta'}
          </p>
          {form.id && (
            <button className="text-button" type="button" onClick={() => onChange({ target: { name: '__resetQ__' } })}>
              Cancelar
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
          <QuestionTypePicker
            value={form.questionType}
            onChange={(type) => onChange({ target: { name: 'questionType', value: type } })}
          />

          <FieldGroup label="Enunciado">
            <textarea
              name="questionText"
              rows="3"
              placeholder="Escreva a pergunta que o colaborador vai responder"
              value={form.questionText}
              onChange={onChange}
              style={inputStyle({ resize: 'vertical', lineHeight: 1.65 })}
            />
          </FieldGroup>

          <FieldGroup label="Instrução de apoio" optional>
            <input
              name="helpText"
              placeholder="Ex: Considere os últimos 3 meses"
              value={form.helpText}
              onChange={onChange}
              style={inputStyle()}
            />
          </FieldGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label="Ordem">
              <input
                name="displayOrder"
                type="number"
                placeholder={String(questions.length + 1)}
                value={form.displayOrder}
                onChange={onChange}
                style={inputStyle()}
              />
            </FieldGroup>

            <FieldGroup label="Dimensão">
              <select
                name="dimensionId"
                value={form.dimensionId}
                onChange={onChange}
                style={inputStyle()}
              >
                <option value="">Sem dimensão</option>
                {dimensions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.is_active ? '' : ' (inativa)'}
                  </option>
                ))}
              </select>
            </FieldGroup>
          </div>

          {form.questionType === 'SCALE_1_5' && (
            <div style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'grid', gap: 12,
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Configuração de escala
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <FieldGroup label="Mín.">
                  <input name="scaleMin" type="number" value={form.scaleMin} onChange={onChange} style={inputStyle()} />
                </FieldGroup>
                <FieldGroup label="Máx.">
                  <input name="scaleMax" type="number" value={form.scaleMax} onChange={onChange} style={inputStyle()} />
                </FieldGroup>
                <FieldGroup label="Peso">
                  <input name="scoreWeight" min="1" max="100" type="number" value={form.scoreWeight} onChange={onChange} style={inputStyle()} />
                </FieldGroup>
              </div>
              <FlagChip
                checked={form.isNegative}
                onChange={() => onChange({ target: { name: 'isNegative', type: 'checkbox', checked: !form.isNegative } })}
                label="Pontuação invertida"
              />
            </div>
          )}

          {form.questionType === 'SINGLE_CHOICE' && (
            <FieldGroup label="Opções" hint="Uma opção por linha">
              <textarea
                name="optionsText"
                rows="4"
                placeholder={"Concordo totalmente\nConcordo\nNeutro"}
                value={form.optionsText}
                onChange={onChange}
                style={inputStyle({ resize: 'vertical', lineHeight: 1.65 })}
              />
            </FieldGroup>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <FlagChip
              checked={form.isRequired}
              onChange={() => onChange({ target: { name: 'isRequired', type: 'checkbox', checked: !form.isRequired } })}
              label="Obrigatória"
            />
            <FlagChip
              checked={form.isActive}
              onChange={() => onChange({ target: { name: 'isActive', type: 'checkbox', checked: !form.isActive } })}
              label="Ativa"
            />
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={isSaving || !form.questionText.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSaving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Adicionar pergunta'}
          </button>
        </form>
      </div>

      {/* List pane */}
      <div style={{ padding: '24px', overflowY: 'auto' }}>
        {questions.length === 0 ? (
          <EmptySlate
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            title="Nenhuma pergunta ainda"
            subtitle="Crie a primeira pergunta usando o formulário ao lado."
          />
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, index) => {
              const typeConf = QUESTION_TYPE_CONFIG[q.question_type] ?? QUESTION_TYPE_CONFIG.TEXT
              const dim = q.dimension_id ? dimensionMap.get(q.dimension_id) : null
              const isEditing = form.id === q.id

              return (
                <li
                  key={q.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px',
                    borderRadius: 14,
                    border: isEditing ? '2px solid var(--blue-400)' : '1.5px solid var(--slate-200)',
                    background: isEditing ? 'var(--blue-50)' : '#fff',
                    boxShadow: isEditing ? '0 0 0 4px rgba(59,130,246,.07)' : 'none',
                    transition: 'all 140ms',
                  }}
                >
                  {/* Order number */}
                  <div style={{
                    flexShrink: 0, width: 30, height: 30,
                    borderRadius: 8,
                    background: isEditing ? 'var(--blue-100)' : 'var(--slate-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: isEditing ? 'var(--blue-700)' : 'var(--slate-500)',
                  }}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 500, color: 'var(--slate-800)', lineHeight: 1.5 }}>
                      {q.question_text}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {/* Type badge */}
                      <span style={{
                        padding: '3px 9px', borderRadius: 6,
                        background: typeConf.bg, color: typeConf.color,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {typeConf.label}
                      </span>

                      {/* Code */}
                      <span style={{
                        padding: '3px 9px', borderRadius: 6,
                        background: 'var(--slate-100)', color: 'var(--slate-500)',
                        fontSize: 11, fontFamily: 'Courier New, monospace',
                      }}>
                        {q.code}
                      </span>

                      {/* Dimension */}
                      {dim && (
                        <span style={{
                          padding: '3px 9px', borderRadius: 6,
                          background: 'var(--blue-50)', color: 'var(--blue-700)',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {dim.name}
                        </span>
                      )}

                      {/* Score weight */}
                      {q.question_type === 'SCALE_1_5' && (
                        <span style={{
                          padding: '3px 9px', borderRadius: 6,
                          background: 'var(--slate-100)', color: 'var(--slate-600)',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          Peso {q.score_weight ?? 1}×
                        </span>
                      )}

                      {/* Invertida */}
                      {q.question_type === 'SCALE_1_5' && q.is_negative && (
                        <span style={{
                          padding: '3px 9px', borderRadius: 6,
                          background: '#ffedd5', color: '#9a3412',
                          fontSize: 11, fontWeight: 600,
                        }}>
                          Invertida
                        </span>
                      )}

                      {/* Flags */}
                      {q.is_required && (
                        <span style={{ padding: '3px 9px', borderRadius: 6, background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: 11 }}>
                          Obrigatória
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="icon-button"
                      title="Editar"
                      type="button"
                      onClick={() => onEdit(q)}
                      style={{ borderRadius: 8 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      className="icon-button danger"
                      title="Excluir"
                      type="button"
                      onClick={() => onDelete(q.id)}
                      style={{ borderRadius: 8 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

// ─── Panel: Publicar ────────────────────────────────────────────────────────

function PublicarPanel({ form, onChange, onSubmit, campaigns, canPublish, hasDates, hasValidDateRange, isPublishing, surveyId }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>
      <SectionHeader
        title="Publicar pesquisa"
        subtitle="Defina o período de coleta e lance a campanha para os colaboradores."
      />

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 20 }}>
        {/* Date range */}
        <div style={{
          padding: '20px 22px',
          borderRadius: 14,
          border: '1.5px solid var(--slate-200)',
          background: 'var(--slate-50)',
          display: 'grid', gap: 16,
        }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Período da campanha
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FieldGroup label="Abertura">
              <input
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={onChange}
                style={inputStyle()}
              />
            </FieldGroup>
            <FieldGroup label="Encerramento">
              <input
                name="endAt"
                type="datetime-local"
                value={form.endAt}
                onChange={onChange}
                style={inputStyle()}
              />
            </FieldGroup>
          </div>

          {!hasValidDateRange && hasDates && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10,
              background: '#fef3c7', border: '1px solid #fde68a',
              color: '#b45309', fontSize: 13, fontWeight: 500,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              A data de encerramento deve ser igual ou posterior à abertura.
            </div>
          )}
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={!canPublish || isPublishing}
          style={{ alignSelf: 'flex-start', paddingLeft: 24, paddingRight: 24 }}
        >
          {isPublishing ? (
            <>
              <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Publicando…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
              Publicar pesquisa
            </>
          )}
        </button>
      </form>

      {/* Campaigns history */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 11, fontWeight: 700, color: 'var(--slate-400)',
          textTransform: 'uppercase', letterSpacing: '.06em',
          marginBottom: 16,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
          <span>Aplicações anteriores</span>
          <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
        </div>

        {campaigns.length === 0 ? (
          <EmptySlate
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>}
            title="Pesquisa ainda não publicada"
            subtitle="Defina o período acima e publique para os colaboradores."
          />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 18px',
                  borderRadius: 14,
                  border: '1.5px solid var(--slate-200)',
                  background: '#fff',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--slate-800)', marginBottom: 4 }}>
                    {campaign.name}
                  </strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`status-pill ${campaign.status === 'ACTIVE' ? 'active' : 'inactive'}`} style={{ fontSize: 11, padding: '3px 10px' }}>
                      {campaign.status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                      {campaign.audience_count} colaboradores
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="secondary-link-button" style={{ padding: '7px 12px', fontSize: 12 }} to={`/admin/campaigns/${campaign.id}/responses`}>
                    Respostas
                  </Link>
                  <Link className="secondary-link-button" style={{ padding: '7px 12px', fontSize: 12 }} to={`/admin/campaigns/${campaign.id}/kpis`}>
                    KPIs
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AdminSurveyDetailPage() {
  const { surveyId } = useParams()
  const { token } = useAuth()
  const [survey, setSurvey] = useState(null)
  const [metadataForm, setMetadataForm] = useState(INITIAL_METADATA_FORM)
  const [questionForm, setQuestionForm] = useState(INITIAL_QUESTION_FORM)
  const [dimensionForm, setDimensionForm] = useState(INITIAL_DIMENSION_FORM)
  const [publishForm, setPublishForm] = useState(INITIAL_PUBLISH_FORM)
  const [activeTab, setActiveTab] = useState('pesquisa')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [isSavingDimension, setIsSavingDimension] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const data = await getAdminSurveyDetail(token, surveyId)
        if (!isMounted) return
        setSurvey(data)
        setMetadataForm(buildMetadataForm(data))
        setErrorMessage('')
      } catch (error) {
        if (isMounted) setErrorMessage(error.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [surveyId, token])

  const questions = useMemo(() => survey?.current_version?.questions ?? [], [survey])
  const dimensions = useMemo(() => survey?.dimensions ?? [], [survey])
  const dimensionMap = useMemo(() => new Map(dimensions.map((d) => [d.id, d])), [dimensions])
  const campaigns = useMemo(() => survey?.campaigns ?? [], [survey])
  const hasDates = Boolean(publishForm.startAt && publishForm.endAt)
  const hasValidDateRange = hasDates && new Date(publishForm.endAt) >= new Date(publishForm.startAt)
  const canPublish = hasDates && hasValidDateRange

  function applySurveyUpdate(data, msg) {
    setSurvey(data)
    setMetadataForm(buildMetadataForm(data))
    setSuccessMessage(msg)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 3500)
  }

  // Metadata handlers
  function handleMetadataChange(e) {
    const { name, value, type, checked } = e.target
    setMetadataForm((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleMetadataSubmit(e) {
    e.preventDefault()
    setIsSavingMetadata(true)
    setErrorMessage('')
    try {
      const data = await updateAdminSurvey(token, surveyId, {
        name: metadataForm.name,
        description: metadataForm.description || null,
        category: metadataForm.category,
        is_active: metadataForm.isActive,
        version_title: metadataForm.versionTitle,
      })
      applySurveyUpdate(data, 'Metadados atualizados com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingMetadata(false)
    }
  }

  // Dimension handlers
  function handleDimensionChange(e) {
    const { name, value, type, checked } = e.target
    if (name === '__reset__') { setDimensionForm(INITIAL_DIMENSION_FORM); return }
    setDimensionForm((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleDimensionSubmit(e) {
    e.preventDefault()
    setIsSavingDimension(true)
    setErrorMessage('')
    try {
      const payload = { name: dimensionForm.name, description: dimensionForm.description || null, ...(dimensionForm.id ? { is_active: dimensionForm.isActive } : {}) }
      const data = dimensionForm.id
        ? await updateSurveyDimension(token, dimensionForm.id, payload)
        : await createSurveyDimension(token, surveyId, payload)
      applySurveyUpdate(data, dimensionForm.id ? 'Dimensão atualizada.' : 'Dimensão criada.')
      setDimensionForm(INITIAL_DIMENSION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingDimension(false)
    }
  }

  async function handleDimensionDelete(dimensionId) {
    setErrorMessage('')
    try {
      const data = await deleteSurveyDimension(token, dimensionId)
      applySurveyUpdate(data, 'Dimensão removida.')
      if (dimensionForm.id === dimensionId) setDimensionForm(INITIAL_DIMENSION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  // Question handlers
  function handleQuestionChange(e) {
    const { name, value, type, checked } = e.target
    if (name === '__resetQ__') { setQuestionForm(INITIAL_QUESTION_FORM); return }
    setQuestionForm((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleQuestionSubmit(e) {
    e.preventDefault()
    setIsSavingQuestion(true)
    setErrorMessage('')
    try {
      const order = questionForm.displayOrder ? Number(questionForm.displayOrder) : questions.length + 1
      const currentQuestion = questionForm.id ? questions.find((q) => q.id === questionForm.id) : null
      const payload = {
        code: questionForm.code || `Q${order}`,
        question_text: questionForm.questionText,
        help_text: questionForm.helpText || null,
        question_type: questionForm.questionType,
        dimension_id: questionForm.dimensionId ? Number(questionForm.dimensionId) : null,
        is_required: questionForm.isRequired,
        display_order: order,
        scale_min: Number(questionForm.scaleMin),
        scale_max: Number(questionForm.scaleMax),
        score_weight: questionForm.questionType === 'SCALE_1_5' ? Number(questionForm.scoreWeight) : 1,
        is_negative: questionForm.questionType === 'SCALE_1_5' ? questionForm.isNegative : false,
        is_active: questionForm.isActive,
        options: parseOptions(questionForm.optionsText, currentQuestion?.options ?? []),
      }
      const data = questionForm.id
        ? await updateSurveyQuestion(token, questionForm.id, payload)
        : await createSurveyQuestion(token, surveyId, payload)
      applySurveyUpdate(data, questionForm.id ? 'Pergunta atualizada.' : 'Pergunta criada.')
      setQuestionForm(INITIAL_QUESTION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingQuestion(false)
    }
  }

  async function handleQuestionDelete(questionId) {
    setErrorMessage('')
    try {
      const data = await deleteSurveyQuestion(token, questionId)
      applySurveyUpdate(data, 'Pergunta removida.')
      if (questionForm.id === questionId) setQuestionForm(INITIAL_QUESTION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  // Publish handlers
  function handlePublishChange(e) {
    const { name, value } = e.target
    setPublishForm((c) => ({ ...c, [name]: value }))
  }

  async function handlePublishSubmit(e) {
    e.preventDefault()
    setIsPublishing(true)
    setErrorMessage('')
    try {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const dateTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
      const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      const data = await publishAdminSurvey(token, surveyId, {
        campaign_code: `${survey.code}-${dateTag}`,
        campaign_name: `${survey.name} - ${monthLabel}`,
        campaign_description: null,
        start_at: publishForm.startAt,
        end_at: publishForm.endAt,
        is_anonymous: true,
        allows_draft: false,
      })
      applySurveyUpdate(data, 'Pesquisa publicada com sucesso.')
      setPublishForm(INITIAL_PUBLISH_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsPublishing(false)
    }
  }

  // ─── Loading / Not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="admin-view">
        <section className="admin-panel-card">
          <div className="empty-state">
            <div style={{ width: 24, height: 24, border: '2.5px solid var(--blue-100)', borderTopColor: 'var(--blue-600)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <strong>Carregando pesquisa…</strong>
          </div>
        </section>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="admin-view">
        <section className="admin-panel-card">
          <strong>Pesquisa não encontrada</strong>
          <p>Volte para a listagem para escolher uma pesquisa válida.</p>
          <Link className="back-link" to="/admin/surveys">← Voltar para pesquisas</Link>
        </section>
      </div>
    )
  }

  const activeTabCfg = TABS.find((t) => t.id === activeTab)

  // Badge counts per tab
  const badgeCounts = {
    pesquisa: null,
    dimensoes: dimensions.length || null,
    perguntas: questions.length || null,
    publicar: campaigns.length || null,
  }

  return (
    <div className="admin-view">
      {/* ── Page header ── */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gerenciar pesquisa</span>
          <h2>{survey.name}</h2>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Courier New, monospace', fontSize: 12, fontWeight: 700, background: 'var(--slate-100)', padding: '3px 9px', borderRadius: 6, color: 'var(--slate-600)' }}>
              {survey.code}
            </span>
            <span style={{ color: 'var(--slate-300)' }}>·</span>
            <span>{survey.category}</span>
            <span style={{ color: 'var(--slate-300)' }}>·</span>
            <span>{questions.length} pergunta{questions.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <Link className="secondary-link-button" to="/admin/surveys">← Voltar</Link>
      </div>

      {/* ── Feedback messages ── */}
      {errorMessage && (
        <div className="form-error">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="form-success" style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp .2s ease both' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {successMessage}
        </div>
      )}

      {/* ── Workspace card ── */}
      <div style={{
        borderRadius: 20,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--slate-100)',
          background: 'var(--slate-50)',
          padding: '0 4px',
          gap: 2,
        }}>
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            const badge = badgeCounts[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '15px 20px',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--blue-600)' : 'transparent'}`,
                  color: isActive ? 'var(--blue-700)' : 'var(--slate-500)',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 140ms',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
                {tab.label}
                {badge !== null && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 20, height: 20, padding: '0 6px',
                    borderRadius: 10,
                    background: isActive ? 'var(--blue-100)' : 'var(--slate-200)',
                    color: isActive ? 'var(--blue-700)' : 'var(--slate-600)',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab panels */}
        {activeTab === 'pesquisa' && (
          <PesquisaPanel
            form={metadataForm}
            onChange={handleMetadataChange}
            onSubmit={handleMetadataSubmit}
            isSaving={isSavingMetadata}
          />
        )}

        {activeTab === 'dimensoes' && (
          <DimensoesPanel
            dimensions={dimensions}
            form={dimensionForm}
            onChange={handleDimensionChange}
            onSubmit={handleDimensionSubmit}
            onEdit={(d) => setDimensionForm(buildDimensionForm(d))}
            onDelete={handleDimensionDelete}
            isSaving={isSavingDimension}
          />
        )}

        {activeTab === 'perguntas' && (
          <PerguntasPanel
            questions={questions}
            dimensions={dimensions}
            dimensionMap={dimensionMap}
            form={questionForm}
            onChange={handleQuestionChange}
            onSubmit={handleQuestionSubmit}
            onEdit={(q) => setQuestionForm(buildQuestionForm(q))}
            onDelete={handleQuestionDelete}
            isSaving={isSavingQuestion}
          />
        )}

        {activeTab === 'publicar' && (
          <PublicarPanel
            form={publishForm}
            onChange={handlePublishChange}
            onSubmit={handlePublishSubmit}
            campaigns={campaigns}
            canPublish={canPublish}
            hasDates={hasDates}
            hasValidDateRange={hasValidDateRange}
            isPublishing={isPublishing}
            surveyId={surveyId}
          />
        )}
      </div>
    </div>
  )
}