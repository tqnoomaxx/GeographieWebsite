import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(error)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md p-6 text-center">
          <p className="mb-1 text-lg font-medium">Etwas ist schiefgelaufen.</p>
          <p className="mb-4 text-sm text-ink-2">Bitte versuche es erneut.</p>
          <button className="btn-primary" onClick={() => location.reload()}>
            Erneut versuchen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
