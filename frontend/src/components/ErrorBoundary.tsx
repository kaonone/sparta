import React from 'react';

interface IState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<{}, IState> {
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  public state: IState = { hasError: false, error: null };

  componentDidCatch(error: any, info: any) {
    console.error(error, info);
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;
    if (hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <pre>{error.toString()}</pre>
        </div>
      );
    }

    return children;
  }
}
