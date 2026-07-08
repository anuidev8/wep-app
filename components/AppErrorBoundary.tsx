import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Root error boundary to prevent white screen / crash on uncaught React errors.
 * Catches errors and shows a fallback UI instead of crashing the app.
 * In dev/live reload: shows error details and "Try again" to recover after HMR.
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Reset boundary when Vite HMR applies (live reload) so we don't stay stuck on error screen
    if (typeof import.meta !== 'undefined' && import.meta.hot) {
      import.meta.hot.on('vite:afterUpdate', () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      });
    }
    window.addEventListener('errorboundary:reset', this.handleReset);
  }

  componentWillUnmount() {
    window.removeEventListener('errorboundary:reset', this.handleReset);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
    this.setState((s) => (s.errorInfo ? null : { errorInfo }));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    // Full reload; on Capacitor this reloads the WebView (dev server or bundled app).
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: '#0F1A2E',
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: 16, fontSize: 18 }}>Something went wrong</h2>
          <p style={{ marginBottom: 24, fontSize: 14, opacity: 0.8 }}>
            The app encountered an error. Please close and reopen the app.
          </p>
          {isDev && error && (
            <pre
              style={{
                marginBottom: 24,
                padding: 12,
                fontSize: 11,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 120,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {errorInfo?.componentStack && `\n\n${errorInfo.componentStack}`}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {isDev && (
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            )}
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                backgroundColor: '#D4A574',
                color: '#0F1A2E',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
