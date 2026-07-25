import { Button } from "@workspace/ui/components/button";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in app:", error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public retry = () => {
    this.reset();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button type="button" onClick={this.reset} className="mt-4">
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
