"use client";

import { Component, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorCircleIcon } from "@/components/ui/icons";

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
            icon={<ErrorCircleIcon className="w-6 h-6 text-bond-red" />}
            title="Something went wrong"
            description={this.state.error?.message || "An unexpected error occurred. Try reloading the page."}
            action={
              <button onClick={() => window.location.reload()} className="btn-primary px-6">
                Reload Page
              </button>
            }
            className="max-w-lg w-full p-8"
            wrapperClassName="min-h-screen bg-surface flex items-center justify-center p-8"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
