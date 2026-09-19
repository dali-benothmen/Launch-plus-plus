import {
  createElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { Tooltip } from "../tooltip/index.js";

export type TypographyTextType =
  | "danger"
  | "default"
  | "secondary"
  | "success"
  | "tertiary"
  | "warning";

export interface TypographyActionsConfig {
  readonly placement?: "end" | "start";
}

export interface TypographyCopyableConfig {
  readonly icon?: ReactNode | readonly [ReactNode, ReactNode];
  readonly onCopy?: () => void;
  readonly text?: string | (() => Promise<string> | string);
  readonly tooltips?: false | readonly [ReactNode, ReactNode];
}

export interface TypographyEditableConfig {
  readonly autoSize?: boolean | { readonly maxRows?: number; readonly minRows?: number };
  readonly editing?: boolean;
  readonly enterIcon?: ReactNode | null;
  readonly icon?: ReactNode;
  readonly maxLength?: number;
  readonly onCancel?: () => void;
  readonly onChange?: (value: string) => void;
  readonly onEnd?: () => void;
  readonly onStart?: () => void;
  readonly text?: string;
  readonly tooltip?: false | ReactNode;
  readonly triggerType?: ReadonlyArray<"icon" | "text">;
}

export interface TypographyEllipsisConfig {
  readonly defaultExpanded?: boolean;
  readonly expandable?: boolean | "collapsible";
  readonly expanded?: boolean;
  readonly onExpand?: (
    event: ReactMouseEvent<HTMLButtonElement>,
    info: { readonly expanded: boolean },
  ) => void;
  readonly onEllipsis?: (ellipsis: boolean) => void;
  readonly rows?: number;
  readonly suffix?: string;
  readonly symbol?: ReactNode | ((expanded: boolean) => ReactNode);
  readonly tooltip?: boolean | ReactNode;
}

interface CommonTypographyProps {
  readonly actions?: TypographyActionsConfig;
  readonly code?: boolean;
  readonly copyable?: boolean | TypographyCopyableConfig;
  readonly delete?: boolean;
  readonly disabled?: boolean;
  readonly editable?: boolean | TypographyEditableConfig;
  readonly ellipsis?: boolean | TypographyEllipsisConfig;
  readonly italic?: boolean;
  readonly keyboard?: boolean;
  readonly mark?: boolean;
  readonly strong?: boolean;
  readonly type?: TypographyTextType;
  readonly underline?: boolean;
}

export interface TypographyProps extends HTMLAttributes<HTMLDivElement> {}

export interface TitleProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "children">,
    CommonTypographyProps {
  readonly children?: ReactNode;
  readonly level?: 1 | 2 | 3 | 4 | 5;
}

export interface TextProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    CommonTypographyProps {
  readonly children?: ReactNode;
}

export interface ParagraphProps
  extends Omit<HTMLAttributes<HTMLParagraphElement>, "children">,
    CommonTypographyProps {
  readonly children?: ReactNode;
}

export interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "type">,
    CommonTypographyProps {
  readonly children?: ReactNode;
}

interface TypographyElementProps extends CommonTypographyProps {
  readonly as: "a" | "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span";
  readonly children?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly [key: string]: unknown;
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m10.9 2.6 2.5 2.5-7.6 7.6-3.1.6.6-3.1 7.6-7.6Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect height="9" rx="1.25" width="8" x="5" y="4" />
      <path d="M3 11H2.75A1.75 1.75 0 0 1 1 9.25v-6.5A1.75 1.75 0 0 1 2.75 1h6.5A1.75 1.75 0 0 1 11 2.75V3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m3 8.4 3.1 3.1L13 4.7" />
    </svg>
  );
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement<{ readonly children?: ReactNode }>(node))
    return getNodeText(node.props.children);
  return "";
}

interface ActionButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly tooltip?: false | ReactNode;
}

function ActionButton({ icon, label, onClick, tooltip }: ActionButtonProps) {
  const button = (
    <button
      aria-label={label}
      className="launch-ui-typography-action"
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );

  return tooltip === false ? button : <Tooltip title={tooltip ?? label}>{button}</Tooltip>;
}

function TypographyElement({
  actions,
  as,
  children,
  className,
  code = false,
  copyable = false,
  delete: deleted = false,
  disabled = false,
  editable = false,
  ellipsis = false,
  italic = false,
  keyboard = false,
  mark = false,
  strong = false,
  style,
  type = "default",
  underline = false,
  ...elementProps
}: TypographyElementProps) {
  const editableConfig = editable === true ? {} : editable || undefined;
  const copyableConfig = copyable === true ? {} : copyable || undefined;
  const ellipsisConfig = ellipsis === true ? {} : ellipsis || undefined;
  const [internalEditing, setInternalEditing] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(
    ellipsisConfig?.defaultExpanded ?? false,
  );
  const [internalText, setInternalText] = useState<string>();
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const ellipsisContentRef = useRef<HTMLElement | null>(null);

  const editing = editableConfig?.editing ?? internalEditing;
  const expanded = ellipsisConfig?.expanded ?? internalExpanded;
  const renderedChildren =
    editableConfig?.onChange === undefined && internalText !== undefined ? internalText : children;
  const plainText = editableConfig?.text ?? getNodeText(renderedChildren);
  const triggerTypes = editableConfig?.triggerType ?? ["icon"];
  const actionPlacement = actions?.placement ?? "end";

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const contentElement = ellipsisContentRef.current;
    if (!contentElement || !ellipsisConfig) return;

    const reportEllipsis = () => {
      const isSingleLine = as === "a" || as === "span";
      const isEllipsed =
        !expanded &&
        (isSingleLine
          ? contentElement.scrollWidth > contentElement.clientWidth
          : contentElement.scrollHeight > contentElement.clientHeight);
      ellipsisConfig.onEllipsis?.(isEllipsed);
    };

    reportEllipsis();
    const observer = new ResizeObserver(reportEllipsis);
    observer.observe(contentElement);
    return () => observer.disconnect();
  }, [as, ellipsisConfig, expanded]);

  function startEditing() {
    if (!editableConfig || disabled) return;
    setDraft(plainText);
    if (editableConfig.editing === undefined) setInternalEditing(true);
    editableConfig.onStart?.();
  }

  function finishEditing() {
    if (!editableConfig) return;
    if (editableConfig.onChange === undefined) setInternalText(draft);
    editableConfig.onChange?.(draft);
    editableConfig.onEnd?.();
    if (editableConfig.editing === undefined) setInternalEditing(false);
  }

  function cancelEditing() {
    editableConfig?.onCancel?.();
    if (editableConfig?.editing === undefined) setInternalEditing(false);
  }

  async function copyText() {
    if (!copyableConfig || disabled) return;
    const configuredText = copyableConfig.text;
    const text =
      typeof configuredText === "function" ? await configuredText() : (configuredText ?? plainText);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    copyableConfig.onCopy?.();
  }

  function toggleExpanded(event: ReactMouseEvent<HTMLButtonElement>) {
    if (!ellipsisConfig) return;
    const nextExpanded = !expanded;
    if (ellipsisConfig.expanded === undefined) setInternalExpanded(nextExpanded);
    ellipsisConfig.onExpand?.(event, { expanded: nextExpanded });
  }

  const resolvedElementProps: Record<string, unknown> & { href?: unknown } = { ...elementProps };
  if (disabled) {
    resolvedElementProps["aria-disabled"] = true;
    if (as === "a") delete resolvedElementProps.href;
  }

  const elementClassName = classes(
    "launch-ui-typography",
    as === "p" && "launch-ui-paragraph",
    as === "a" && "launch-ui-link",
    as.startsWith("h") && "launch-ui-title",
    as.startsWith("h") && `is-level-${as.slice(1)}`,
    as === "span" && "launch-ui-text",
    ellipsisConfig && "has-ellipsis",
    type !== "default" && `is-${type}`,
    code && "is-code",
    deleted && "is-delete",
    disabled && "is-disabled",
    italic && "is-italic",
    keyboard && "is-keyboard",
    mark && "is-mark",
    strong && "is-strong",
    underline && "is-underline",
    className,
  );

  if (editing && editableConfig) {
    const autoSize = editableConfig.autoSize;
    const rows = typeof autoSize === "object" ? (autoSize.minRows ?? 1) : 1;
    const editContent = (
      <>
        <textarea
          aria-label="Edit text"
          className="launch-ui-typography-editor"
          maxLength={editableConfig.maxLength}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Escape") cancelEditing();
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              finishEditing();
            }
          }}
          ref={editorRef}
          rows={rows}
          value={draft}
        />
        {editableConfig.enterIcon === null ? null : (
          <ActionButton
            icon={editableConfig.enterIcon ?? <CheckIcon />}
            label="Save text"
            onClick={finishEditing}
            tooltip="Save"
          />
        )}
      </>
    );

    return createElement(
      as,
      {
        ...resolvedElementProps,
        className: classes(elementClassName, "is-editing"),
        style,
      },
      editContent,
    );
  }

  const typographyActions: ReactNode[] = [];

  if (copyableConfig) {
    const configuredIcons = copyableConfig.icon;
    const copyIcon = Array.isArray(configuredIcons)
      ? configuredIcons[copied ? 1 : 0]
      : (configuredIcons ?? (copied ? <CheckIcon /> : <CopyIcon />));
    const configuredTooltips = copyableConfig.tooltips;
    const copyTooltip =
      configuredTooltips === false
        ? false
        : (configuredTooltips?.[copied ? 1 : 0] ?? (copied ? "Copied" : "Copy"));
    typographyActions.push(
      <ActionButton
        icon={copyIcon}
        key="copy"
        label={copied ? "Copied" : "Copy text"}
        onClick={() => void copyText()}
        tooltip={copyTooltip}
      />,
    );
  }

  if (editableConfig && triggerTypes.includes("icon")) {
    typographyActions.push(
      <ActionButton
        icon={editableConfig.icon ?? <EditIcon />}
        key="edit"
        label="Edit text"
        onClick={startEditing}
        tooltip={editableConfig.tooltip ?? "Edit"}
      />,
    );
  }

  const ellipsisRows = Math.max(1, ellipsisConfig?.rows ?? 1);
  const contentStyle = ellipsisConfig
    ? ({ "--launch-ui-ellipsis-rows": ellipsisRows } as CSSProperties)
    : undefined;
  const isTextEditTrigger = Boolean(editableConfig && triggerTypes.includes("text"));
  const contentClassName = classes(
    "launch-ui-typography-content",
    ellipsisConfig && !expanded && "is-ellipsis",
    ellipsisConfig && (as === "a" || as === "span") && "is-single-line",
    isTextEditTrigger && "is-editable-trigger",
  );
  const contentBody = (
    <>
      {renderedChildren}
      {ellipsisConfig?.suffix ? (
        <span className="launch-ui-typography-suffix">{ellipsisConfig.suffix}</span>
      ) : null}
    </>
  );
  const content = isTextEditTrigger ? (
    <button
      className={contentClassName}
      onClick={startEditing}
      ref={(element) => {
        ellipsisContentRef.current = element;
      }}
      style={contentStyle}
      type="button"
    >
      {contentBody}
    </button>
  ) : ellipsisConfig ? (
    <span
      className={contentClassName}
      ref={(element) => {
        ellipsisContentRef.current = element;
      }}
      style={contentStyle}
    >
      {contentBody}
    </span>
  ) : (
    renderedChildren
  );

  const canCollapse = ellipsisConfig?.expandable === "collapsible";
  const showExpandAction = Boolean(ellipsisConfig?.expandable && (!expanded || canCollapse));
  const symbol = ellipsisConfig?.symbol;
  const expandLabel = expanded ? "Show less" : "Show more";
  const expandSymbol =
    typeof symbol === "function" ? symbol(expanded) : (symbol ?? (expanded ? "less" : "more"));
  const expandAction = showExpandAction ? (
    <button
      aria-label={expandLabel}
      className="launch-ui-typography-expand"
      onClick={toggleExpanded}
      type="button"
    >
      {expandSymbol}
    </button>
  ) : null;
  const contentWithActions = (
    <>
      {actionPlacement === "start" ? typographyActions : null}
      {content}
      {expandAction}
      {actionPlacement === "end" ? typographyActions : null}
    </>
  );
  const element = createElement(
    as,
    { ...resolvedElementProps, className: elementClassName, style },
    contentWithActions,
  );

  if (!ellipsisConfig || expanded || !ellipsisConfig.tooltip) return element;
  const tooltip = ellipsisConfig.tooltip === true ? plainText : ellipsisConfig.tooltip;
  return <Tooltip title={tooltip}>{element as ReactElement}</Tooltip>;
}

function TypographyRoot({ className, ...props }: TypographyProps) {
  return <div {...props} className={classes("launch-ui-typography-root", className)} />;
}

function Title({ level = 1, ...props }: TitleProps) {
  return <TypographyElement {...(props as TypographyElementProps)} as={`h${level}`} />;
}

function Text(props: TextProps) {
  return <TypographyElement {...(props as TypographyElementProps)} as="span" />;
}

function Paragraph(props: ParagraphProps) {
  return <TypographyElement {...(props as TypographyElementProps)} as="p" />;
}

function Link(props: LinkProps) {
  return <TypographyElement {...(props as TypographyElementProps)} as="a" />;
}

export const Typography = Object.assign(TypographyRoot, { Link, Paragraph, Text, Title });
