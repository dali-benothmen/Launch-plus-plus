import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from "@ant-design/icons";
import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "../button/index.js";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type NotificationKey = number | string;
export type NotificationPlacement =
  | "bottom"
  | "bottomLeft"
  | "bottomRight"
  | "top"
  | "topLeft"
  | "topRight";
export type NotificationTypeName = "error" | "info" | "success" | "warning";
export type NotificationSemanticName =
  | "actions"
  | "close"
  | "description"
  | "icon"
  | "progress"
  | "root"
  | "title";
export type NotificationClassNames = Partial<Record<NotificationSemanticName, string>>;
export type NotificationStyles = Partial<Record<NotificationSemanticName, CSSProperties>>;

export interface NotificationClosableConfig {
  readonly closeIcon?: ReactNode;
  readonly onClose?: () => void;
}

export interface NotificationArgsProps {
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly classNames?:
    | NotificationClassNames
    | ((info: { readonly props: NotificationArgsProps }) => NotificationClassNames);
  readonly closable?: boolean | NotificationClosableConfig;
  readonly closeIcon?: ReactNode;
  readonly description: ReactNode;
  readonly duration?: number | false;
  readonly icon?: ReactNode;
  readonly key?: NotificationKey;
  readonly onClick?: MouseEventHandler<HTMLDivElement>;
  readonly onClose?: () => void;
  readonly pauseOnHover?: boolean;
  readonly placement?: NotificationPlacement;
  readonly props?: Omit<
    HTMLAttributes<HTMLDivElement>,
    "className" | "onClick" | "role" | "style" | "title"
  >;
  readonly role?: "alert" | "status";
  readonly showProgress?: boolean;
  readonly style?: CSSProperties;
  readonly styles?:
    | NotificationStyles
    | ((info: { readonly props: NotificationArgsProps }) => NotificationStyles);
  readonly title?: ReactNode;
  readonly type?: NotificationTypeName;
}

export interface NotificationStackConfig {
  readonly threshold?: number;
}

export interface NotificationConfig {
  readonly bottom?: number;
  readonly closeIcon?: ReactNode;
  readonly getContainer?: () => HTMLElement;
  readonly maxCount?: number;
  readonly pauseOnHover?: boolean;
  readonly placement?: NotificationPlacement;
  readonly showProgress?: boolean;
  readonly stack?: boolean | NotificationStackConfig;
  readonly top?: number;
}

export type NotificationMethod = (config: NotificationArgsProps) => void;

export interface NotificationInstance {
  destroy(key?: NotificationKey): void;
  error: NotificationMethod;
  info: NotificationMethod;
  open(config: NotificationArgsProps): void;
  success: NotificationMethod;
  warning: NotificationMethod;
}

interface ResolvedNotificationArgs extends NotificationArgsProps {
  readonly duration: number | false;
  readonly pauseOnHover: boolean;
  readonly placement: NotificationPlacement;
  readonly role: "alert" | "status";
  readonly showProgress: boolean;
  readonly type?: NotificationTypeName;
}

interface NotificationRecord {
  readonly args: ResolvedNotificationArgs;
  readonly closing: boolean;
  readonly id: NotificationKey;
  readonly revision: number;
}

const placements: ReadonlyArray<NotificationPlacement> = [
  "top",
  "topLeft",
  "topRight",
  "bottom",
  "bottomLeft",
  "bottomRight",
];

const defaultConfig = {
  bottom: 24,
  pauseOnHover: true,
  placement: "topRight" as NotificationPlacement,
  showProgress: false,
  top: 24,
};

function sameStack(current: NotificationConfig["stack"], next: NotificationConfig["stack"]) {
  if (current === next) return true;
  if (typeof current !== "object" || typeof next !== "object") return false;
  return current.threshold === next.threshold;
}

function sameConfig(current: NotificationConfig, next: NotificationConfig) {
  return (
    current.bottom === next.bottom &&
    current.closeIcon === next.closeIcon &&
    current.getContainer === next.getContainer &&
    current.maxCount === next.maxCount &&
    current.pauseOnHover === next.pauseOnHover &&
    current.placement === next.placement &&
    current.showProgress === next.showProgress &&
    current.top === next.top &&
    sameStack(current.stack, next.stack)
  );
}

class NotificationStore {
  private closeTimers = new Map<NotificationKey, ReturnType<typeof setTimeout>>();
  private config: NotificationConfig;
  private counter = 0;
  private listeners = new Set<() => void>();
  private snapshot: ReadonlyArray<NotificationRecord> = [];

  readonly api: NotificationInstance = {
    destroy: (key) => this.destroy(key),
    error: (config) => this.open({ ...config, type: "error" }),
    info: (config) => this.open({ ...config, type: "info" }),
    open: (config) => this.open(config),
    success: (config) => this.open({ ...config, type: "success" }),
    warning: (config) => this.open({ ...config, type: "warning" }),
  };

  constructor(config: NotificationConfig = {}) {
    this.config = config;
  }

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  configure(config: NotificationConfig) {
    if (sameConfig(this.config, config)) return;
    this.config = config;
    this.emit();
  }

  getConfig() {
    return this.config;
  }

  private emit() {
    this.snapshot = [...this.snapshot];
    for (const listener of this.listeners) listener();
  }

  private resolveArgs(config: NotificationArgsProps): ResolvedNotificationArgs {
    return {
      ...config,
      closeIcon: config.closeIcon !== undefined ? config.closeIcon : this.config.closeIcon,
      duration: config.duration ?? 4.5,
      pauseOnHover: config.pauseOnHover ?? this.config.pauseOnHover ?? defaultConfig.pauseOnHover,
      placement: config.placement ?? this.config.placement ?? defaultConfig.placement,
      role: config.role ?? "alert",
      showProgress: config.showProgress ?? this.config.showProgress ?? defaultConfig.showProgress,
    };
  }

  open(config: NotificationArgsProps) {
    const args = this.resolveArgs(config);
    const id = config.key ?? `launch-notification-${++this.counter}`;
    const existing = this.snapshot.find((record) => Object.is(record.id, id));
    if (existing) {
      const closeTimer = this.closeTimers.get(id);
      if (closeTimer !== undefined) globalThis.clearTimeout(closeTimer);
      this.closeTimers.delete(id);
      this.snapshot = this.snapshot.map((record) =>
        Object.is(record.id, id)
          ? { ...record, args, closing: false, revision: record.revision + 1 }
          : record,
      );
      this.emit();
      return;
    }

    this.snapshot = [
      ...this.snapshot,
      { args, closing: false, id, revision: 0 } satisfies NotificationRecord,
    ];
    const maxCount = this.config.maxCount;
    if (maxCount !== undefined && maxCount > 0 && this.snapshot.length > maxCount) {
      const overflow = this.snapshot.slice(0, this.snapshot.length - maxCount);
      this.snapshot = this.snapshot.slice(-maxCount);
      for (const removed of overflow) this.finalize(removed);
    }
    this.emit();
  }

  close(id: NotificationKey) {
    const record = this.snapshot.find((item) => Object.is(item.id, id));
    if (!record || record.closing) return;
    this.snapshot = this.snapshot.map((item) =>
      Object.is(item.id, id) ? { ...item, closing: true } : item,
    );
    this.emit();
    const timer = globalThis.setTimeout(() => {
      this.closeTimers.delete(id);
      const latest = this.snapshot.find((item) => Object.is(item.id, id));
      if (!latest?.closing) return;
      this.snapshot = this.snapshot.filter((item) => !Object.is(item.id, id));
      this.finalize(latest);
      this.emit();
    }, 200);
    this.closeTimers.set(id, timer);
  }

  destroy(key?: NotificationKey) {
    if (key !== undefined) {
      this.close(key);
      return;
    }
    for (const record of this.snapshot) this.close(record.id);
  }

  private finalize(record: NotificationRecord) {
    const timer = this.closeTimers.get(record.id);
    if (timer !== undefined) globalThis.clearTimeout(timer);
    this.closeTimers.delete(record.id);
    const closableConfig =
      typeof record.args.closable === "object" ? record.args.closable : undefined;
    closableConfig?.onClose?.();
    record.args.onClose?.();
  }
}

const notificationIcons: Record<NotificationTypeName, ReactNode> = {
  error: <CloseCircleFilled />,
  info: <InfoCircleFilled />,
  success: <CheckCircleFilled />,
  warning: <ExclamationCircleFilled />,
};

function NotificationNotice({
  record,
  store,
}: {
  readonly record: NotificationRecord;
  readonly store: NotificationStore;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remaining = useRef(0);
  const startedAt = useRef(0);
  const [paused, setPaused] = useState(false);
  const { args } = record;
  const resolvedClassNames =
    typeof args.classNames === "function"
      ? args.classNames({ props: args })
      : (args.classNames ?? {});
  const resolvedStyles =
    typeof args.styles === "function" ? args.styles({ props: args }) : (args.styles ?? {});
  const closableConfig = typeof args.closable === "object" ? args.closable : undefined;
  const configuredCloseIcon =
    closableConfig && "closeIcon" in closableConfig ? closableConfig.closeIcon : args.closeIcon;
  const showClose =
    args.closable !== false && configuredCloseIcon !== null && configuredCloseIcon !== false;
  const icon = args.icon ?? (args.type ? notificationIcons[args.type] : undefined);
  const duration = args.duration === false ? 0 : args.duration;

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) globalThis.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  const startTimer = useCallback(() => {
    clearTimer();
    setPaused(false);
    if (remaining.current <= 0 || record.closing) return;
    startedAt.current = Date.now();
    timer.current = globalThis.setTimeout(() => store.close(record.id), remaining.current);
  }, [clearTimer, record.closing, record.id, store]);
  const pauseTimer = useCallback(() => {
    if (!args.pauseOnHover || timer.current === undefined) return;
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    setPaused(true);
    clearTimer();
  }, [args.pauseOnHover, clearTimer]);

  useEffect(() => {
    remaining.current = duration * 1000;
    startTimer();
    return clearTimer;
  }, [clearTimer, duration, startTimer]);

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!args.onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Clickable notifications include button semantics and keyboard handling.
    <div
      {...args.props}
      className={classes(
        "launch-ui-notification",
        args.type && `is-${args.type}`,
        icon !== undefined && "has-icon",
        record.closing && "is-closing",
        args.onClick && "is-clickable",
        resolvedClassNames.root,
        args.className,
      )}
      onClick={args.onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      role={args.onClick ? "button" : args.role}
      style={{ ...resolvedStyles.root, ...args.style }}
      tabIndex={args.onClick ? 0 : undefined}
    >
      {icon === undefined ? null : (
        <span
          aria-hidden="true"
          className={classes("launch-ui-notification-icon", resolvedClassNames.icon)}
          style={resolvedStyles.icon}
        >
          {icon}
        </span>
      )}
      <div className="launch-ui-notification-content">
        {args.title === undefined ? null : (
          <div
            className={classes("launch-ui-notification-title", resolvedClassNames.title)}
            style={resolvedStyles.title}
          >
            {args.title}
          </div>
        )}
        <div
          className={classes("launch-ui-notification-description", resolvedClassNames.description)}
          style={resolvedStyles.description}
        >
          {args.description}
        </div>
        {args.actions === undefined ? null : (
          <div
            className={classes("launch-ui-notification-actions", resolvedClassNames.actions)}
            style={resolvedStyles.actions}
          >
            {args.actions}
          </div>
        )}
      </div>
      {showClose ? (
        <Button
          aria-label="Close notification"
          className={classes("launch-ui-notification-close", resolvedClassNames.close)}
          icon={configuredCloseIcon ?? <CloseIcon />}
          iconOnly
          onClick={(event) => {
            event.stopPropagation();
            store.close(record.id);
          }}
          size="small"
          style={resolvedStyles.close}
          variant="text"
        />
      ) : null}
      {args.showProgress && duration > 0 ? (
        <span
          aria-hidden="true"
          className={classes(
            "launch-ui-notification-progress",
            paused && "is-paused",
            resolvedClassNames.progress,
          )}
          style={
            {
              "--launch-ui-notification-duration": `${duration}s`,
              ...resolvedStyles.progress,
            } as CSSProperties
          }
        />
      ) : null}
    </div>
  );
}

function NotificationHolder({ store }: { readonly store: NotificationStore }) {
  const records = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const config = store.getConfig();
  if (typeof document === "undefined") return null;
  const target = config.getContainer?.() ?? document.body;
  const stack = config.stack ?? true;
  const stackEnabled = stack === true || typeof stack === "object";
  const threshold = typeof stack === "object" ? (stack.threshold ?? 3) : 3;

  return createPortal(
    placements.map((placement) => {
      const placementRecords = records.filter((record) => record.args.placement === placement);
      if (placementRecords.length === 0) return null;
      const collapsed = stackEnabled && placementRecords.length > threshold;
      const visibleRecords = collapsed ? placementRecords.slice(-threshold) : placementRecords;
      return (
        <div
          aria-live="polite"
          className={classes(
            "launch-ui-notification-holder",
            `is-${placement}`,
            collapsed && "is-stacked",
          )}
          key={placement}
          style={
            {
              "--launch-ui-notification-bottom": `${config.bottom ?? defaultConfig.bottom}px`,
              "--launch-ui-notification-top": `${config.top ?? defaultConfig.top}px`,
            } as CSSProperties
          }
        >
          {visibleRecords.map((record, index) => (
            <div
              className="launch-ui-notification-item"
              key={record.id}
              style={
                collapsed
                  ? ({
                      "--launch-ui-notification-stack-index": visibleRecords.length - index - 1,
                    } as CSSProperties)
                  : undefined
              }
            >
              <NotificationNotice key={record.revision} record={record} store={store} />
            </div>
          ))}
        </div>
      );
    }),
    target,
  );
}

export function useNotification(
  config: NotificationConfig = {},
): readonly [NotificationInstance, ReactElement] {
  const storeRef = useRef<NotificationStore | null>(null);
  if (storeRef.current === null) storeRef.current = new NotificationStore(config);
  const store = storeRef.current;
  useEffect(() => store.configure(config), [config, store]);
  return [
    store.api,
    <NotificationHolder key="launch-ui-notification-holder" store={store} />,
  ] as const;
}

const staticStore = new NotificationStore();
let staticRoot: Root | undefined;

function ensureStaticHolder() {
  if (typeof document === "undefined" || staticRoot !== undefined) return;
  const host = document.createElement("div");
  host.setAttribute("data-launch-ui-notification-root", "");
  document.body.append(host);
  staticRoot = createRoot(host);
  staticRoot.render(<NotificationHolder store={staticStore} />);
}

function staticMethod(type: NotificationTypeName): NotificationMethod {
  return (config) => {
    ensureStaticHolder();
    staticStore.api[type](config);
  };
}

export const notification = {
  config(config: NotificationConfig) {
    staticStore.configure(config);
  },
  destroy(key?: NotificationKey) {
    staticStore.destroy(key);
  },
  error: staticMethod("error"),
  info: staticMethod("info"),
  open(config: NotificationArgsProps) {
    ensureStaticHolder();
    staticStore.open(config);
  },
  success: staticMethod("success"),
  useNotification,
  warning: staticMethod("warning"),
} as const;
