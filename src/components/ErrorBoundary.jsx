import { Component } from 'react'
import { LuTriangleAlert } from 'react-icons/lu'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full px-6 text-center">
        <LuTriangleAlert size={32} className="text-neon" />
        <div className="font-display text-lg tracking-[0.15em] text-neon">ALGO DEU ERRADO</div>
        <div className="font-mono text-xs text-muted">
          Essa tela travou. Seu progresso já está salvo — recarregue pra continuar.
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary max-w-[220px]">
          RECARREGAR
        </button>
      </div>
    )
  }
}
