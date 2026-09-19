import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  FileSearchOutlined,
  InfoCircleFilled,
  LockOutlined,
  ToolFilled,
} from "@ant-design/icons";
import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { classes } from "../internal/classes.js";

export type ResultStatus = "403" | "404" | "500" | "error" | "info" | "success" | "warning";
export type ResultSemanticName = "body" | "extra" | "icon" | "root" | "subTitle" | "title";
export type ResultClassNames = Partial<Record<ResultSemanticName, string>>;
export type ResultStyles = Partial<Record<ResultSemanticName, CSSProperties>>;

export interface ResultProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly classNames?:
    | ResultClassNames
    | ((info: { readonly props: ResultProps }) => ResultClassNames);
  readonly extra?: ReactNode;
  readonly icon?: ReactNode;
  readonly status?: ResultStatus | 403 | 404 | 500;
  readonly styles?: ResultStyles | ((info: { readonly props: ResultProps }) => ResultStyles);
  readonly subTitle?: ReactNode;
  readonly title?: ReactNode;
}

const statusIcons: Record<ResultStatus, ReactNode> = {
  "403": <LockOutlined />,
  "404": <FileSearchOutlined />,
  "500": <ToolFilled />,
  error: <CloseCircleFilled />,
  info: <InfoCircleFilled />,
  success: <CheckCircleFilled />,
  warning: <ExclamationCircleFilled />,
};

export const Result = forwardRef<HTMLDivElement, ResultProps>(function Result(resultProps, ref) {
  const {
    children,
    className,
    classNames: classNamesProp,
    extra,
    icon,
    status = "info",
    style,
    styles: stylesProp,
    subTitle,
    title,
    ...rootProps
  } = resultProps;
  const resolvedStatus = String(status) as ResultStatus;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: resultProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: resultProps }) : (stylesProp ?? {});
  const role =
    rootProps.role ??
    (resolvedStatus === "error" || Number(resolvedStatus) >= 400 ? "alert" : "status");

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-result",
        `is-${resolvedStatus}`,
        resolvedClassNames.root,
        className,
      )}
      ref={ref}
      role={role}
      style={{ ...resolvedStyles.root, ...style }}
    >
      <div
        aria-hidden="true"
        className={classes("launch-ui-result-icon", resolvedClassNames.icon)}
        style={resolvedStyles.icon}
      >
        {icon ?? statusIcons[resolvedStatus]}
      </div>
      {title !== null && title !== undefined ? (
        <div
          className={classes("launch-ui-result-title", resolvedClassNames.title)}
          style={resolvedStyles.title}
        >
          {title}
        </div>
      ) : null}
      {subTitle !== null && subTitle !== undefined ? (
        <div
          className={classes("launch-ui-result-subtitle", resolvedClassNames.subTitle)}
          style={resolvedStyles.subTitle}
        >
          {subTitle}
        </div>
      ) : null}
      {extra !== null && extra !== undefined ? (
        <div
          className={classes("launch-ui-result-extra", resolvedClassNames.extra)}
          style={resolvedStyles.extra}
        >
          {extra}
        </div>
      ) : null}
      {children !== null && children !== undefined ? (
        <div
          className={classes("launch-ui-result-body", resolvedClassNames.body)}
          style={resolvedStyles.body}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
});
