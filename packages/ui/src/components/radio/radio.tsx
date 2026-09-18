import {
  type ChangeEvent,
  type CSSProperties,
  createContext,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useId,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type RadioValue = boolean | number | string;
export type RadioSize = "large" | "medium" | "small";
export type RadioButtonStyle = "outline" | "solid";
export type RadioOptionType = "button" | "default";
export type RadioOrientation = "horizontal" | "vertical";
export type RadioSemanticName = "icon" | "input" | "label" | "root";
export type RadioClassNames = Partial<Record<RadioSemanticName, string>>;
export type RadioStyles = Partial<Record<RadioSemanticName, CSSProperties>>;
export type RadioGroupSemanticName = "root";
export type RadioGroupClassNames = Partial<Record<RadioGroupSemanticName, string>>;
export type RadioGroupStyles = Partial<Record<RadioGroupSemanticName, CSSProperties>>;

export interface RadioChangeEvent<T extends RadioValue = RadioValue> {
  readonly currentTarget: { readonly checked: boolean; readonly value: T };
  readonly nativeEvent: ChangeEvent<HTMLInputElement>;
  preventDefault(): void;
  stopPropagation(): void;
  readonly target: { readonly checked: boolean; readonly value: T };
}

export interface RadioProps<T extends RadioValue = RadioValue>
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "children" | "className" | "onChange" | "style" | "type" | "value"
  > {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly classNames?:
    | RadioClassNames
    | ((info: { readonly props: RadioProps<T> }) => RadioClassNames);
  readonly onChange?: (event: RadioChangeEvent<T>) => void;
  readonly style?: CSSProperties;
  readonly styles?: RadioStyles | ((info: { readonly props: RadioProps<T> }) => RadioStyles);
  readonly value?: T;
}

export interface RadioOption<T extends RadioValue = RadioValue> {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly label: ReactNode;
  readonly onChange?: (event: RadioChangeEvent<T>) => void;
  readonly required?: boolean;
  readonly style?: CSSProperties;
  readonly title?: string;
  readonly value: T;
}

export interface RadioGroupProps<T extends RadioValue = RadioValue>
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  readonly block?: boolean;
  readonly buttonStyle?: RadioButtonStyle;
  readonly classNames?:
    | RadioGroupClassNames
    | ((info: { readonly props: RadioGroupProps<T> }) => RadioGroupClassNames);
  readonly defaultValue?: T;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly onChange?: (event: RadioChangeEvent<T>) => void;
  readonly options?: ReadonlyArray<RadioOption<T> | T>;
  readonly optionType?: RadioOptionType;
  readonly orientation?: RadioOrientation;
  readonly size?: RadioSize;
  readonly styles?:
    | RadioGroupStyles
    | ((info: { readonly props: RadioGroupProps<T> }) => RadioGroupStyles);
  readonly value?: T;
  readonly vertical?: boolean;
}

interface RadioGroupContextValue {
  readonly buttonStyle: RadioButtonStyle;
  readonly disabled: boolean;
  readonly name: string;
  readonly selectedValue: RadioValue | undefined;
  readonly select: (value: RadioValue, event: RadioChangeEvent) => void;
  readonly size: RadioSize;
}

interface RadioInternalProps<T extends RadioValue = RadioValue> extends RadioProps<T> {
  readonly button?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function createRadioEvent<T extends RadioValue>(
  nativeEvent: ChangeEvent<HTMLInputElement>,
  value: T,
): RadioChangeEvent<T> {
  const target = { checked: nativeEvent.currentTarget.checked, value };
  return {
    currentTarget: target,
    nativeEvent,
    preventDefault: () => nativeEvent.preventDefault(),
    stopPropagation: () => nativeEvent.stopPropagation(),
    target,
  };
}

function RadioRootInner<T extends RadioValue = RadioValue>(
  radioProps: RadioInternalProps<T>,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const {
    button = false,
    checked,
    children,
    className,
    classNames: classNamesProp,
    defaultChecked,
    disabled = false,
    name,
    onChange,
    style,
    styles: stylesProp,
    title,
    value,
    ...inputProps
  } = radioProps;
  const group = useContext(RadioGroupContext);
  const grouped = group !== null && value !== undefined;
  const resolvedChecked = grouped ? Object.is(group.selectedValue, value) : checked;
  const resolvedDisabled = disabled || (group?.disabled ?? false);
  const resolvedName = name ?? group?.name;
  const semanticProps = {
    ...radioProps,
    ...(resolvedChecked === undefined ? {} : { checked: resolvedChecked }),
    disabled: resolvedDisabled,
  };
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: semanticProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: semanticProps }) : (stylesProp ?? {});

  const handleChange = (nativeEvent: ChangeEvent<HTMLInputElement>) => {
    if (!nativeEvent.currentTarget.checked) return;
    const resolvedValue = (value ?? nativeEvent.currentTarget.value) as T;
    const event = createRadioEvent(nativeEvent, resolvedValue);
    if (grouped) group.select(resolvedValue, event as RadioChangeEvent);
    onChange?.(event);
  };

  return (
    <label
      className={classes(
        "launch-ui-radio",
        button && "is-button",
        button && group?.buttonStyle === "solid" && "is-solid",
        button && group?.size && `is-${group.size}`,
        resolvedChecked && "is-checked",
        resolvedDisabled && "is-disabled",
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
      title={title}
    >
      <input
        {...inputProps}
        checked={resolvedChecked}
        className={classes("launch-ui-radio-input", resolvedClassNames.input)}
        defaultChecked={grouped || resolvedChecked !== undefined ? undefined : defaultChecked}
        disabled={resolvedDisabled}
        name={resolvedName}
        onChange={handleChange}
        ref={forwardedRef}
        style={resolvedStyles.input}
        type="radio"
        value={value === undefined ? undefined : String(value)}
      />
      {!button ? (
        <span
          aria-hidden="true"
          className={classes("launch-ui-radio-icon", resolvedClassNames.icon)}
          style={resolvedStyles.icon}
        />
      ) : null}
      {children !== undefined ? (
        <span
          className={classes("launch-ui-radio-label", resolvedClassNames.label)}
          style={resolvedStyles.label}
        >
          {children}
        </span>
      ) : null}
    </label>
  );
}

type RadioRootComponent = <T extends RadioValue = RadioValue>(
  props: RadioProps<T> & RefAttributes<HTMLInputElement>,
) => ReactElement | null;

type RadioButtonComponent = <T extends RadioValue = RadioValue>(
  props: RadioProps<T> & RefAttributes<HTMLInputElement>,
) => ReactElement | null;

type RadioInternalComponent = <T extends RadioValue = RadioValue>(
  props: RadioInternalProps<T> & RefAttributes<HTMLInputElement>,
) => ReactElement | null;

const RadioInternal = forwardRef(RadioRootInner) as RadioInternalComponent;
const RadioRoot = RadioInternal as RadioRootComponent;

const RadioButton = forwardRef(function RadioButton<T extends RadioValue = RadioValue>(
  props: RadioProps<T>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return <RadioInternal {...props} button ref={ref} />;
}) as RadioButtonComponent;

function RadioGroup<T extends RadioValue = RadioValue>(groupProps: RadioGroupProps<T>) {
  const {
    block = false,
    buttonStyle = "outline",
    children,
    className,
    classNames: classNamesProp,
    defaultValue,
    disabled = false,
    name,
    onChange,
    options = [],
    optionType = "default",
    orientation,
    size = "medium",
    style,
    styles: stylesProp,
    value,
    vertical = false,
    ...rootProps
  } = groupProps;
  const generatedName = `launch-radio-${useId().replace(/:/g, "")}`;
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue);
  const selectedValue = value ?? internalValue;
  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");
  const resolvedName = name ?? generatedName;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: groupProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: groupProps }) : (stylesProp ?? {});
  const select = (nextValue: RadioValue, event: RadioChangeEvent) => {
    if (value === undefined) setInternalValue(nextValue as T);
    onChange?.(event as RadioChangeEvent<T>);
  };
  const contextValue: RadioGroupContextValue = {
    buttonStyle,
    disabled,
    name: resolvedName,
    selectedValue,
    select,
    size,
  };
  const OptionComponent = optionType === "button" ? RadioButton : RadioRoot;

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        {...rootProps}
        className={classes(
          "launch-ui-radio-group",
          `is-${resolvedOrientation}`,
          optionType === "button" && "is-button-group",
          buttonStyle === "solid" && "is-solid",
          block && "is-block",
          resolvedClassNames.root,
          className,
        )}
        role="radiogroup"
        style={{ ...resolvedStyles.root, ...style }}
      >
        {options.map((option) => {
          const resolvedOption: RadioOption<T> =
            typeof option === "object" && option !== null
              ? option
              : { label: String(option), value: option };
          return (
            <OptionComponent
              {...(resolvedOption.className === undefined
                ? {}
                : { className: resolvedOption.className })}
              {...(resolvedOption.disabled === undefined
                ? {}
                : { disabled: resolvedOption.disabled })}
              {...(resolvedOption.id === undefined ? {} : { id: resolvedOption.id })}
              key={String(resolvedOption.value)}
              {...(resolvedOption.onChange === undefined
                ? {}
                : { onChange: resolvedOption.onChange })}
              {...(resolvedOption.required === undefined
                ? {}
                : { required: resolvedOption.required })}
              {...(resolvedOption.style === undefined ? {} : { style: resolvedOption.style })}
              {...(resolvedOption.title === undefined ? {} : { title: resolvedOption.title })}
              value={resolvedOption.value}
            >
              {resolvedOption.label}
            </OptionComponent>
          );
        })}
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioComponent extends RadioRootComponent {
  readonly Button: RadioButtonComponent;
  readonly Group: typeof RadioGroup;
}

export const Radio = Object.assign(RadioRoot, {
  Button: RadioButton,
  Group: RadioGroup,
}) as RadioComponent;
