import {
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type ForwardedRef,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { classes } from "../internal/classes.js";

export type InputNumberValue = number | string;
export type InputNumberMode = "input" | "spinner";
export type InputNumberSize = "large" | "medium" | "small";
export type InputNumberStatus = "error" | "warning";
export type InputNumberVariant = "borderless" | "filled" | "outlined" | "underlined";
export type InputNumberSemanticName =
  | "action"
  | "actions"
  | "down"
  | "input"
  | "prefix"
  | "root"
  | "suffix"
  | "up";
export type InputNumberClassNames = Partial<Record<InputNumberSemanticName, string>>;
export type InputNumberStyles = Partial<Record<InputNumberSemanticName, CSSProperties>>;

export interface InputNumberControls {
  readonly downIcon?: ReactNode;
  readonly upIcon?: ReactNode;
}

export interface InputNumberStepInfo {
  readonly emitter: "handler" | "keyboard" | "wheel";
  readonly offset: InputNumberValue;
  readonly type: "down" | "up";
}

export interface InputNumberRef {
  blur(): void;
  focus(options?: {
    readonly cursor?: "all" | "end" | "start";
    readonly preventScroll?: boolean;
  }): void;
  readonly nativeElement: HTMLDivElement | null;
}

export interface InputNumberProps<TValue extends InputNumberValue = number>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "className"
    | "defaultValue"
    | "onChange"
    | "onInput"
    | "prefix"
    | "size"
    | "step"
    | "style"
    | "type"
    | "value"
  > {
  readonly changeOnBlur?: boolean;
  readonly changeOnWheel?: boolean;
  readonly className?: string;
  readonly classNames?:
    | InputNumberClassNames
    | ((info: { readonly props: InputNumberProps<TValue> }) => InputNumberClassNames);
  readonly controls?: boolean | InputNumberControls;
  readonly decimalSeparator?: string;
  readonly defaultValue?: TValue;
  readonly formatter?: (
    value: TValue | undefined,
    info: { readonly input: string; readonly userTyping: boolean },
  ) => string;
  readonly keyboard?: boolean;
  readonly max?: InputNumberValue;
  readonly min?: InputNumberValue;
  readonly mode?: InputNumberMode;
  readonly onChange?: (value: TValue | null) => void;
  readonly onInput?: (text: string) => void;
  readonly onPressEnter?: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onStep?: (value: TValue, info: InputNumberStepInfo) => void;
  readonly parser?: (displayValue: string) => TValue;
  readonly precision?: number;
  readonly prefix?: ReactNode;
  readonly size?: InputNumberSize;
  readonly status?: InputNumberStatus;
  readonly step?: InputNumberValue;
  readonly stringMode?: boolean;
  readonly style?: CSSProperties;
  readonly styles?:
    | InputNumberStyles
    | ((info: { readonly props: InputNumberProps<TValue> }) => InputNumberStyles);
  readonly suffix?: ReactNode;
  readonly value?: TValue | null;
  readonly variant?: InputNumberVariant;
}

interface DecimalParts {
  readonly fraction: string;
  readonly integer: string;
  readonly negative: boolean;
}

function ArrowIcon({ direction }: { readonly direction: "down" | "up" }) {
  return (
    <svg aria-hidden="true" className="launch-ui-input-number-icon" viewBox="0 0 12 12">
      <path d={direction === "up" ? "m3 7 3-3 3 3" : "m3 5 3 3 3-3"} />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-input-number-icon" viewBox="0 0 12 12">
      <path d="M2.5 6h7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-input-number-icon" viewBox="0 0 12 12">
      <path d="M6 2.5v7M2.5 6h7" />
    </svg>
  );
}

function decimalParts(value: string): DecimalParts | null {
  const match = value.trim().match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
  if (!match || (!match[2] && !match[3])) return null;
  return {
    fraction: match[3] ?? "",
    integer: match[2] || "0",
    negative: match[1] === "-",
  };
}

function canonicalDecimal(value: string) {
  const parts = decimalParts(value);
  if (!parts) return null;
  const integer = parts.integer.replace(/^0+(?=\d)/, "");
  const fraction = parts.fraction.replace(/0+$/, "");
  const zero = /^0+$/.test(integer) && fraction.length === 0;
  return `${parts.negative && !zero ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

function isIntermediateDecimal(value: string, decimalSeparator: string) {
  const normalized =
    decimalSeparator === "." ? value.trim() : value.replaceAll(decimalSeparator, ".").trim();
  return /^[+-]?\.?$/.test(normalized);
}

function decimalPlaces(value: InputNumberValue) {
  const text = String(value).toLowerCase();
  if (text.includes("e")) {
    const [coefficient = "", exponent = "0"] = text.split("e");
    return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
  }
  return text.split(".")[1]?.length ?? 0;
}

function toScaledInteger(value: string, scale: number) {
  const parts = decimalParts(value);
  if (!parts) return null;
  const digits = `${parts.integer}${parts.fraction.padEnd(scale, "0").slice(0, scale)}`;
  const integer = BigInt(digits || "0");
  return parts.negative ? -integer : integer;
}

function fromScaledInteger(value: bigint, scale: number, keepScale: boolean) {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const integer = scale ? digits.slice(0, -scale) : digits;
  const rawFraction = scale ? digits.slice(-scale) : "";
  const fraction = keepScale ? rawFraction : rawFraction.replace(/0+$/, "");
  return `${negative && value !== 0n ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

function addDecimal(value: string, step: string, direction: 1 | -1, keepScale: boolean) {
  const scale = Math.max(decimalPlaces(value), decimalPlaces(step));
  const left = toScaledInteger(value, scale);
  const right = toScaledInteger(step, scale);
  if (left === null || right === null) return value;
  return fromScaledInteger(left + right * BigInt(direction), scale, keepScale);
}

function compareDecimal(left: string, right: string) {
  const scale = Math.max(decimalPlaces(left), decimalPlaces(right));
  const leftInteger = toScaledInteger(left, scale);
  const rightInteger = toScaledInteger(right, scale);
  if (leftInteger === null || rightInteger === null) return 0;
  return leftInteger < rightInteger ? -1 : leftInteger > rightInteger ? 1 : 0;
}

function applyPrecision(value: string, precision: number, keepScale: boolean) {
  const parts = decimalParts(value);
  if (!parts) return value;
  if (parts.fraction.length <= precision) {
    const padded = keepScale ? parts.fraction.padEnd(precision, "0") : parts.fraction;
    return `${parts.negative ? "-" : ""}${parts.integer}${padded ? `.${padded}` : ""}`;
  }
  const scale = parts.fraction.length;
  const integer = toScaledInteger(value, scale);
  if (integer === null) return value;
  const divisor = 10n ** BigInt(scale - precision);
  const magnitude = integer < 0n ? -integer : integer;
  const rounded = (magnitude + divisor / 2n) / divisor;
  return fromScaledInteger(integer < 0n ? -rounded : rounded, precision, keepScale);
}

function sameValue(left: InputNumberValue | null, right: InputNumberValue | null) {
  if (left === null || right === null) return left === right;
  const leftCanonical = canonicalDecimal(String(left));
  const rightCanonical = canonicalDecimal(String(right));
  return leftCanonical !== null && leftCanonical === rightCanonical;
}

function formatDisplayValue<TValue extends InputNumberValue>(
  nextValue: TValue | null,
  userTyping: boolean,
  rawInput: string,
  formatter: InputNumberProps<TValue>["formatter"],
  decimalSeparator: string,
  precision: number | undefined,
  stringMode: boolean,
) {
  if (nextValue === null) return "";
  if (formatter) return formatter(nextValue, { input: rawInput, userTyping });
  let display = String(nextValue);
  if (!userTyping && precision !== undefined) {
    display = applyPrecision(display, precision, stringMode);
  }
  return decimalSeparator === "." ? display : display.replace(".", decimalSeparator);
}

function InputNumberRoot<TValue extends InputNumberValue = number>(
  inputNumberProps: InputNumberProps<TValue>,
  forwardedRef: ForwardedRef<InputNumberRef>,
) {
  const {
    changeOnBlur = true,
    changeOnWheel = false,
    className,
    classNames: classNamesProp,
    controls = true,
    decimalSeparator = ".",
    defaultValue,
    disabled = false,
    formatter,
    keyboard = true,
    max,
    min,
    mode = "input",
    onBlur,
    onChange,
    onFocus,
    onInput,
    onKeyDown,
    onPressEnter,
    onStep,
    onWheel,
    parser,
    precision,
    prefix,
    readOnly = false,
    size = "medium",
    status,
    step = 1,
    stringMode = false,
    style,
    styles: stylesProp,
    suffix,
    value,
    variant = "outlined",
    ...inputProps
  } = inputNumberProps;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalValue, setInternalValue] = useState<TValue | null>(defaultValue ?? null);
  const [focused, setFocused] = useState(false);
  const currentValue = value !== undefined ? value : internalValue;
  const stepPrecision = decimalPlaces(step);
  const resolvedPrecision = precision ?? (stepPrecision > 0 ? stepPrecision : undefined);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: inputNumberProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: inputNumberProps }) : (stylesProp ?? {});

  const parseDisplay = (displayValue: string) => {
    const parsed = parser
      ? String(parser(displayValue))
      : decimalSeparator === "."
        ? displayValue.trim()
        : displayValue.replaceAll(decimalSeparator, ".").trim();
    return canonicalDecimal(parsed);
  };

  const toValue = (decimal: string): TValue => {
    const precise =
      resolvedPrecision === undefined
        ? decimal
        : applyPrecision(decimal, resolvedPrecision, stringMode);
    return (stringMode ? precise : Number(precise)) as TValue;
  };

  const formatValue = (
    nextValue: TValue | null,
    userTyping: boolean,
    rawInput = nextValue === null ? "" : String(nextValue),
  ) =>
    formatDisplayValue(
      nextValue,
      userTyping,
      rawInput,
      formatter,
      decimalSeparator,
      resolvedPrecision,
      stringMode,
    );

  const [inputValue, setInputValue] = useState(() =>
    formatValue(value !== undefined ? value : (defaultValue ?? null), false),
  );

  useEffect(() => {
    if (value !== undefined && !focused) {
      setInputValue(
        formatDisplayValue(
          value,
          false,
          value === null ? "" : String(value),
          formatter,
          decimalSeparator,
          resolvedPrecision,
          stringMode,
        ),
      );
    }
  }, [decimalSeparator, focused, formatter, resolvedPrecision, stringMode, value]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      blur: () => inputRef.current?.blur(),
      focus: (options) => {
        const input = inputRef.current;
        if (!input) return;
        input.focus(
          options?.preventScroll === undefined
            ? undefined
            : { preventScroll: options.preventScroll },
        );
        if (!options?.cursor) return;
        const start = options.cursor === "start" ? 0 : input.value.length;
        input.setSelectionRange(options.cursor === "all" ? 0 : start, input.value.length);
      },
      get nativeElement() {
        return rootRef.current;
      },
    }),
    [],
  );

  const isOutOfRange = (candidate: InputNumberValue | null) => {
    if (candidate === null) return false;
    const decimal = canonicalDecimal(String(candidate));
    if (decimal === null) return false;
    return (
      (min !== undefined && compareDecimal(decimal, String(min)) < 0) ||
      (max !== undefined && compareDecimal(decimal, String(max)) > 0)
    );
  };

  const clamp = (decimal: string) => {
    if (min !== undefined && compareDecimal(decimal, String(min)) < 0) return String(min);
    if (max !== undefined && compareDecimal(decimal, String(max)) > 0) return String(max);
    return decimal;
  };

  const publish = (nextValue: TValue | null) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  const commit = () => {
    const parsed = parseDisplay(inputValue);
    if (parsed === null) {
      if (inputValue.trim() === "") {
        if (currentValue !== null) publish(null);
        setInputValue("");
      } else {
        setInputValue(formatValue(currentValue, false));
      }
      return;
    }
    const normalized = changeOnBlur ? clamp(parsed) : parsed;
    const nextValue = toValue(normalized);
    if (!sameValue(currentValue, nextValue)) publish(nextValue);
    setInputValue(formatValue(nextValue, false));
  };

  const stepValue = (direction: 1 | -1, emitter: InputNumberStepInfo["emitter"]) => {
    if (disabled || readOnly) return;
    const parsed = parseDisplay(inputValue) ?? canonicalDecimal(String(currentValue ?? min ?? 0));
    if (parsed === null) return;
    const stepped = stringMode
      ? addDecimal(parsed, String(step), direction, resolvedPrecision !== undefined)
      : String(Number(parsed) + Number(step) * direction);
    const normalized = clamp(
      resolvedPrecision === undefined
        ? stepped
        : applyPrecision(stepped, resolvedPrecision, stringMode),
    );
    const nextValue = toValue(normalized);
    publish(nextValue);
    setInputValue(formatValue(nextValue, false));
    onStep?.(nextValue, {
      emitter,
      offset: step,
      type: direction === 1 ? "up" : "down",
    });
    inputRef.current?.focus();
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.currentTarget.value;
    onInput?.(text);
    const parsed = parseDisplay(text);
    if (parsed === null) {
      if (text.trim() === "") {
        setInputValue("");
        publish(null);
      } else if (!parser && isIntermediateDecimal(text, decimalSeparator)) {
        setInputValue(text);
      }
      return;
    }
    const nextValue = toValue(parsed);
    setInputValue(formatValue(nextValue, true, text));
    publish(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter") {
      commit();
      onPressEnter?.(event);
      return;
    }
    if (!keyboard) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      stepValue(event.key === "ArrowUp" ? 1 : -1, "keyboard");
    }
  };

  const handleWheel = (event: WheelEvent<HTMLInputElement>) => {
    onWheel?.(event);
    if (!changeOnWheel || event.defaultPrevented || disabled || readOnly) return;
    event.preventDefault();
    stepValue(event.deltaY < 0 ? 1 : -1, "wheel");
  };

  const outOfRange = isOutOfRange(currentValue);
  const controlsConfig = typeof controls === "object" ? controls : undefined;
  const showControls = controls !== false && !disabled && !readOnly;
  const downDisabled =
    currentValue !== null &&
    min !== undefined &&
    compareDecimal(String(currentValue), String(min)) <= 0;
  const upDisabled =
    currentValue !== null &&
    max !== undefined &&
    compareDecimal(String(currentValue), String(max)) >= 0;

  const renderHandler = (direction: "down" | "up") => {
    const handlerDisabled = direction === "up" ? upDisabled : downDisabled;
    return (
      <button
        aria-label={direction === "up" ? "Increase value" : "Decrease value"}
        className={classes(
          "launch-ui-input-number-handler",
          `is-${direction}`,
          handlerDisabled && "is-disabled",
          resolvedClassNames.action,
          resolvedClassNames[direction],
        )}
        disabled={handlerDisabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepValue(direction === "up" ? 1 : -1, "handler")}
        style={{ ...resolvedStyles.action, ...resolvedStyles[direction] }}
        tabIndex={-1}
        type="button"
      >
        {direction === "up"
          ? (controlsConfig?.upIcon ??
            (mode === "spinner" ? <PlusIcon /> : <ArrowIcon direction="up" />))
          : (controlsConfig?.downIcon ??
            (mode === "spinner" ? <MinusIcon /> : <ArrowIcon direction="down" />))}
      </button>
    );
  };

  return (
    <div
      className={classes(
        "launch-ui-input-number",
        `is-${variant}`,
        `is-${size}`,
        `is-${mode}`,
        focused && "is-focused",
        disabled && "is-disabled",
        readOnly && "is-readonly",
        status && `is-${status}`,
        outOfRange && "is-out-of-range",
        !showControls && "is-without-controls",
        resolvedClassNames.root,
        className,
      )}
      ref={rootRef}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {mode === "spinner" && showControls ? renderHandler("down") : null}
      {prefix !== undefined ? (
        <span
          className={classes("launch-ui-input-number-prefix", resolvedClassNames.prefix)}
          style={resolvedStyles.prefix}
        >
          {prefix}
        </span>
      ) : null}
      <input
        {...inputProps}
        aria-invalid={status === "error" || outOfRange || inputProps["aria-invalid"]}
        aria-valuemax={max === undefined ? undefined : Number(max)}
        aria-valuemin={min === undefined ? undefined : Number(min)}
        aria-valuenow={currentValue === null ? undefined : Number(currentValue)}
        className={classes("launch-ui-input-number-input", resolvedClassNames.input)}
        disabled={disabled}
        inputMode="decimal"
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          commit();
          onBlur?.(event);
        }}
        onChange={handleInput}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        readOnly={readOnly}
        ref={inputRef}
        role="spinbutton"
        style={resolvedStyles.input}
        value={inputValue}
      />
      {suffix !== undefined ? (
        <span
          className={classes("launch-ui-input-number-suffix", resolvedClassNames.suffix)}
          style={resolvedStyles.suffix}
        >
          {suffix}
        </span>
      ) : null}
      {mode === "spinner" && showControls ? renderHandler("up") : null}
      {mode === "input" && showControls ? (
        <span
          className={classes("launch-ui-input-number-actions", resolvedClassNames.actions)}
          style={resolvedStyles.actions}
        >
          {renderHandler("up")}
          {renderHandler("down")}
        </span>
      ) : null}
    </div>
  );
}

type InputNumberComponent = <TValue extends InputNumberValue = number>(
  props: InputNumberProps<TValue> & RefAttributes<InputNumberRef>,
) => ReactElement | null;

export const InputNumber = forwardRef(InputNumberRoot) as InputNumberComponent;
