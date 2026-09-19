import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from "@ant-design/icons";
import {
  type AriaAttributes,
  Component,
  type ComponentType,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type AlertType = "error" | "info" | "success" | "warning";
export type AlertVariant = "filled" | "outlined";
export type AlertSemanticName =
  | "actions"
  | "close"
  | "description"
  | "icon"
  | "root"
  | "section"
  | "title";
export type AlertClassNames = Partial<Record<AlertSemanticName, string>>;
export type AlertStyles = Partial<Record<AlertSemanticName, CSSProperties>>;

export interface AlertClosableConfig extends AriaAttributes {
  readonly afterClose?: () => void;
  readonly closeIcon?: ReactNode | true;
  readonly onClose?: MouseEventHandler<HTMLButtonElement>;
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly action?: ReactNode;
  readonly banner?: boolean;
  readonly classNames?:
    | AlertClassNames
    | ((info: { readonly props: AlertProps }) => AlertClassNames);
  readonly closable?: AlertClosableConfig | boolean;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly showIcon?: boolean;
  /** @deprecated Use `type` instead. */
  readonly status?: AlertType;
  readonly styles?: AlertStyles | ((info: { readonly props: AlertProps }) => AlertStyles);
  readonly title: ReactNode;
  readonly type?: AlertType;
  readonly variant?: AlertVariant;
}

const defaultIcons: Record<AlertType, ComponentType> = {
  error: CloseCircleFilled,
  info: InfoCircleFilled,
  success: CheckCircleFilled,
  warning: ExclamationCircleFilled,
};

const AlertRoot = forwardRef<HTMLDivElement, AlertProps>(function Alert(alertProps, forwardedRef) {
  const {
    action,
    banner = false,
    className,
    classNames: classNamesProp,
    closable = false,
    description,
    icon,
    showIcon,
    status,
    style,
    styles: stylesProp,
    title,
    type,
    variant = "outlined",
    ...rootProps
  } = alertProps;
  const [closing, setClosing] = useState(false);
  const [rendered, setRendered] = useState(true);
  const resolvedType = type ?? status ?? (banner ? "warning" : "info");
  const resolvedShowIcon = showIcon ?? banner;
  const hasDescription = description !== undefined && description !== null;
  const closableConfig = typeof closable === "object" ? closable : undefined;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: alertProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: alertProps }) : (stylesProp ?? {});
  const DefaultIcon = defaultIcons[resolvedType];
  const displayedIcon = icon ?? <DefaultIcon />;
  const requestClose: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (closing) return;
    closableConfig?.onClose?.(event);
    if (!event.defaultPrevented) setClosing(true);
  };

  if (!rendered) return null;

  const {
    afterClose: _afterClose,
    closeIcon,
    onClose: _onClose,
    ...closeButtonProps
  } = closableConfig ?? {};

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-alert",
        `is-${resolvedType}`,
        `is-${variant}`,
        banner && "is-banner",
        hasDescription && "has-description",
        resolvedShowIcon && "has-icon",
        action !== undefined && action !== null && "has-actions",
        closable && "is-closable",
        closing && "is-closing",
        resolvedClassNames.root,
        className,
      )}
      onAnimationEnd={(event) => {
        rootProps.onAnimationEnd?.(event);
        if (!closing || event.currentTarget !== event.target) return;
        setRendered(false);
        closableConfig?.afterClose?.();
      }}
      ref={forwardedRef}
      role={resolvedType === "error" ? "alert" : "status"}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {resolvedShowIcon ? (
        <span
          aria-hidden="true"
          className={classes("launch-ui-alert-icon", resolvedClassNames.icon)}
          style={resolvedStyles.icon}
        >
          {displayedIcon}
        </span>
      ) : null}
      <div
        className={classes("launch-ui-alert-section", resolvedClassNames.section)}
        style={resolvedStyles.section}
      >
        <div
          className={classes("launch-ui-alert-title", resolvedClassNames.title)}
          style={resolvedStyles.title}
        >
          {title}
        </div>
        {hasDescription ? (
          <div
            className={classes("launch-ui-alert-description", resolvedClassNames.description)}
            style={resolvedStyles.description}
          >
            {description}
          </div>
        ) : null}
      </div>
      {action !== undefined && action !== null ? (
        <div
          className={classes("launch-ui-alert-actions", resolvedClassNames.actions)}
          style={resolvedStyles.actions}
        >
          {action}
        </div>
      ) : null}
      {closable ? (
        <button
          {...closeButtonProps}
          aria-label={closeButtonProps["aria-label"] ?? "Close alert"}
          className={classes("launch-ui-alert-close", resolvedClassNames.close)}
          onClick={requestClose}
          style={resolvedStyles.close}
          type="button"
        >
          {closeIcon === true || closeIcon === undefined ? <CloseIcon /> : closeIcon}
        </button>
      ) : null}
    </div>
  );
});

export interface AlertErrorBoundaryProps {
  readonly children?: ReactNode;
  readonly description?: ReactNode;
  readonly title?: ReactNode;
}

interface AlertErrorBoundaryState {
  readonly error?: Error;
}

export class AlertErrorBoundary extends Component<
  AlertErrorBoundaryProps,
  AlertErrorBoundaryState
> {
  override state: AlertErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AlertErrorBoundaryState {
    return { error };
  }

  override render() {
    const { children, description, title } = this.props;
    const { error } = this.state;
    if (error === undefined) return children;
    return (
      <AlertRoot
        description={description ?? error.stack}
        showIcon
        title={title ?? error.message}
        type="error"
      />
    );
  }
}

interface AlertComponent {
  (props: AlertProps & { readonly ref?: Ref<HTMLDivElement> }): ReactNode;
  readonly ErrorBoundary: typeof AlertErrorBoundary;
}

export const Alert = Object.assign(AlertRoot, {
  ErrorBoundary: AlertErrorBoundary,
}) as AlertComponent;
