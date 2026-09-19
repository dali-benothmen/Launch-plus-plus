import { ExclamationCircleFilled } from "@ant-design/icons";
import {
  type CSSProperties,
  type MouseEvent,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { Button, type ButtonProps, type ButtonVariant } from "../button/index.js";
import { classes } from "../internal/classes.js";
import { Popover, type PopoverPlacement, type PopoverTrigger } from "../popover/index.js";

export type PopconfirmSemanticName = "container" | "content" | "title";
export type PopconfirmClassNames = Partial<Record<PopconfirmSemanticName, string>>;
export type PopconfirmStyles = Partial<Record<PopconfirmSemanticName, CSSProperties>>;

export interface PopconfirmProps {
  readonly arrow?: boolean | { readonly pointAtCenter?: boolean };
  readonly autoAdjustOverflow?: boolean;
  readonly cancelButtonProps?: ButtonProps;
  readonly cancelText?: ReactNode;
  readonly children: ReactElement;
  readonly className?: string;
  readonly classNames?:
    | PopconfirmClassNames
    | ((info: { readonly props: PopconfirmProps }) => PopconfirmClassNames);
  readonly color?: string;
  readonly defaultOpen?: boolean;
  readonly description?: ReactNode | (() => ReactNode);
  readonly destroyOnHidden?: boolean;
  readonly disabled?: boolean;
  readonly getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  readonly icon?: ReactNode;
  readonly mouseEnterDelay?: number;
  readonly mouseLeaveDelay?: number;
  readonly okButtonProps?: ButtonProps;
  readonly okText?: ReactNode;
  readonly okType?: ButtonVariant;
  readonly onCancel?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onConfirm?: (event: MouseEvent<HTMLButtonElement>) => unknown | Promise<unknown>;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onPopupClick?: MouseEventHandler<HTMLDivElement>;
  readonly open?: boolean;
  readonly placement?: PopoverPlacement;
  readonly showCancel?: boolean;
  readonly style?: CSSProperties;
  readonly styles?:
    | PopconfirmStyles
    | ((info: { readonly props: PopconfirmProps }) => PopconfirmStyles);
  readonly title: ReactNode | (() => ReactNode);
  readonly trigger?: PopoverTrigger | ReadonlyArray<PopoverTrigger>;
  readonly zIndex?: number;
}

function resolveNode(value: ReactNode | (() => ReactNode) | undefined) {
  return typeof value === "function" ? value() : value;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export function Popconfirm(popconfirmProps: PopconfirmProps) {
  const {
    arrow = true,
    autoAdjustOverflow = true,
    cancelButtonProps,
    cancelText = "Cancel",
    children,
    className,
    classNames: classNamesProp,
    color,
    defaultOpen = false,
    description,
    destroyOnHidden = false,
    disabled = false,
    getPopupContainer,
    icon = <ExclamationCircleFilled />,
    mouseEnterDelay,
    mouseLeaveDelay,
    okButtonProps,
    okText = "OK",
    okType = "primary",
    onCancel,
    onConfirm,
    onOpenChange,
    onPopupClick,
    open: controlledOpen,
    placement = "top",
    showCancel = true,
    style,
    styles: stylesProp,
    title,
    trigger = "click",
    zIndex,
  } = popconfirmProps;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: popconfirmProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: popconfirmProps }) : (stylesProp ?? {});
  const titleNode = resolveNode(title);
  const descriptionNode = resolveNode(description);

  const updateOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleCancel: MouseEventHandler<HTMLButtonElement> = (event) => {
    cancelButtonProps?.onClick?.(event);
    if (event.defaultPrevented) return;
    onCancel?.(event);
    updateOpen(false);
  };

  const handleConfirm: MouseEventHandler<HTMLButtonElement> = (event) => {
    okButtonProps?.onClick?.(event);
    if (event.defaultPrevented) return;

    const result = onConfirm?.(event);
    if (!isPromiseLike(result)) {
      updateOpen(false);
      return;
    }

    setConfirmLoading(true);
    void Promise.resolve(result).then(
      () => {
        setConfirmLoading(false);
        updateOpen(false);
      },
      () => setConfirmLoading(false),
    );
  };

  const popup = (
    <div className="launch-ui-popconfirm-inner" onClickCapture={onPopupClick}>
      {icon !== null && icon !== undefined ? (
        <span aria-hidden className="launch-ui-popconfirm-icon">
          {icon}
        </span>
      ) : null}
      <div className="launch-ui-popconfirm-main">
        <div
          className={classes("launch-ui-popconfirm-title", resolvedClassNames.title)}
          style={resolvedStyles.title}
        >
          {titleNode}
        </div>
        {descriptionNode !== null && descriptionNode !== undefined ? (
          <div
            className={classes("launch-ui-popconfirm-description", resolvedClassNames.content)}
            style={resolvedStyles.content}
          >
            {descriptionNode}
          </div>
        ) : null}
        <div className="launch-ui-popconfirm-actions">
          {showCancel ? (
            <Button
              {...cancelButtonProps}
              onClick={handleCancel}
              size={cancelButtonProps?.size ?? "small"}
            >
              {cancelText}
            </Button>
          ) : null}
          <Button
            {...okButtonProps}
            loading={confirmLoading || okButtonProps?.loading || false}
            onClick={handleConfirm}
            size={okButtonProps?.size ?? "small"}
            variant={okButtonProps?.variant ?? okType}
          >
            {okText}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      arrow={arrow}
      autoAdjustOverflow={autoAdjustOverflow}
      classNames={{
        container: classes("launch-ui-popconfirm", resolvedClassNames.container, className),
        content: "launch-ui-popconfirm-popup-content",
      }}
      content={popup}
      defaultOpen={defaultOpen}
      destroyOnHidden={destroyOnHidden}
      onOpenChange={(nextOpen) => {
        if (!disabled || !nextOpen) updateOpen(nextOpen);
      }}
      open={open}
      placement={placement}
      style={{ ...resolvedStyles.container, ...style }}
      trigger={disabled ? [] : trigger}
      {...(color === undefined ? {} : { color })}
      {...(getPopupContainer === undefined ? {} : { getPopupContainer })}
      {...(mouseEnterDelay === undefined ? {} : { mouseEnterDelay })}
      {...(mouseLeaveDelay === undefined ? {} : { mouseLeaveDelay })}
      {...(zIndex === undefined ? {} : { zIndex })}
    >
      {children}
    </Popover>
  );
}
