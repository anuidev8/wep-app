import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorSeverity, categorizeError, CategorizedError } from '../utils/errorTypes';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: CategorizedError | null;
  errorInfo: ErrorInfo | null;
}

/**
 * CRIT-6: Enhanced error boundary with error type categorization
 * HIGH-7: Error-specific messages
 * HIGH-14: Resets state on recovery
 */
export class SubscriptionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // CRIT-6: Categorize error
    const categorized = categorizeError(error);
    
    return {
      hasError: true,
      error: categorized,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const categorized = categorizeError(error);
    
    // HIGH-13: Log error with context
    console.error('[SubscriptionErrorBoundary] Error caught:', {
      error: categorized.error.message,
      severity: categorized.severity,
      category: categorized.category,
      code: categorized.code,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    
    // Log to error tracking service if enabled
    if (import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true') {
      // TODO: Send to error tracking service
      // logToErrorService(categorized, { errorInfo });
    }
    
    this.setState({
      error: categorized,
      errorInfo,
    });
  }

  handleReset = () => {
    // HIGH-14: Reset component state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { error, severity } = this.state.error;
      
      // HIGH-7: Error-specific messages
      let title = 'Something went wrong';
      let message = 'An unexpected error occurred.';
      let showRetry = false;
      
      if (severity === ErrorSeverity.FATAL) {
        title = 'Configuration Error';
        message = 'Subscription service misconfigured. Please contact support.';
        showRetry = false;
      } else if (severity === ErrorSeverity.RECOVERABLE) {
        title = 'Connection Error';
        message = 'Connection failed. Check your internet and try again.';
        showRetry = true;
      } else {
        title = 'Error';
        message = error.message || 'An error occurred.';
        showRetry = true;
      }
      
      return (
        <div className="error-boundary">
          <h2>{title}</h2>
          <p>{message}</p>
          {showRetry && (
            <button onClick={this.handleReset}>
              Try Again
            </button>
          )}
          {severity === ErrorSeverity.FATAL && (
            <p>Error Code: {this.state.error.code || 'N/A'}</p>
          )}
        </div>
      );
    }
    
    return this.props.children;
  }
}
