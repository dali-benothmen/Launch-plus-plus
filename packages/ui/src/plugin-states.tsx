import { PLUGIN_ERROR_CODES, toLaunchppError } from "@launchpp/sdk";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "./components/button/index.js";
import { Empty } from "./components/empty/index.js";
import { Result } from "./components/result/index.js";
import { Spin } from "./components/spin/index.js";

export interface PluginLoadingStateProps {
  readonly description?: ReactNode;
}

export function PluginLoadingState({ description = "Loading" }: PluginLoadingStateProps) {
  return (
    <div aria-live="polite" className="launch-ui-plugin-state">
      <Spin description={description} />
    </div>
  );
}

export interface PluginEmptyStateProps {
  readonly action?: ReactNode;
  readonly description?: ReactNode;
}

export function PluginEmptyState({ action, description = "No data" }: PluginEmptyStateProps) {
  return (
    <div className="launch-ui-plugin-state">
      <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE}>
        {action}
      </Empty>
    </div>
  );
}

export interface PluginRetryStateProps {
  readonly description?: ReactNode;
  readonly onRetry?: (() => void) | undefined;
  readonly retryLabel?: ReactNode;
  readonly title?: ReactNode;
}

function retryAction(onRetry: (() => void) | undefined, retryLabel: ReactNode) {
  return onRetry === undefined ? undefined : (
    <Button onClick={onRetry} variant="primary">
      {retryLabel}
    </Button>
  );
}

export interface PluginErrorStateProps extends PluginRetryStateProps {
  readonly error?: unknown;
}

export function PluginErrorState({
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  title = "Something went wrong",
}: PluginErrorStateProps) {
  const resolvedError = error === undefined ? undefined : toLaunchppError(error);
  return (
    <div className="launch-ui-plugin-state">
      <Result
        extra={retryAction(onRetry, retryLabel)}
        status="error"
        subTitle={description ?? resolvedError?.message}
        title={title}
      />
    </div>
  );
}

export function PluginForbiddenState({
  description = "You do not have permission to use this plugin feature.",
  onRetry,
  retryLabel = "Try again",
  title = "Access denied",
}: PluginRetryStateProps) {
  return (
    <div className="launch-ui-plugin-state">
      <Result
        extra={retryAction(onRetry, retryLabel)}
        status="403"
        subTitle={description}
        title={title}
      />
    </div>
  );
}

export function PluginUnavailableState({
  description = "This plugin feature is temporarily unavailable.",
  onRetry,
  retryLabel = "Try again",
  title = "Unavailable",
}: PluginRetryStateProps) {
  return (
    <div className="launch-ui-plugin-state">
      <Result
        extra={retryAction(onRetry, retryLabel)}
        status="warning"
        subTitle={description}
        title={title}
      />
    </div>
  );
}

export interface PluginAsyncStateProps {
  readonly children: ReactNode;
  readonly empty?: boolean;
  readonly emptyAction?: ReactNode;
  readonly emptyDescription?: ReactNode;
  readonly error?: unknown;
  readonly loading?: boolean;
  readonly loadingDescription?: ReactNode;
  readonly onRetry?: () => void;
}

export function PluginAsyncState({
  children,
  empty = false,
  emptyAction,
  emptyDescription,
  error,
  loading = false,
  loadingDescription,
  onRetry,
}: PluginAsyncStateProps) {
  if (loading) return <PluginLoadingState description={loadingDescription} />;
  if (error !== undefined) {
    const resolvedError = toLaunchppError(error);
    if (resolvedError.code === PLUGIN_ERROR_CODES.forbidden) {
      return <PluginForbiddenState description={resolvedError.message} onRetry={onRetry} />;
    }
    if (resolvedError.code === PLUGIN_ERROR_CODES.unavailable) {
      return <PluginUnavailableState description={resolvedError.message} onRetry={onRetry} />;
    }
    return <PluginErrorState error={resolvedError} onRetry={onRetry} />;
  }
  if (empty) return <PluginEmptyState action={emptyAction} description={emptyDescription} />;
  return children;
}

export interface PluginErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  readonly onError?: (error: Error, info: ErrorInfo) => void;
  readonly resetKey?: string | number;
}

interface PluginErrorBoundaryState {
  readonly error: Error | undefined;
}

export class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  override state: PluginErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: PluginErrorBoundaryProps): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error !== undefined) this.reset();
  }

  readonly reset = () => this.setState({ error: undefined });

  override render() {
    const { error } = this.state;
    if (error === undefined) return this.props.children;
    if (typeof this.props.fallback === "function") return this.props.fallback(error, this.reset);
    return this.props.fallback ?? <PluginErrorState error={error} onRetry={this.reset} />;
  }
}
