"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  section: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-static border-bond-red/20 text-center py-8" role="alert">
          <p className="text-sm text-bond-red mb-1">Failed to load {this.props.section}</p>
          <p className="text-xs text-text-muted">This section encountered an error. Other sections continue to work.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-xs text-bond-green hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
