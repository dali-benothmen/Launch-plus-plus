import { ApiError } from "@launchpp/api-client";
import { Button, Result, Space } from "@launchpp/ui";
import { useNavigate, useRouteError } from "react-router-dom";

interface FailureContent {
  readonly status: 403 | 404 | 500 | "warning";
  readonly subTitle: string;
  readonly title: string;
}

function failureContent(error: unknown): FailureContent {
  const status =
    error instanceof ApiError
      ? error.status
      : typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : undefined;

  if (status === 403) {
    return {
      status: 403,
      subTitle: "You do not have permission to open this resource.",
      title: "Access denied",
    };
  }
  if (status === 404) {
    return {
      status: 404,
      subTitle: "It may have been removed, archived, or moved.",
      title: "Resource unavailable",
    };
  }
  if (status === 503) {
    return {
      status: "warning",
      subTitle: "Launch++ cannot reach this resource right now. Please try again.",
      title: "Temporarily unavailable",
    };
  }
  return {
    status: 500,
    subTitle: error instanceof Error ? error.message : "Launch++ could not complete this request.",
    title: "Something went wrong",
  };
}

export interface ResourceFailureProps {
  readonly error: unknown;
  readonly onRetry?: () => void;
}

export function ResourceFailure({ error, onRetry }: ResourceFailureProps) {
  const navigate = useNavigate();
  const content = failureContent(error);

  return (
    <section className="page-stack">
      <Result
        extra={
          <Space wrap>
            {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
            <Button onClick={() => navigate("/app")} variant="primary">
              Go to My Work
            </Button>
          </Space>
        }
        status={content.status}
        subTitle={content.subTitle}
        title={content.title}
      />
    </section>
  );
}

export function RouteFailurePage() {
  return <ResourceFailure error={useRouteError()} />;
}

export function RouteNotFoundPage() {
  return <ResourceFailure error={new ApiError(404, "The requested page does not exist.")} />;
}
