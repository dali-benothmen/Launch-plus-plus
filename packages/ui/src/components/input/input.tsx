import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type MouseEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { CloseIcon, LoadingIcon } from "../internal/icons.js";

export type InputVariant = "borderless" | "filled" | "outlined" | "underlined";
export type InputShape = "default" | "round";
export type InputSize = "large" | "medium" | "small";
export type InputStatus = "error" | "warning";
export type InputSemanticName = "clear" | "count" | "input" | "prefix" | "root" | "suffix";
export type InputClassNames = Partial<Record<InputSemanticName, string>>;
export type InputStyles = Partial<Record<InputSemanticName, CSSProperties>>;

export interface InputCountInfo {
  readonly count: number;
  readonly maxLength?: number;
  readonly value: string;
}

export interface InputCountConfig {
  readonly exceedFormatter?: (value: string, config: { readonly max: number }) => string;
  readonly max?: number;
  readonly show?: boolean | ((info: InputCountInfo) => ReactNode);
  readonly strategy?: (value: string) => number;
}

export interface InputClearConfig {
  readonly clearIcon?: ReactNode;
  readonly disabled?: boolean;
}

export interface InputShowCountConfig {
  readonly formatter: (info: InputCountInfo) => ReactNode;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  readonly allowClear?: boolean | InputClearConfig;
  readonly classNames?:
    | InputClassNames
    | ((info: { readonly props: InputProps }) => InputClassNames);
  readonly count?: InputCountConfig;
  readonly onClear?: () => void;
  readonly onPressEnter?: KeyboardEventHandler<HTMLInputElement>;
  readonly prefix?: ReactNode;
  readonly shape?: InputShape;
  readonly showCount?: boolean | InputShowCountConfig;
  readonly size?: InputSize;
  readonly status?: InputStatus;
  readonly styles?: InputStyles | ((info: { readonly props: InputProps }) => InputStyles);
  readonly suffix?: ReactNode;
  readonly variant?: InputVariant;
}

export interface TextAreaAutoSizeConfig {
  readonly maxRows?: number;
  readonly minRows?: number;
}

export type TextAreaSemanticName = "clear" | "count" | "footer" | "root" | "textarea";
export type TextAreaClassNames = Partial<Record<TextAreaSemanticName, string>>;
export type TextAreaStyles = Partial<Record<TextAreaSemanticName, CSSProperties>>;

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly allowClear?: boolean | InputClearConfig;
  readonly autoSize?: boolean | TextAreaAutoSizeConfig;
  readonly classNames?:
    | TextAreaClassNames
    | ((info: { readonly props: TextAreaProps }) => TextAreaClassNames);
  readonly count?: InputCountConfig;
  readonly footer?: ReactNode;
  readonly onClear?: () => void;
  readonly onPressEnter?: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly showCount?: boolean | InputShowCountConfig;
  readonly status?: InputStatus;
  readonly styles?: TextAreaStyles | ((info: { readonly props: TextAreaProps }) => TextAreaStyles);
  readonly variant?: InputVariant;
}

export interface SearchInfo {
  readonly source: "clear" | "input";
}

export interface SearchProps extends InputProps {
  readonly enterButton?: boolean | ReactNode;
  readonly loading?: boolean;
  readonly onSearch?: (
    value: string,
    event: KeyboardEvent<HTMLInputElement> | MouseEvent<HTMLElement> | undefined,
    info: SearchInfo,
  ) => void;
  readonly searchIcon?: ReactNode;
}

export interface PasswordVisibilityConfig {
  readonly onVisibleChange?: (visible: boolean) => void;
  readonly tabIndex?: number;
  readonly visible?: boolean;
}

export interface PasswordProps extends Omit<InputProps, "type"> {
  readonly iconRender?: (visible: boolean) => ReactNode;
  readonly visibilityToggle?: boolean | PasswordVisibilityConfig;
}

export type OTPSemanticName = "input" | "root" | "separator";
export type OTPClassNames = Partial<Record<OTPSemanticName, string>>;
export type OTPStyles = Partial<Record<OTPSemanticName, CSSProperties>>;

export interface OTPProps {
  readonly autoComplete?: string;
  readonly className?: string;
  readonly classNames?: OTPClassNames | ((info: { readonly props: OTPProps }) => OTPClassNames);
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly formatter?: (value: string) => string;
  readonly length?: number;
  readonly mask?: boolean | string;
  readonly onChange?: (value: string) => void;
  readonly onInput?: (value: string[]) => void;
  readonly separator?: ReactNode | ((index: number) => ReactNode);
  readonly size?: InputSize;
  readonly status?: InputStatus;
  readonly style?: CSSProperties;
  readonly styles?: OTPStyles | ((info: { readonly props: OTPProps }) => OTPStyles);
  readonly value?: string;
  readonly variant?: InputVariant;
}

function resolveInputValue(value: InputProps["value"], defaultValue: InputProps["defaultValue"]) {
  const resolved = value ?? defaultValue ?? "";
  return Array.isArray(resolved) ? resolved.join(",") : String(resolved);
}

function countCharacters(value: string, count?: InputCountConfig) {
  return count?.strategy?.(value) ?? Array.from(value).length;
}

function renderCount(
  value: string,
  maxLength: number | undefined,
  showCount: InputProps["showCount"],
  count: InputCountConfig | undefined,
) {
  const currentCount = countCharacters(value, count);
  const maximum = count?.max ?? maxLength;
  const info: InputCountInfo = {
    count: currentCount,
    ...(maximum === undefined ? {} : { maxLength: maximum }),
    value,
  };
  if (typeof count?.show === "function") return count.show(info);
  if (typeof showCount === "object") return showCount.formatter(info);
  return maximum === undefined ? currentCount : `${currentCount} / ${maximum}`;
}

function dispatchClearedValue(element: HTMLInputElement | HTMLTextAreaElement) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, "");
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

function EyeIcon({ visible }: { readonly visible: boolean }) {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="M1.8 8s2.2-4 6.2-4 6.2 4 6.2 4-2.2 4-6.2 4S1.8 8 1.8 8Z" />
      <circle cx="8" cy="8" r="1.8" />
      {!visible ? <path d="m2.5 2.5 11 11" /> : null}
    </svg>
  );
}

const InputRoot = forwardRef<HTMLInputElement, InputProps>(function Input(inputProps, ref) {
  const {
    allowClear = false,
    className,
    classNames: classNamesProp,
    count,
    defaultValue,
    disabled = false,
    maxLength,
    onChange,
    onClear,
    onKeyDown,
    onPressEnter,
    prefix,
    shape = "default",
    showCount = false,
    size = "medium",
    status,
    style,
    styles: stylesProp,
    suffix,
    value,
    variant = "outlined",
    ...props
  } = inputProps;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [displayValue, setDisplayValue] = useState(() => resolveInputValue(value, defaultValue));
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: inputProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: inputProps }) : (stylesProp ?? {});
  const showCounter = showCount !== false || count?.show !== undefined;
  const clearConfig = typeof allowClear === "object" ? allowClear : undefined;
  const showClear =
    allowClear !== false && clearConfig?.disabled !== true && displayValue.length > 0 && !disabled;
  const decorated = prefix !== undefined || suffix !== undefined || showClear || showCounter;
  const exceeded = count?.max !== undefined && countCharacters(displayValue, count) > count.max;
  const rootClasses = classes(
    "launch-ui-input",
    `is-${variant}`,
    `is-${size}`,
    shape === "round" && "is-round",
    status && `is-${status}`,
    disabled && "is-disabled",
    exceeded && "is-count-exceeded",
    decorated && "is-affix-wrapper",
    resolvedClassNames.root,
    className,
  );

  useEffect(() => {
    if (value !== undefined) setDisplayValue(resolveInputValue(value, undefined));
  }, [value]);

  const setRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    let nextValue = event.currentTarget.value;
    if (count?.max !== undefined && count.exceedFormatter) {
      nextValue = count.exceedFormatter(nextValue, { max: count.max });
      event.currentTarget.value = nextValue;
    }
    setDisplayValue(nextValue);
    onChange?.(event);
  };

  const input = (
    <input
      {...props}
      aria-invalid={status === "error" || props["aria-invalid"]}
      className={
        decorated ? classes("launch-ui-input-element", resolvedClassNames.input) : rootClasses
      }
      disabled={disabled}
      maxLength={maxLength}
      onChange={handleChange}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === "Enter") onPressEnter?.(event);
      }}
      ref={setRef}
      style={
        decorated
          ? resolvedStyles.input
          : { ...resolvedStyles.root, ...resolvedStyles.input, ...style }
      }
      value={value === undefined ? displayValue : resolveInputValue(value, undefined)}
    />
  );

  if (!decorated) return input;

  return (
    <div className={rootClasses} style={{ ...resolvedStyles.root, ...style }}>
      {prefix !== undefined ? (
        <span
          className={classes("launch-ui-input-prefix", resolvedClassNames.prefix)}
          style={resolvedStyles.prefix}
        >
          {prefix}
        </span>
      ) : null}
      {input}
      {showCounter ? (
        <span
          className={classes("launch-ui-input-count", resolvedClassNames.count)}
          style={resolvedStyles.count}
        >
          {renderCount(displayValue, maxLength, showCount, count)}
        </span>
      ) : null}
      {suffix !== undefined ? (
        <span
          className={classes("launch-ui-input-suffix", resolvedClassNames.suffix)}
          style={resolvedStyles.suffix}
        >
          {suffix}
        </span>
      ) : null}
      {showClear ? (
        <button
          aria-label="Clear input"
          className={classes("launch-ui-input-clear", resolvedClassNames.clear)}
          onClick={(event) => {
            event.stopPropagation();
            if (inputRef.current) dispatchClearedValue(inputRef.current);
            setDisplayValue("");
            onClear?.();
            inputRef.current?.focus();
          }}
          style={resolvedStyles.clear}
          type="button"
        >
          {clearConfig?.clearIcon ?? <CloseIcon />}
        </button>
      ) : null}
    </div>
  );
});

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(textAreaProps, ref) {
    const {
      allowClear = false,
      autoSize = false,
      className,
      classNames: classNamesProp,
      count,
      defaultValue,
      disabled = false,
      footer,
      maxLength,
      onChange,
      onClear,
      onKeyDown,
      onPressEnter,
      rows,
      showCount = false,
      status,
      style,
      styles: stylesProp,
      value,
      variant = "outlined",
      ...props
    } = textAreaProps;
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const [displayValue, setDisplayValue] = useState(() => String(value ?? defaultValue ?? ""));
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: textAreaProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: textAreaProps }) : (stylesProp ?? {});
    const clearConfig = typeof allowClear === "object" ? allowClear : undefined;
    const showClear =
      allowClear !== false &&
      clearConfig?.disabled !== true &&
      displayValue.length > 0 &&
      !disabled;
    const showCounter = showCount !== false || count?.show !== undefined;
    const hasFooter = footer !== undefined && footer !== null;
    const exceeded = count?.max !== undefined && countCharacters(displayValue, count) > count.max;

    useEffect(() => {
      if (value !== undefined) setDisplayValue(String(value));
    }, [value]);

    useLayoutEffect(() => {
      if (!autoSize || !textAreaRef.current) return;
      void displayValue;
      const element = textAreaRef.current;
      const config = typeof autoSize === "object" ? autoSize : {};
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 22;
      const borderHeight = element.offsetHeight - element.clientHeight;
      element.style.height = "auto";
      const minimum = (config.minRows ?? 1) * lineHeight + borderHeight + 8;
      const maximum = config.maxRows ? config.maxRows * lineHeight + borderHeight + 8 : Infinity;
      element.style.height = `${Math.max(minimum, Math.min(element.scrollHeight, maximum))}px`;
      element.style.overflowY = element.scrollHeight > maximum ? "auto" : "hidden";
    }, [autoSize, displayValue]);

    const setRef = (node: HTMLTextAreaElement | null) => {
      textAreaRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <div
        className={classes(
          "launch-ui-textarea-wrapper",
          `is-${variant}`,
          status && `is-${status}`,
          disabled && "is-disabled",
          exceeded && "is-count-exceeded",
          hasFooter && "has-footer",
          resolvedClassNames.root,
          className,
        )}
        style={resolvedStyles.root}
      >
        <textarea
          {...props}
          aria-invalid={status === "error" || props["aria-invalid"]}
          className={classes("launch-ui-textarea", resolvedClassNames.textarea)}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(event) => {
            let nextValue = event.currentTarget.value;
            if (count?.max !== undefined && count.exceedFormatter) {
              nextValue = count.exceedFormatter(nextValue, { max: count.max });
              event.currentTarget.value = nextValue;
            }
            setDisplayValue(nextValue);
            onChange?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && event.key === "Enter") onPressEnter?.(event);
          }}
          ref={setRef}
          rows={rows}
          style={{ ...resolvedStyles.textarea, ...style }}
          value={
            value === undefined ? displayValue : Array.isArray(value) ? value.join(",") : value
          }
        />
        {showClear ? (
          <button
            aria-label="Clear text area"
            className={classes("launch-ui-textarea-clear", resolvedClassNames.clear)}
            onClick={() => {
              if (textAreaRef.current) dispatchClearedValue(textAreaRef.current);
              setDisplayValue("");
              onClear?.();
              textAreaRef.current?.focus();
            }}
            style={resolvedStyles.clear}
            type="button"
          >
            {clearConfig?.clearIcon ?? <CloseIcon />}
          </button>
        ) : null}
        {hasFooter ? (
          <div
            className={classes("launch-ui-textarea-footer", resolvedClassNames.footer)}
            style={resolvedStyles.footer}
          >
            {showCounter ? (
              <span
                className={classes("launch-ui-textarea-count", resolvedClassNames.count)}
                style={resolvedStyles.count}
              >
                {renderCount(displayValue, maxLength, showCount, count)}
              </span>
            ) : null}
            {footer}
          </div>
        ) : showCounter ? (
          <span
            className={classes("launch-ui-textarea-count", resolvedClassNames.count)}
            style={resolvedStyles.count}
          >
            {renderCount(displayValue, maxLength, showCount, count)}
          </span>
        ) : null}
      </div>
    );
  },
);

const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(searchProps, ref) {
  const {
    allowClear,
    className,
    enterButton = false,
    loading = false,
    onClear,
    onKeyDown,
    onSearch,
    searchIcon,
    suffix,
    ...inputProps
  } = searchProps;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  const icon = loading ? <LoadingIcon /> : (searchIcon ?? <SearchIcon />);
  const submit = (event: KeyboardEvent<HTMLInputElement> | MouseEvent<HTMLElement>) => {
    onSearch?.(inputRef.current?.value ?? "", event, { source: "input" });
  };
  const input = (
    <InputRoot
      {...inputProps}
      {...(allowClear === undefined ? {} : { allowClear })}
      className={classes(enterButton !== false && "launch-ui-search-input", className)}
      onClear={() => {
        onClear?.();
        onSearch?.("", undefined, { source: "clear" });
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === "Enter") submit(event);
      }}
      ref={setRef}
      {...(enterButton === false
        ? {
            suffix: (
              <button
                aria-label="Search"
                className="launch-ui-search-icon-button"
                disabled={inputProps.disabled}
                onClick={submit}
                type="button"
              >
                {icon}
              </button>
            ),
          }
        : suffix === undefined
          ? {}
          : { suffix })}
    />
  );

  if (enterButton === false) return input;
  return (
    <div className="launch-ui-search">
      {input}
      <button
        className="launch-ui-search-button"
        disabled={loading || inputProps.disabled}
        onClick={submit}
        type="button"
      >
        {loading ? <LoadingIcon /> : enterButton === true ? icon : enterButton}
      </button>
    </div>
  );
});

const Password = forwardRef<HTMLInputElement, PasswordProps>(function Password(
  {
    iconRender = (visible) => <EyeIcon visible={visible} />,
    suffix,
    visibilityToggle = true,
    ...props
  },
  ref,
) {
  const config = typeof visibilityToggle === "object" ? visibilityToggle : undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = config?.visible ?? internalVisible;
  const toggle = () => {
    const nextVisible = !visible;
    if (config?.visible === undefined) setInternalVisible(nextVisible);
    config?.onVisibleChange?.(nextVisible);
  };
  const toggleButton =
    visibilityToggle === false ? null : (
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="launch-ui-password-toggle"
        disabled={props.disabled}
        onClick={toggle}
        tabIndex={config?.tabIndex ?? 0}
        type="button"
      >
        {iconRender(visible)}
      </button>
    );

  return (
    <InputRoot
      {...props}
      ref={ref}
      suffix={
        suffix !== undefined || toggleButton ? (
          <span className="launch-ui-password-actions">
            {suffix}
            {toggleButton}
          </span>
        ) : undefined
      }
      type={visible ? "text" : "password"}
    />
  );
});

function OTP(otpProps: OTPProps) {
  const {
    autoComplete,
    className,
    classNames: classNamesProp,
    defaultValue = "",
    disabled = false,
    formatter,
    length = 6,
    mask = false,
    onChange,
    onInput,
    separator,
    size = "medium",
    status,
    style,
    styles: stylesProp,
    value,
    variant = "outlined",
  } = otpProps;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const resolvedValue = formatter?.(value ?? internalValue) ?? value ?? internalValue;
  const characters = Array.from(resolvedValue).slice(0, length);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: otpProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: otpProps }) : (stylesProp ?? {});

  const update = (index: number, nextCharacter: string) => {
    const next = Array.from({ length }, (_, itemIndex) =>
      itemIndex === index ? nextCharacter : (characters[itemIndex] ?? ""),
    );
    const nextValue = formatter?.(next.join("")) ?? next.join("");
    if (value === undefined) setInternalValue(nextValue);
    onInput?.(next);
    if (next.every(Boolean)) onChange?.(nextValue);
  };

  const fill = (startIndex: number, text: string) => {
    const incoming = Array.from(formatter?.(text) ?? text).slice(0, length - startIndex);
    const next = Array.from({ length }, (_, index) =>
      index >= startIndex && index < startIndex + incoming.length
        ? (incoming[index - startIndex] ?? "")
        : (characters[index] ?? ""),
    );
    const nextValue = next.join("");
    if (value === undefined) setInternalValue(nextValue);
    onInput?.(next);
    if (next.every(Boolean)) onChange?.(nextValue);
    inputRefs.current[Math.min(startIndex + incoming.length, length - 1)]?.focus();
  };

  return (
    <div
      className={classes(
        "launch-ui-otp",
        `is-${size}`,
        status && `is-${status}`,
        disabled && "is-disabled",
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {Array.from({ length }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: OTP fields are stable positional slots.
        <span className="launch-ui-otp-slot" key={`otp-${index}`}>
          <input
            aria-label={`Character ${index + 1} of ${length}`}
            autoComplete={index === 0 ? autoComplete : "off"}
            className={classes("launch-ui-otp-input", `is-${variant}`, resolvedClassNames.input)}
            disabled={disabled}
            maxLength={1}
            onChange={(event) => {
              const nextCharacter = Array.from(event.currentTarget.value).at(-1) ?? "";
              update(index, nextCharacter);
              if (nextCharacter) inputRefs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !characters[index])
                inputRefs.current[index - 1]?.focus();
              if (event.key === "ArrowLeft") inputRefs.current[index - 1]?.focus();
              if (event.key === "ArrowRight") inputRefs.current[index + 1]?.focus();
            }}
            onPaste={(event) => {
              event.preventDefault();
              fill(index, event.clipboardData.getData("text"));
            }}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            style={resolvedStyles.input}
            value={
              characters[index]
                ? typeof mask === "string"
                  ? mask
                  : mask
                    ? "•"
                    : characters[index]
                : ""
            }
          />
          {index < length - 1 && separator !== undefined ? (
            <span
              className={classes("launch-ui-otp-separator", resolvedClassNames.separator)}
              style={resolvedStyles.separator}
            >
              {typeof separator === "function" ? separator(index) : separator}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export const Input = Object.assign(InputRoot, { OTP, Password, Search, TextArea });
