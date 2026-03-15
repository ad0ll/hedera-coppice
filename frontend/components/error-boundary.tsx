"use client";

import { Component, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

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
        <div role="alert" aria-live="assertive">
          <EmptyState
            variant="danger"
            icon={<svg className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
            title="Something went wrong"
            description={this.state.error?.message || "An unexpected error occurred. Try reloading the page."}
            action={
              <button onClick={() => window.location.reload()} className="btn-primary px-6">
                Reload Page
              </button>
            }
            wrapperClassName="min-h-screen bg-surface flex items-center justify-center p-8"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
