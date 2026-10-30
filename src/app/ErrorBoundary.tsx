import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { PageLoadFailure } from './RouteErrorPage'

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error(error)
  }
  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: undefined })
  }
  render() {
    if (this.state.error) {
      return <PageLoadFailure />
    }
    return this.props.children
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <Boundary resetKey={location.key}>{children}</Boundary>
}
