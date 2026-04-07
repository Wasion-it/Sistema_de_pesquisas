import { useEffect, useState } from 'react'

import { StatusPanel } from '../components/StatusPanel'
import { getApiStatus } from '../services/api'

export function HomePage() {
  const [apiStatus, setApiStatus] = useState('carregando...')

  useEffect(() => {
    let isMounted = true

    getApiStatus()
      .then((data) => {
        if (isMounted) {
          setApiStatus(data.status)
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('indisponivel')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="page-shell">
      <section className="hero-card">
        <span className="eyebrow">Estrutura inicial</span>
        <h1>Sistema de Pesquisas</h1>
        <p>
          Frontend em React conectado a um backend FastAPI com organizacao simples
          para crescer sem bagunca.
        </p>

        <StatusPanel status={apiStatus} />
      </section>
    </main>
  )
}
