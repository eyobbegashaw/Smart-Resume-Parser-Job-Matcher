import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const isAm = typeof document !== 'undefined' && document.documentElement?.lang === 'am';
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="surface-card max-w-md rounded-3xl p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAm ? 'ያልተጠበቀ ስህተት ተከስቷል' : 'Something went wrong'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {isAm
                ? 'ለመቀጠል እባክዎ ገጹን እንደገና ይጫኑ።'
                : 'Please refresh the page to continue.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary mt-5"
            >
              {isAm ? 'ገጹን ዳግም ጫን' : 'Reload Page'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
