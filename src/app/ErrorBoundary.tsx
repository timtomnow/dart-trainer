import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('App crashed:', error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoToSettings = () => {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    window.location.assign(`${base}/settings`);
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-4 dark:bg-slate-950"
      >
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The app hit an unexpected error. Your saved data is still on this
            device. You can reload, or open Settings to export a backup first.
          </p>
          <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px]">
              {error.message || String(error)}
            </pre>
          </details>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Reload app
            </button>
            <button
              type="button"
              onClick={this.handleGoToSettings}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }
}
