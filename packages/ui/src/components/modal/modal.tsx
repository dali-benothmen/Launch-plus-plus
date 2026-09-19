import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  type AriaAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps, type ButtonVariant } from "../button/index.js";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type ModalCloseEvent = Event | SyntheticEvent;
export type ModalSemanticName =
  | "body"
  | "close"
  | "container"
  | "footer"
  | "header"
  | "mask"
  | "root"
  | "title";
export type ModalClassNames = Partial<Record<ModalSemanticName, string>>;
export type ModalStyles = Partial<Record<ModalSemanticName, CSSProperties>>;

export interface ModalClosableConfig extends AriaAttributes {
  readonly closeIcon?: ReactNode;
  readonly disabled?: boolean;
  readonly onClose?: () => void;
}

export interface ModalMaskConfig {
  readonly blur?: boolean;
  readonly closable?: boolean;
  readonly enabled?: boolean;
}

export interface ModalFocusableConfig {
  readonly focusTriggerAfterClose?: boolean;
  readonly trap?: boolean;
}

export interface ModalFooterComponents {
  readonly CancelBtn: () => ReactNode;
  readonly OkBtn: () => ReactNode;
}

export type ModalFooter =
  | ReactNode
  | ((originNode: ReactNode, components: ModalFooterComponents) => ReactNode);

export interface ModalProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "onCancel" | "style" | "title"> {
  readonly afterClose?: () => void;
  readonly afterOpenChange?: (open: boolean) => void;
  readonly cancelButtonProps?: ButtonProps;
  readonly cancelText?: ReactNode;
  readonly centered?: boolean;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly classNames?:
    | ModalClassNames
    | ((info: { readonly props: ModalProps }) => ModalClassNames);
  readonly closable?: boolean | ModalClosableConfig;
  readonly closeIcon?: ReactNode;
  readonly confirmLoading?: boolean;
  readonly defaultOpen?: boolean;
  readonly destroyOnHidden?: boolean;
  readonly focusable?: ModalFocusableConfig;
  readonly footer?: ModalFooter;
  readonly forceRender?: boolean;
  readonly getContainer?: HTMLElement | (() => HTMLElement) | string | false;
  readonly keyboard?: boolean;
  readonly loading?: boolean;
  readonly mask?: boolean | ModalMaskConfig;
  readonly modalRender?: (node: ReactNode) => ReactNode;
  readonly okButtonProps?: ButtonProps;
  readonly okText?: ReactNode;
  readonly okType?: ButtonVariant;
  readonly onCancel?: (event: ModalCloseEvent) => void;
  readonly onOk?: (event: ReactMouseEvent<HTMLButtonElement>) => unknown;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly rootClassName?: string;
  readonly rootStyle?: CSSProperties;
  readonly style?: CSSProperties;
  readonly styles?: ModalStyles | ((info: { readonly props: ModalProps }) => ModalStyles);
  readonly title?: ReactNode;
  readonly width?: number | string;
  readonly wrapClassName?: string;
  readonly zIndex?: number;
}

function resolveContainer(container: ModalProps["getContainer"]) {
  if (container === false || container === undefined || typeof document === "undefined") {
    return container;
  }
  if (typeof container === "function") return container();
  if (typeof container === "string") return document.querySelector<HTMLElement>(container);
  return container;
}

function ModalSkeleton() {
  return (
    <div aria-label="Loading" className="launch-ui-modal-skeleton" role="status">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function Modal(modalProps: ModalProps) {
  const {
    afterClose,
    afterOpenChange,
    cancelButtonProps,
    cancelText = "Cancel",
    centered = false,
    children,
    className,
    classNames: classNamesProp,
    closable = true,
    closeIcon,
    confirmLoading = false,
    defaultOpen = false,
    destroyOnHidden = false,
    focusable,
    footer,
    forceRender = false,
    getContainer,
    keyboard = true,
    loading = false,
    mask = true,
    modalRender,
    okButtonProps,
    okText = "OK",
    okType = "primary",
    onCancel,
    onOk,
    onOpenChange,
    open,
    rootClassName,
    rootStyle,
    style,
    styles: stylesProp,
    title,
    width = 520,
    wrapClassName,
    zIndex = 1000,
    ...contentProps
  } = modalProps;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalConfirmLoading, setInternalConfirmLoading] = useState(false);
  const resolvedOpen = open ?? internalOpen;
  const [hasOpened, setHasOpened] = useState(resolvedOpen);
  const [exitComplete, setExitComplete] = useState(!resolvedOpen);
  const lastCloseEvent = useRef<ModalCloseEvent | undefined>(undefined);
  const lastAnimationState = useRef<boolean | undefined>(undefined);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: modalProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: modalProps }) : (stylesProp ?? {});
  const closableConfig = typeof closable === "object" ? closable : undefined;
  const maskConfig = typeof mask === "object" ? mask : undefined;
  const maskEnabled = typeof mask === "boolean" ? mask : (maskConfig?.enabled ?? true);
  const maskClosable = maskEnabled && (maskConfig?.closable ?? true);
  const configuredCloseIcon =
    closableConfig && "closeIcon" in closableConfig ? closableConfig.closeIcon : closeIcon;
  const isClosable =
    closable !== false && configuredCloseIcon !== null && configuredCloseIcon !== false;
  const resolvedCloseIcon = configuredCloseIcon ?? <CloseIcon />;
  const resolvedConfirmLoading = confirmLoading || internalConfirmLoading;
  const container = resolveContainer(getContainer);
  const keepMounted =
    forceRender ||
    resolvedOpen ||
    (!destroyOnHidden && hasOpened) ||
    (!resolvedOpen && !exitComplete);
  const resolvedWidth = typeof width === "number" ? `${width}px` : width;
  const {
    closeIcon: _configuredCloseIcon,
    disabled: closeDisabled,
    onClose: closeConfigOnClose,
    ...closeButtonAria
  } = closableConfig ?? {};

  useEffect(() => {
    if (resolvedOpen) {
      setHasOpened(true);
      setExitComplete(false);
    }
  }, [resolvedOpen]);

  useEffect(() => {
    if (resolvedOpen || exitComplete) return;
    const fallback = window.setTimeout(() => setExitComplete(true), 250);
    return () => window.clearTimeout(fallback);
  }, [exitComplete, resolvedOpen]);

  const updateOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const requestCancel = (event: ModalCloseEvent) => {
    lastCloseEvent.current = event;
    closeConfigOnClose?.();
    onCancel?.(event);
    updateOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      updateOpen(true);
      return;
    }
    requestCancel(lastCloseEvent.current ?? new Event("cancel"));
    lastCloseEvent.current = undefined;
  };

  const handleOk = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    okButtonProps?.onClick?.(event);
    if (event.defaultPrevented) return;
    try {
      const result = onOk?.(event);
      if (result instanceof Promise) {
        setInternalConfirmLoading(true);
        await result;
        if (open === undefined) updateOpen(false);
      } else if (onOk === undefined && open === undefined) {
        updateOpen(false);
      }
    } finally {
      setInternalConfirmLoading(false);
    }
  };

  const CancelBtn = () => (
    <Button
      {...cancelButtonProps}
      onClick={(event) => {
        cancelButtonProps?.onClick?.(event);
        if (!event.defaultPrevented) requestCancel(event);
      }}
    >
      {cancelText}
    </Button>
  );
  const OkBtn = () => (
    <Button
      {...okButtonProps}
      loading={resolvedConfirmLoading ? true : (okButtonProps?.loading ?? false)}
      onClick={handleOk}
      variant={okButtonProps?.variant ?? okType}
    >
      {okText}
    </Button>
  );
  const defaultFooter = (
    <>
      <CancelBtn />
      <OkBtn />
    </>
  );
  const resolvedFooter =
    footer === null
      ? null
      : typeof footer === "function"
        ? footer(defaultFooter, { CancelBtn, OkBtn })
        : (footer ?? defaultFooter);
  const closeButton = isClosable ? (
    <DialogPrimitive.Close asChild>
      <Button
        {...closeButtonAria}
        aria-label={closeButtonAria["aria-label"] ?? "Close modal"}
        className={classes("launch-ui-modal-close", resolvedClassNames.close)}
        disabled={closeDisabled}
        icon={resolvedCloseIcon}
        iconOnly
        onClick={(event) => {
          lastCloseEvent.current = event;
        }}
        style={resolvedStyles.close}
        variant="text"
      />
    </DialogPrimitive.Close>
  ) : null;
  const modalPanel = (
    <DialogPrimitive.Content
      {...contentProps}
      aria-describedby={undefined}
      className={classes(
        "launch-ui-modal-container",
        centered && "is-centered",
        loading && "is-loading",
        className,
        resolvedClassNames.container,
      )}
      {...(keepMounted ? { forceMount: true } : {})}
      onAnimationEnd={(event) => {
        contentProps.onAnimationEnd?.(event);
        if (event.currentTarget !== event.target) return;
        const nextState = event.currentTarget.getAttribute("data-state") === "open";
        if (lastAnimationState.current === nextState) return;
        lastAnimationState.current = nextState;
        if (!nextState) {
          setExitComplete(true);
          afterClose?.();
        }
        afterOpenChange?.(nextState);
      }}
      onCloseAutoFocus={(event) => {
        if (focusable?.focusTriggerAfterClose === false) event.preventDefault();
      }}
      onEscapeKeyDown={(event) => {
        lastCloseEvent.current = event;
        if (!keyboard) event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        lastCloseEvent.current = event;
        if (!maskClosable) event.preventDefault();
      }}
      style={
        {
          "--launch-ui-modal-width": resolvedWidth,
          ...resolvedStyles.container,
          ...style,
        } as CSSProperties
      }
    >
      <header
        className={classes("launch-ui-modal-header", resolvedClassNames.header)}
        style={resolvedStyles.header}
      >
        <DialogPrimitive.Title
          className={classes("launch-ui-modal-title", resolvedClassNames.title)}
          style={resolvedStyles.title}
        >
          {title ?? <span className="launch-ui-visually-hidden">Modal</span>}
        </DialogPrimitive.Title>
        {closeButton}
      </header>
      <div
        className={classes("launch-ui-modal-body", resolvedClassNames.body)}
        style={resolvedStyles.body}
      >
        {loading ? <ModalSkeleton /> : children}
      </div>
      {resolvedFooter !== null ? (
        <footer
          className={classes("launch-ui-modal-footer", resolvedClassNames.footer)}
          style={resolvedStyles.footer}
        >
          {resolvedFooter}
        </footer>
      ) : null}
    </DialogPrimitive.Content>
  );
  const renderedPanel = modalRender?.(modalPanel) ?? modalPanel;
  const portalContents = (
    <div
      className={classes(
        "launch-ui-modal-root",
        centered && "is-centered",
        !resolvedOpen && exitComplete && "is-hidden",
        rootClassName,
        wrapClassName,
        resolvedClassNames.root,
      )}
      style={{ ...resolvedStyles.root, ...rootStyle, zIndex }}
    >
      {maskEnabled ? (
        <DialogPrimitive.Overlay
          className={classes(
            "launch-ui-modal-mask",
            maskConfig?.blur && "is-blurred",
            resolvedClassNames.mask,
          )}
          {...(keepMounted ? { forceMount: true } : {})}
          style={resolvedStyles.mask}
        />
      ) : null}
      {renderedPanel}
    </div>
  );

  return (
    <DialogPrimitive.Root
      modal={focusable?.trap !== false && maskEnabled}
      onOpenChange={handleOpenChange}
      open={resolvedOpen}
    >
      {container === false ? (
        portalContents
      ) : (
        <DialogPrimitive.Portal
          {...(typeof HTMLElement !== "undefined" && container instanceof HTMLElement
            ? { container }
            : {})}
          {...(keepMounted ? { forceMount: true } : {})}
        >
          {portalContents}
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
