import { Component, type ReactNode } from 'react'
import { StatusMessage } from '../../StatusMessage/StatusMessage'

interface WidgetErrorBoundaryProps {
  children: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
}

/**
 * Isolates a single widget's render/lazy-load failure so it can never break
 * any other widget's render (per the UI contract's Per-Widget Contract). A
 * class component because React has no hook-based error boundary API.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  override state: WidgetErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return <StatusMessage message="Este widget no está disponible." tone="notice" />
    }
    return this.props.children
  }
}
