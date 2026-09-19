import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from "@ant-design/icons";
import {
  type CSSProperties,
  isValidElement,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type MessageTypeName = "error" | "info" | "loading" | "success" | "warning";
export type MessageKey = number | string;
export type MessageSemanticName = "icon" | "root" | "title";
export type MessageClassNames = Partial<Record<MessageSemanticName, string>>;
export type MessageStyles = Partial<Record<MessageSemanticName, CSSProperties>>;

export interface MessageArgsProps {
  readonly className?: string;
  readonly classNames?:
    | MessageClassNames
    | ((info: { readonly props: MessageArgsProps }) => MessageClassNames);
  readonly content: ReactNode;
  readonly duration?: number;
  readonly icon?: ReactNode;
  readonly key?: MessageKey;
  readonly onClick?: MouseEventHandler<HTMLDivElement>;
  readonly onClose?: () => void;
  readonly pauseOnHover?: boolean;
  readonly style?: CSSProperties;
  readonly styles?: MessageStyles | ((info: { readonly props: MessageArgsProps }) => MessageStyles);
  readonly type?: MessageTypeName;
}

export interface MessageStackConfig {
  readonly threshold?: number;
}

export interface MessageConfig {
  readonly duration?: number;
  readonly getContainer?: () => HTMLElement;
  readonly maxCount?: number;
  readonly pauseOnHover?: boolean;
  readonly stack?: boolean | MessageStackConfig;
  readonly top?: number;
}

export interface MessageType extends PromiseLike<boolean> {
  (): void;
}

export type MessageMethod = (
  content: MessageArgsProps | ReactNode,
  duration?: number,
  onClose?: () => void,
) => MessageType;

export interface MessageInstance {
  destroy(key?: MessageKey): void;
  error: MessageMethod;
  info: MessageMethod;
  loading: MessageMethod;
  open(config: MessageArgsProps): MessageType;
  success: MessageMethod;
  warning: MessageMethod;
}

interface ResolvedMessageArgs extends MessageArgsProps {
  readonly duration: number;
  readonly pauseOnHover: boolean;
  readonly type: MessageTypeName;
}

interface MessageRecord {
  readonly args: ResolvedMessageArgs;
  readonly id: MessageKey;
  readonly promise: Promise<boolean>;
  readonly resolve: (closed: boolean) => void;
  readonly revision: number;
  readonly closing: boolean;
}

const defaultConfig: Required<Pick<MessageConfig, "duration" | "pauseOnHover" | "top">> = {
  duration: 3,
  pauseOnHover: true,
  top: 8,
};

function isMessageArgs(value: MessageArgsProps | ReactNode): value is MessageArgsProps {
  return (
    typeof value === "object" && value !== null && !isValidElement(value) && "content" in value
  );
}

function sameStack(current: MessageConfig["stack"], next: MessageConfig["stack"]) {
  if (current === next) return true;
  if (typeof current !== "object" || typeof next !== "object") return false;
  return current.threshold === next.threshold;
}

function sameConfig(current: MessageConfig, next: MessageConfig) {
  return (
    current.duration === next.duration &&
    current.getContainer === next.getContainer &&
    current.maxCount === next.maxCount &&
    current.pauseOnHover === next.pauseOnHover &&
    current.top === next.top &&
    sameStack(current.stack, next.stack)
  );
}

function createMessageType(close: () => void, promise: Promise<boolean>): MessageType {
  return Object.assign(close, {
    // biome-ignore lint/suspicious/noThenProperty: The documented Message API returns a callable thenable.
    then: promise.then.bind(promise),
  });
}

class MessageStore {
  private closeTimers = new Map<MessageKey, ReturnType<typeof setTimeout>>();
  private config: MessageConfig;
  private counter = 0;
  private listeners = new Set<() => void>();
  private snapshot: ReadonlyArray<MessageRecord> = [];

  readonly api: MessageInstance = {
    destroy: (key) => this.destroy(key),
    error: (content, duration, onClose) => this.openMethod("error", content, duration, onClose),
    info: (content, duration, onClose) => this.openMethod("info", content, duration, onClose),
    loading: (content, duration, onClose) => this.openMethod("loading", content, duration, onClose),
    open: (config) => this.open(config),
    success: (content, duration, onClose) => this.openMethod("success", content, duration, onClose),
    warning: (content, duration, onClose) => this.openMethod("warning", content, duration, onClose),
  };

  constructor(config: MessageConfig = {}) {
    this.config = config;
  }

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  configure(config: MessageConfig) {
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

  private resolveArgs(config: MessageArgsProps): ResolvedMessageArgs {
    return {
      ...config,
      duration: config.duration ?? this.config.duration ?? defaultConfig.duration,
      pauseOnHover: config.pauseOnHover ?? this.config.pauseOnHover ?? defaultConfig.pauseOnHover,
      type: config.type ?? "info",
    };
  }

  private openMethod(
    type: MessageTypeName,
    content: MessageArgsProps | ReactNode,
    duration?: number,
    onClose?: () => void,
  ) {
    const config = isMessageArgs(content)
      ? { ...content, type: content.type ?? type }
      : {
          content,
          ...(duration === undefined ? {} : { duration }),
          ...(onClose === undefined ? {} : { onClose }),
          type,
        };
    return this.open(config);
  }

  open(config: MessageArgsProps): MessageType {
    const args = this.resolveArgs(config);
    const id = config.key ?? `launch-message-${++this.counter}`;
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
      return createMessageType(() => this.close(id), existing.promise);
    }

    let resolvePromise = (_closed: boolean) => {};
    const promise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
    const record: MessageRecord = {
      args,
      closing: false,
      id,
      promise,
      resolve: resolvePromise,
      revision: 0,
    };
    this.snapshot = [...this.snapshot, record];
    const maxCount = this.config.maxCount;
    if (maxCount !== undefined && maxCount > 0 && this.snapshot.length > maxCount) {
      const overflow = this.snapshot.slice(0, this.snapshot.length - maxCount);
      this.snapshot = this.snapshot.slice(-maxCount);
      for (const removed of overflow) this.finalize(removed);
    }
    this.emit();
    return createMessageType(() => this.close(id), promise);
  }

  close(id: MessageKey) {
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

  destroy(key?: MessageKey) {
    if (key !== undefined) {
      this.close(key);
      return;
    }
    for (const record of this.snapshot) this.close(record.id);
  }

  private finalize(record: MessageRecord) {
    const timer = this.closeTimers.get(record.id);
    if (timer !== undefined) globalThis.clearTimeout(timer);
    this.closeTimers.delete(record.id);
    record.args.onClose?.();
    record.resolve(true);
  }
}

const messageIcons: Record<MessageTypeName, ReactNode> = {
  error: <CloseCircleFilled />,
  info: <InfoCircleFilled />,
  loading: <LoadingIcon />,
  success: <CheckCircleFilled />,
  warning: <ExclamationCircleFilled />,
};

function MessageNotice({ record, store }: { record: MessageRecord; store: MessageStore }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remaining = useRef(0);
  const startedAt = useRef(0);
  const { args } = record;
  const resolvedClassNames =
    typeof args.classNames === "function"
      ? args.classNames({ props: args })
      : (args.classNames ?? {});
  const resolvedStyles =
    typeof args.styles === "function" ? args.styles({ props: args }) : (args.styles ?? {});

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) globalThis.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  const startTimer = useCallback(() => {
    clearTimer();
    if (remaining.current <= 0 || record.closing) return;
    startedAt.current = Date.now();
    timer.current = globalThis.setTimeout(() => store.close(record.id), remaining.current);
  }, [clearTimer, record.closing, record.id, store]);
  const pauseTimer = useCallback(() => {
    if (!args.pauseOnHover || timer.current === undefined) return;
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    clearTimer();
  }, [args.pauseOnHover, clearTimer]);

  useEffect(() => {
    remaining.current = args.duration * 1000;
    startTimer();
    return clearTimer;
  }, [args.duration, clearTimer, startTimer]);

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!args.onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Clickable messages include button semantics and keyboard handling.
    <div
      className={classes(
        "launch-ui-message-notice",
        `is-${args.type}`,
        record.closing && "is-closing",
        args.onClick && "is-clickable",
        resolvedClassNames.root,
        args.className,
      )}
      onClick={args.onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      role={args.onClick ? "button" : args.type === "error" ? "alert" : "status"}
      style={{ ...resolvedStyles.root, ...args.style }}
      tabIndex={args.onClick ? 0 : undefined}
    >
      <span
        aria-hidden="true"
        className={classes("launch-ui-message-icon", resolvedClassNames.icon)}
        style={resolvedStyles.icon}
      >
        {args.icon ?? messageIcons[args.type]}
      </span>
      <span
        className={classes("launch-ui-message-title", resolvedClassNames.title)}
        style={resolvedStyles.title}
      >
        {args.content}
      </span>
    </div>
  );
}

function MessageHolder({ store }: { store: MessageStore }) {
  const records = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const config = store.getConfig();
  if (typeof document === "undefined") return null;
  const target = config.getContainer?.() ?? document.body;
  const stack = config.stack;
  const stackEnabled = stack === true || typeof stack === "object";
  const threshold = typeof stack === "object" ? (stack.threshold ?? 3) : 3;
  const collapsed = stackEnabled && records.length > threshold;
  const visibleRecords = collapsed ? records.slice(-threshold) : records;
  return createPortal(
    <div
      aria-live="polite"
      className={classes("launch-ui-message-holder", collapsed && "is-stacked")}
      style={{ top: config.top ?? defaultConfig.top }}
    >
      {visibleRecords.map((record, index) => (
        <div
          className="launch-ui-message-item"
          key={record.id}
          style={
            collapsed
              ? ({
                  "--launch-ui-message-stack-index": visibleRecords.length - index - 1,
                } as CSSProperties)
              : undefined
          }
        >
          <MessageNotice key={record.revision} record={record} store={store} />
        </div>
      ))}
    </div>,
    target,
  );
}

export function useMessage(config: MessageConfig = {}): readonly [MessageInstance, ReactElement] {
  const storeRef = useRef<MessageStore | null>(null);
  if (storeRef.current === null) storeRef.current = new MessageStore(config);
  const store = storeRef.current;
  useEffect(() => store.configure(config), [config, store]);
  return [store.api, <MessageHolder key="launch-ui-message-holder" store={store} />] as const;
}

const staticStore = new MessageStore();
let staticRoot: Root | undefined;

function ensureStaticHolder() {
  if (typeof document === "undefined" || staticRoot !== undefined) return;
  const host = document.createElement("div");
  host.setAttribute("data-launch-ui-message-root", "");
  document.body.append(host);
  staticRoot = createRoot(host);
  staticRoot.render(<MessageHolder store={staticStore} />);
}

function staticMethod(type: MessageTypeName): MessageMethod {
  return (content, duration, onClose) => {
    ensureStaticHolder();
    return staticStore.api[type](content, duration, onClose);
  };
}

export const message = {
  config(config: MessageConfig) {
    staticStore.configure(config);
  },
  destroy(key?: MessageKey) {
    staticStore.destroy(key);
  },
  error: staticMethod("error"),
  info: staticMethod("info"),
  loading: staticMethod("loading"),
  open(config: MessageArgsProps) {
    ensureStaticHolder();
    return staticStore.open(config);
  },
  success: staticMethod("success"),
  useMessage,
  warning: staticMethod("warning"),
} as const;
