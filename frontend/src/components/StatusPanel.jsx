export function StatusPanel({ status }) {
  return (
    <div className="status-row">
      <strong>Status da API</strong>
      <span className="status-badge">{status}</span>
    </div>
  )
}
