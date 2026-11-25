import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-h2 font-bold text-text">Something went wrong</h2>
          <p className="mt-2 max-w-md text-body-sm text-muted">
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-body-sm font-semibold text-white shadow-md transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            <RefreshCw className="size-4" />
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
