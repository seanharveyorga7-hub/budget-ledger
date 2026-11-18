import { Component } from 'react';

/**
 * Last-resort screen when a render error would otherwise unmount the whole app
 * and leave a blank page. Shows the message so it can be reported, plus a reload.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="center-screen">
        <div className="card narrow">
          <div className="card-body stack">
            <h1 className="page-title">Something went wrong</h1>
            <p className="muted">The page hit an unexpected error. Reloading usually fixes it. If it keeps happening, send this message to your admin:</p>
            <pre className="error-details">{String(error?.message || error)}</pre>
            <div>
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
