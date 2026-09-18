import {
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type ForwardRefExoticComponent,
  forwardRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  type TextareaHTMLAttributes,
  type UIEvent,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { CloseIcon, LoadingIcon } from "../internal/icons.js";

export type MentionsPlacement = "bottom" | "top";
export type MentionsSize = "large" | "medium" | "small";
export type MentionsStatus = "error" | "success" | "validating" | "warning";
export type MentionsVariant = "borderless" | "filled" | "outlined" | "underlined";
export type MentionsSemanticName = "clear" | "option" | "popup" | "root" | "textarea";
export type MentionsClassNames = Partial<Record<MentionsSemanticName, string>>;
export type MentionsStyles = Partial<Record<MentionsSemanticName, CSSProperties>>;

export interface MentionsOption {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly key?: string;
  readonly label?: ReactNode;
  readonly style?: CSSProperties;
  readonly value: string;
}

export interface MentionValue {
  readonly prefix: string;
  readonly value: string;
}

export interface MentionsAutoSizeConfig {
  readonly maxRows?: number;
  readonly minRows?: number;
}

export interface MentionsClearConfig {
  readonly clearIcon?: ReactNode;
  readonly disabled?: boolean;
}

export interface MentionsRef {
  blur(): void;
  focus(options?: FocusOptions): void;
  readonly nativeElement: HTMLTextAreaElement | null;
}

export interface MentionsProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "className" | "defaultValue" | "onChange" | "onSelect" | "prefix" | "size" | "style" | "value"
  > {
  readonly allowClear?: boolean | MentionsClearConfig;
  readonly autoSize?: boolean | MentionsAutoSizeConfig;
  readonly className?: string;
  readonly classNames?:
    | MentionsClassNames
    | ((info: { readonly props: MentionsProps }) => MentionsClassNames);
  readonly defaultValue?: string;
  readonly filterOption?: false | ((input: string, option: MentionsOption) => boolean);
  readonly loading?: boolean;
  readonly notFoundContent?: ReactNode;
  readonly onChange?: (value: string) => void;
  readonly onClear?: () => void;
  readonly onPopupScroll?: (event: UIEvent<HTMLDivElement>) => void;
  readonly onResize?: (size: { readonly height: number; readonly width: number }) => void;
  readonly onSearch?: (text: string, prefix: string) => void;
  readonly onSelect?: (option: MentionsOption, prefix: string) => void;
  readonly options?: ReadonlyArray<MentionsOption>;
  readonly placement?: MentionsPlacement;
  readonly popupRender?: (menu: ReactElement) => ReactNode;
  readonly prefix?: string | ReadonlyArray<string>;
  readonly size?: MentionsSize;
  readonly split?: string;
  readonly status?: MentionsStatus;
  readonly style?: CSSProperties;
  readonly styles?: MentionsStyles | ((info: { readonly props: MentionsProps }) => MentionsStyles);
  readonly validateSearch?: (text: string, prefix: string) => boolean;
  readonly value?: string;
  readonly variant?: MentionsVariant;
}

interface ActiveMention {
  readonly end: number;
  readonly prefix: string;
  readonly query: string;
  readonly start: number;
}

function normalizePrefixes(prefix: MentionsProps["prefix"]) {
  const prefixes = typeof prefix === "string" ? [prefix] : [...(prefix ?? ["@"])];
  return prefixes
    .filter((item) => item.length > 0)
    .sort((left, right) => right.length - left.length);
}

function findActiveMention(
  value: string,
  cursor: number,
  prefixes: ReadonlyArray<string>,
  validateSearch: MentionsProps["validateSearch"],
) {
  const beforeCursor = value.slice(0, cursor);
  let match: ActiveMention | null = null;
  for (const prefix of prefixes) {
    const start = beforeCursor.lastIndexOf(prefix);
    if (start < 0) continue;
    const previous = beforeCursor[start - 1];
    if (start > 0 && previous !== undefined && !/\s|[([{]/.test(previous)) continue;
    const query = beforeCursor.slice(start + prefix.length);
    if (/\s/.test(query) || validateSearch?.(query, prefix) === false) continue;
    if (!match || start > match.start) match = { end: cursor, prefix, query, start };
  }
  return match;
}

function getMentions(
  value: string,
  config: { readonly prefix?: string | ReadonlyArray<string> } = {},
) {
  const prefixes = normalizePrefixes(config.prefix);
  const mentions: MentionValue[] = [];
  const tokens = value.split(/\s+/);
  for (const token of tokens) {
    const prefix = prefixes.find((item) => token.startsWith(item));
    if (!prefix) continue;
    const mentionValue = token.slice(prefix.length).replace(/[.,!?;:]+$/, "");
    if (mentionValue) mentions.push({ prefix, value: mentionValue });
  }
  return mentions;
}

const MentionsRoot = forwardRef<MentionsRef, MentionsProps>(
  function Mentions(mentionsProps, forwardedRef) {
    const {
      allowClear = false,
      autoSize = false,
      className,
      classNames: classNamesProp,
      defaultValue = "",
      disabled = false,
      filterOption,
      loading = false,
      notFoundContent = "No data",
      onBlur,
      onClick,
      onChange,
      onClear,
      onFocus,
      onKeyDown,
      onKeyUp,
      onPopupScroll,
      onResize,
      onSearch,
      onSelect,
      options = [],
      placement = "bottom",
      popupRender,
      prefix = "@",
      readOnly = false,
      rows = 1,
      size = "medium",
      split = " ",
      status,
      style,
      styles: stylesProp,
      validateSearch,
      value,
      variant = "outlined",
      ...textareaProps
    } = mentionsProps;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const popupId = useId();
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const displayValue = value ?? internalValue;
    const prefixes = useMemo(() => normalizePrefixes(prefix), [prefix]);
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: mentionsProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: mentionsProps }) : (stylesProp ?? {});
    const clearConfig = typeof allowClear === "object" ? allowClear : undefined;
    const showClear =
      allowClear !== false &&
      clearConfig?.disabled !== true &&
      displayValue.length > 0 &&
      !disabled &&
      !readOnly;

    const filteredOptions = useMemo(() => {
      if (!activeMention) return [];
      if (filterOption === false) return [...options];
      const query = activeMention.query.toLocaleLowerCase();
      return options.filter((option) =>
        filterOption
          ? filterOption(activeMention.query, option)
          : option.value.toLocaleLowerCase().includes(query),
      );
    }, [activeMention, filterOption, options]);
    const popupOpen = focused && !dismissed && activeMention !== null;

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => textareaRef.current?.blur(),
        focus: (focusOptions) => textareaRef.current?.focus(focusOptions),
        get nativeElement() {
          return textareaRef.current;
        },
      }),
      [],
    );

    useLayoutEffect(() => {
      if (!autoSize || !textareaRef.current) return;
      void displayValue;
      const textarea = textareaRef.current;
      const config = typeof autoSize === "object" ? autoSize : {};
      const computed = getComputedStyle(textarea);
      const lineHeight = Number.parseFloat(computed.lineHeight) || 22;
      const borderHeight = textarea.offsetHeight - textarea.clientHeight;
      textarea.style.height = "auto";
      const minimum = (config.minRows ?? 1) * lineHeight + borderHeight + 8;
      const maximum = config.maxRows ? config.maxRows * lineHeight + borderHeight + 8 : Infinity;
      textarea.style.height = `${Math.max(minimum, Math.min(textarea.scrollHeight, maximum))}px`;
      textarea.style.overflowY = textarea.scrollHeight > maximum ? "auto" : "hidden";
    }, [autoSize, displayValue]);

    useEffect(() => {
      const root = rootRef.current;
      if (!root || !onResize || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;
        onResize({ height: entry.contentRect.height, width: entry.contentRect.width });
      });
      observer.observe(root);
      return () => observer.disconnect();
    }, [onResize]);

    const publish = (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onChange?.(nextValue);
    };

    const updateActiveMention = (nextValue: string, cursor: number) => {
      const nextActive = findActiveMention(nextValue, cursor, prefixes, validateSearch);
      setActiveMention(nextActive);
      setActiveIndex(0);
      setDismissed(false);
      if (nextActive) onSearch?.(nextActive.query, nextActive.prefix);
    };

    const selectOption = (option: MentionsOption) => {
      if (!activeMention || option.disabled) return;
      const insertion = `${activeMention.prefix}${option.value}${split}`;
      const nextValue = `${displayValue.slice(0, activeMention.start)}${insertion}${displayValue.slice(activeMention.end)}`;
      const nextCursor = activeMention.start + insertion.length;
      publish(nextValue);
      onSelect?.(option, activeMention.prefix);
      setActiveMention(null);
      setDismissed(true);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    };

    const moveActiveOption = (direction: 1 | -1) => {
      if (filteredOptions.length === 0) return;
      let nextIndex = activeIndex;
      for (let attempts = 0; attempts < filteredOptions.length; attempts += 1) {
        nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
        if (!filteredOptions[nextIndex]?.disabled) {
          setActiveIndex(nextIndex);
          return;
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || !popupOpen) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveOption(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" || event.key === "Tab") {
        const option = filteredOptions[activeIndex];
        if (option && !option.disabled) {
          event.preventDefault();
          selectOption(option);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(true);
      }
    };

    const menu = (
      <div className="launch-ui-mentions-menu">
        {loading ? (
          <div className="launch-ui-mentions-empty">
            <LoadingIcon /> Loading
          </div>
        ) : filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <div
              aria-disabled={option.disabled || undefined}
              aria-selected={index === activeIndex}
              className={classes(
                "launch-ui-mentions-option",
                index === activeIndex && "is-active",
                option.disabled && "is-disabled",
                resolvedClassNames.option,
                option.className,
              )}
              id={`${popupId}-option-${index}`}
              key={option.key ?? option.value}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              role="option"
              style={{ ...resolvedStyles.option, ...option.style }}
              tabIndex={-1}
            >
              {option.label ?? option.value}
            </div>
          ))
        ) : (
          <div className="launch-ui-mentions-empty">{notFoundContent}</div>
        )}
      </div>
    );

    return (
      <div
        className={classes(
          "launch-ui-mentions",
          `is-${variant}`,
          `is-${size}`,
          focused && "is-focused",
          disabled && "is-disabled",
          readOnly && "is-readonly",
          status && `is-${status}`,
          resolvedClassNames.root,
          className,
        )}
        ref={rootRef}
        style={{ ...resolvedStyles.root, ...style }}
      >
        <textarea
          {...textareaProps}
          aria-activedescendant={
            popupOpen && filteredOptions[activeIndex]
              ? `${popupId}-option-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={popupOpen ? popupId : undefined}
          aria-expanded={popupOpen}
          aria-haspopup="listbox"
          aria-invalid={status === "error" || textareaProps["aria-invalid"]}
          autoComplete={textareaProps.autoComplete ?? "off"}
          className={classes("launch-ui-mentions-textarea", resolvedClassNames.textarea)}
          disabled={disabled}
          onBlur={(event: FocusEvent<HTMLTextAreaElement>) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.currentTarget.value;
            publish(nextValue);
            updateActiveMention(nextValue, event.currentTarget.selectionStart);
          }}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) {
              updateActiveMention(event.currentTarget.value, event.currentTarget.selectionStart);
            }
          }}
          onFocus={(event) => {
            setFocused(true);
            updateActiveMention(displayValue, event.currentTarget.selectionStart);
            onFocus?.(event);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => {
            onKeyUp?.(event);
            if (
              !event.defaultPrevented &&
              !["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(event.key)
            ) {
              updateActiveMention(event.currentTarget.value, event.currentTarget.selectionStart);
            }
          }}
          readOnly={readOnly}
          ref={textareaRef}
          role="combobox"
          rows={rows}
          style={resolvedStyles.textarea}
          value={displayValue}
        />
        {showClear ? (
          <button
            aria-label="Clear mentions"
            className={classes("launch-ui-mentions-clear", resolvedClassNames.clear)}
            onClick={() => {
              publish("");
              setActiveMention(null);
              onClear?.();
              textareaRef.current?.focus();
            }}
            style={resolvedStyles.clear}
            type="button"
          >
            {clearConfig?.clearIcon ?? <CloseIcon />}
          </button>
        ) : null}
        {popupOpen ? (
          <div
            className={classes(
              "launch-ui-mentions-popup",
              `is-${placement}`,
              resolvedClassNames.popup,
            )}
            id={popupId}
            onScroll={onPopupScroll}
            role="listbox"
            style={resolvedStyles.popup}
          >
            {popupRender ? popupRender(menu) : menu}
          </div>
        ) : null}
      </div>
    );
  },
);

interface MentionsComponent
  extends ForwardRefExoticComponent<MentionsProps & RefAttributes<MentionsRef>> {
  readonly getMentions: typeof getMentions;
}

export const Mentions = Object.assign(MentionsRoot, { getMentions }) as MentionsComponent;
