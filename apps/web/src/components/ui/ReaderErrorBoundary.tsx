import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type ReaderErrorBoundaryProps = {
  children: ReactNode;
  onRecover: () => void;
  resetKey: string | null;
};

type ReaderErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class ReaderErrorBoundary extends Component<ReaderErrorBoundaryProps, ReaderErrorBoundaryState> {
  state: ReaderErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): ReaderErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Reader crashed unexpectedly.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ReaderErrorBoundary caught:", error, info);
  }

  componentDidUpdate(prevProps: ReaderErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-red-300/40 bg-red-50/70 p-6 text-center dark:border-red-700/40 dark:bg-red-950/30">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Reader crashed</h2>
        <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">
          {this.state.errorMessage}
        </p>
        <button
          type="button"
          onClick={this.props.onRecover}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Back to Library
        </button>
      </div>
    );
  }
}
