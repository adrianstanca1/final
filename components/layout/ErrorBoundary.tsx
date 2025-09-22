import React from 'react';

interface State { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold">Something went wrong.</h2>
          <p className="text-sm text-muted-foreground">Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

