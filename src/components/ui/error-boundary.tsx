import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  isChunkError = () => {
    const msg = this.state.error?.message || "";
    return msg.includes("dynamically imported module") || msg.includes("Failed to fetch");
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunk = this.isChunkError();

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-1">
            {isChunk ? "New version available" : "Something went wrong"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {isChunk
              ? "A new version of the app is available. Please reload to get the latest update."
              : this.state.error?.message || "An unexpected error occurred. Please try again."}
          </p>
          <Button variant="outline" onClick={isChunk ? this.handleReload : this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {isChunk ? "Reload Page" : "Try Again"}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
