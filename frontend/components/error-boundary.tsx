"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-8">
          <div className="bg-surface-2 border border-border rounded-xl p-8 max-w-lg w-full text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-bond-red/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-text-muted mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-bond-green text-black px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-bond-green/90 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
