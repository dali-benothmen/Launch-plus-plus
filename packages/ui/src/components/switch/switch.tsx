import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { LoadingIcon } from "../internal/icons.js";

export type SwitchSize = "medium" | "small";
export type SwitchSemanticName = "indicator" | "root";
export type SwitchClassNames = Partial<Record<SwitchSemanticName, string>>;
export type SwitchStyles = Partial<Record<SwitchSemanticName, CSSProperties>>;
export type SwitchEvent = MouseEvent<HTMLButtonElement>;

export interface SwitchRef {
  readonly nativeElement: HTMLButtonElement | null;
  blur: () => void;
  focus: () => void;
}

export interface SwitchProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "defaultValue" | "onChange" | "onClick" | "size" | "value"
  > {
  readonly ariaLabel?: string;
  readonly checked?: boolean;
  readonly checkedChildren?: ReactNode;
  readonly classNames?:
    | SwitchClassNames
    | ((info: { readonly props: SwitchProps }) => SwitchClassNames);
  readonly defaultChecked?: boolean;
  readonly defaultValue?: boolean;
  readonly loading?: boolean;
  readonly onChange?: (checked: boolean, event: SwitchEvent) => void;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly onClick?: (checked: boolean, event: SwitchEvent) => void;
  readonly size?: SwitchSize;
  readonly styles?: SwitchStyles | ((info: { readonly props: SwitchProps }) => SwitchStyles);
  readonly unCheckedChildren?: ReactNode;
  readonly value?: boolean;
}

export const Switch = forwardRef<SwitchRef, SwitchProps>(
  function Switch(switchProps, forwardedRef) {
    const {
      "aria-label": ariaLabelAttribute,
      ariaLabel,
      checked: checkedProp,
      checkedChildren,
      className,
      classNames: classNamesProp,
      defaultChecked,
      defaultValue,
      disabled = false,
      loading = false,
      onChange,
      onCheckedChange,
      onClick,
      size = "medium",
      style,
      styles: stylesProp,
      type = "button",
      unCheckedChildren,
      value: valueProp,
      ...buttonProps
    } = switchProps;
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [internalChecked, setInternalChecked] = useState(defaultChecked ?? defaultValue ?? false);
    const controlledChecked = checkedProp ?? valueProp;
    const checked = controlledChecked ?? internalChecked;
    const inactive = disabled || loading;
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: switchProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: switchProps }) : (stylesProp ?? {});

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => buttonRef.current?.blur(),
        focus: () => buttonRef.current?.focus(),
        get nativeElement() {
          return buttonRef.current;
        },
      }),
      [],
    );

    const handleClick = (event: SwitchEvent) => {
      if (inactive) return;
      const nextChecked = !checked;
      onClick?.(nextChecked, event);
      if (event.defaultPrevented) return;
      if (controlledChecked === undefined) setInternalChecked(nextChecked);
      onChange?.(nextChecked, event);
      onCheckedChange?.(nextChecked);
    };

    return (
      <button
        {...buttonProps}
        aria-busy={loading || undefined}
        aria-checked={checked}
        aria-label={ariaLabel ?? ariaLabelAttribute}
        className={classes(
          "launch-ui-switch",
          `is-${size}`,
          checked && "is-checked",
          loading && "is-loading",
          resolvedClassNames.root,
          className,
        )}
        data-state={checked ? "checked" : "unchecked"}
        disabled={inactive}
        onClick={handleClick}
        ref={buttonRef}
        role="switch"
        style={{ ...resolvedStyles.root, ...style }}
        type={type}
      >
        <span className="launch-ui-switch-inner" aria-hidden="true">
          {checked ? checkedChildren : unCheckedChildren}
        </span>
        <span
          className={classes("launch-ui-switch-indicator", resolvedClassNames.indicator)}
          style={resolvedStyles.indicator}
        >
          {loading ? <LoadingIcon /> : null}
        </span>
      </button>
    );
  },
);
