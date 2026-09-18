import {
  type ChangeEventHandler,
  type CSSProperties,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  type RefCallback,
  useContext,
  useState,
} from "react";
import { classes } from "../internal/classes.js";

export type CheckboxValue = boolean | number | string;
export type CheckboxSemanticName = "icon" | "input" | "label" | "root";
export type CheckboxClassNames = Partial<Record<CheckboxSemanticName, string>>;
export type CheckboxStyles = Partial<Record<CheckboxSemanticName, CSSProperties>>;

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "children" | "className" | "onChange" | "style" | "type" | "value"
  > {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly classNames?:
    | CheckboxClassNames
    | ((info: { readonly props: CheckboxProps }) => CheckboxClassNames);
  readonly indeterminate?: boolean;
  readonly onChange?: ChangeEventHandler<HTMLInputElement>;
  readonly style?: CSSProperties;
  readonly styles?: CheckboxStyles | ((info: { readonly props: CheckboxProps }) => CheckboxStyles);
  readonly value?: CheckboxValue;
}

export interface CheckboxOption<T extends CheckboxValue = CheckboxValue> {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly style?: CSSProperties;
  readonly title?: string;
  readonly value: T;
}

export interface CheckboxGroupProps<T extends CheckboxValue = CheckboxValue>
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  readonly defaultValue?: ReadonlyArray<T>;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly onChange?: (checkedValues: T[]) => void;
  readonly options?: ReadonlyArray<CheckboxOption<T> | T>;
  readonly value?: ReadonlyArray<T>;
}

interface CheckboxGroupContextValue {
  readonly disabled: boolean;
  readonly isSelected: (value: CheckboxValue) => boolean;
  readonly name?: string;
  readonly toggle: (value: CheckboxValue, checked: boolean) => void;
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

function includesValue(values: ReadonlyArray<CheckboxValue>, value: CheckboxValue) {
  return values.some((item) => Object.is(item, value));
}

const CheckboxRoot = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(checkboxProps, forwardedRef) {
    const {
      checked,
      children,
      className,
      classNames: classNamesProp,
      defaultChecked,
      disabled = false,
      indeterminate = false,
      name,
      onChange,
      style,
      styles: stylesProp,
      title,
      value,
      ...inputProps
    } = checkboxProps;
    const group = useContext(CheckboxGroupContext);
    const grouped = group !== null && value !== undefined;
    const resolvedChecked = grouped ? group.isSelected(value) : checked;
    const resolvedDisabled = disabled || (group?.disabled ?? false);
    const resolvedName = name ?? group?.name;
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: checkboxProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: checkboxProps }) : (stylesProp ?? {});

    const setInputRef: RefCallback<HTMLInputElement> = (node) => {
      if (node) {
        node.indeterminate = indeterminate;
      }
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
      if (grouped) {
        group.toggle(value, event.target.checked);
      }
      onChange?.(event);
    };

    return (
      <label
        className={classes(
          "launch-ui-checkbox",
          resolvedChecked && "is-checked",
          indeterminate && "is-indeterminate",
          resolvedDisabled && "is-disabled",
          resolvedClassNames.root,
          className,
        )}
        style={{ ...resolvedStyles.root, ...style }}
        title={title}
      >
        <input
          {...inputProps}
          aria-checked={indeterminate ? "mixed" : resolvedChecked}
          checked={resolvedChecked}
          className={classes("launch-ui-checkbox-input", resolvedClassNames.input)}
          defaultChecked={grouped || resolvedChecked !== undefined ? undefined : defaultChecked}
          disabled={resolvedDisabled}
          name={resolvedName}
          onChange={handleChange}
          ref={setInputRef}
          style={resolvedStyles.input}
          type="checkbox"
          value={value === undefined ? undefined : String(value)}
        />
        <span
          aria-hidden="true"
          className={classes("launch-ui-checkbox-icon", resolvedClassNames.icon)}
          style={resolvedStyles.icon}
        />
        {children !== undefined ? (
          <span
            className={classes("launch-ui-checkbox-label", resolvedClassNames.label)}
            style={resolvedStyles.label}
          >
            {children}
          </span>
        ) : null}
      </label>
    );
  },
);

function CheckboxGroup<T extends CheckboxValue = CheckboxValue>({
  children,
  className,
  defaultValue = [],
  disabled = false,
  name,
  onChange,
  options = [],
  value,
  ...props
}: CheckboxGroupProps<T>) {
  const [internalValue, setInternalValue] = useState<ReadonlyArray<T>>(defaultValue);
  const selectedValues = value ?? internalValue;
  const toggle = (itemValue: CheckboxValue, itemChecked: boolean) => {
    const typedValue = itemValue as T;
    const nextValues = itemChecked
      ? includesValue(selectedValues, typedValue)
        ? [...selectedValues]
        : [...selectedValues, typedValue]
      : selectedValues.filter((item) => !Object.is(item, typedValue));

    if (value === undefined) {
      setInternalValue(nextValues);
    }
    onChange?.(nextValues);
  };
  const contextValue: CheckboxGroupContextValue = {
    disabled,
    isSelected: (itemValue) => includesValue(selectedValues, itemValue),
    ...(name === undefined ? {} : { name }),
    toggle,
  };

  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <div {...props} className={classes("launch-ui-checkbox-group", className)}>
        {options.map((option) => {
          const resolvedOption: CheckboxOption<T> =
            typeof option === "object" && option !== null
              ? option
              : { label: String(option), value: option };
          return (
            <Checkbox
              {...(resolvedOption.className === undefined
                ? {}
                : { className: resolvedOption.className })}
              {...(resolvedOption.disabled === undefined
                ? {}
                : { disabled: resolvedOption.disabled })}
              key={String(resolvedOption.value)}
              {...(resolvedOption.style === undefined ? {} : { style: resolvedOption.style })}
              {...(resolvedOption.title === undefined ? {} : { title: resolvedOption.title })}
              value={resolvedOption.value}
            >
              {resolvedOption.label}
            </Checkbox>
          );
        })}
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

interface CheckboxComponent
  extends ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLInputElement>> {
  readonly Group: typeof CheckboxGroup;
}

export const Checkbox = Object.assign(CheckboxRoot, {
  Group: CheckboxGroup,
}) as CheckboxComponent;
