import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type TagVariant = "filled" | "outlined" | "solid";
export type TagPresetColor =
  | "blue"
  | "cyan"
  | "default"
  | "error"
  | "geekblue"
  | "gold"
  | "green"
  | "lime"
  | "magenta"
  | "neutral"
  | "orange"
  | "processing"
  | "purple"
  | "red"
  | "success"
  | "volcano"
  | "warning";
export type TagColor = TagPresetColor | (string & {});
export type TagSemanticName = "closeIcon" | "content" | "icon" | "root";
export type TagClassNames = Partial<Record<TagSemanticName, string>>;
export type TagStyles = Partial<Record<TagSemanticName, CSSProperties>>;
export type TagValue = number | string;

export interface TagClosableConfig {
  readonly "aria-label"?: string;
  readonly closeIcon?: ReactNode;
}

export interface TagProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  readonly classNames?: TagClassNames | ((info: { readonly props: TagProps }) => TagClassNames);
  readonly closable?: boolean | TagClosableConfig;
  readonly closeIcon?: ReactNode | boolean;
  readonly color?: TagColor;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly icon?: ReactNode;
  readonly onClose?: (event: MouseEvent<HTMLElement>) => void;
  readonly rel?: string;
  readonly styles?: TagStyles | ((info: { readonly props: TagProps }) => TagStyles);
  readonly target?: string;
  readonly variant?: TagVariant;
}

export interface TagCheckableProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "style"> {
  readonly checked: boolean;
  readonly classNames?:
    | TagClassNames
    | ((info: { readonly props: TagCheckableProps }) => TagClassNames);
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly onChange?: (checked: boolean) => void;
  readonly style?: CSSProperties;
  readonly styles?: TagStyles | ((info: { readonly props: TagCheckableProps }) => TagStyles);
}

export interface TagCheckableOption<TValue extends TagValue = TagValue> {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly label: ReactNode;
  readonly style?: CSSProperties;
  readonly value: TValue;
}

export type TagGroupSemanticName = "item" | "root";
export type TagGroupClassNames = Partial<Record<TagGroupSemanticName, string>>;
export type TagGroupStyles = Partial<Record<TagGroupSemanticName, CSSProperties>>;

interface TagCheckableGroupBaseProps<TValue extends TagValue>
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  readonly classNames?:
    | TagGroupClassNames
    | ((info: { readonly props: TagCheckableGroupProps<TValue> }) => TagGroupClassNames);
  readonly disabled?: boolean;
  readonly options?: ReadonlyArray<TagCheckableOption<TValue> | TValue>;
  readonly styles?:
    | TagGroupStyles
    | ((info: { readonly props: TagCheckableGroupProps<TValue> }) => TagGroupStyles);
}

interface TagCheckableSingleGroupProps<TValue extends TagValue>
  extends TagCheckableGroupBaseProps<TValue> {
  readonly defaultValue?: TValue | null;
  readonly multiple?: false;
  readonly onChange?: (value: TValue | null) => void;
  readonly value?: TValue | null;
}

interface TagCheckableMultipleGroupProps<TValue extends TagValue>
  extends TagCheckableGroupBaseProps<TValue> {
  readonly defaultValue?: ReadonlyArray<TValue>;
  readonly multiple: true;
  readonly onChange?: (value: TValue[]) => void;
  readonly value?: ReadonlyArray<TValue>;
}

export type TagCheckableGroupProps<TValue extends TagValue = TagValue> =
  | TagCheckableMultipleGroupProps<TValue>
  | TagCheckableSingleGroupProps<TValue>;

const presetColors = new Set<TagPresetColor>([
  "blue",
  "cyan",
  "default",
  "error",
  "geekblue",
  "gold",
  "green",
  "lime",
  "magenta",
  "neutral",
  "orange",
  "processing",
  "purple",
  "red",
  "success",
  "volcano",
  "warning",
]);

function isPresetColor(color: TagColor): color is TagPresetColor {
  return presetColors.has(color as TagPresetColor);
}

function resolveSemanticProps<TProps>(
  props: TProps,
  classNamesProp: TagClassNames | ((info: { readonly props: TProps }) => TagClassNames) | undefined,
  stylesProp: TagStyles | ((info: { readonly props: TProps }) => TagStyles) | undefined,
) {
  const resolvedClassNames =
    typeof classNamesProp === "function" ? classNamesProp({ props }) : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props }) : (stylesProp ?? {});
  return { resolvedClassNames, resolvedStyles };
}

function renderTagContent(
  children: ReactNode,
  icon: ReactNode,
  classNames: TagClassNames,
  styles: TagStyles,
) {
  return (
    <>
      {icon !== undefined ? (
        <span className={classes("launch-ui-tag-icon", classNames.icon)} style={styles.icon}>
          {icon}
        </span>
      ) : null}
      <span className={classes("launch-ui-tag-content", classNames.content)} style={styles.content}>
        {children}
      </span>
    </>
  );
}

const TagRoot = forwardRef<HTMLElement, TagProps>(function Tag(tagProps, ref) {
  const {
    children,
    className,
    classNames: classNamesProp,
    closable = false,
    closeIcon,
    color = "default",
    disabled = false,
    href,
    icon,
    onClick,
    onClose,
    onKeyDown,
    rel,
    style,
    styles: stylesProp,
    target,
    variant = "filled",
    ...rootProps
  } = tagProps;
  const [visible, setVisible] = useState(true);
  const { resolvedClassNames, resolvedStyles } = resolveSemanticProps(
    tagProps,
    classNamesProp,
    stylesProp,
  );
  const closableConfig = typeof closable === "object" ? closable : undefined;
  const resolvedCloseIcon = closableConfig?.closeIcon ?? closeIcon;
  const canClose =
    resolvedCloseIcon !== false &&
    resolvedCloseIcon !== null &&
    (closable === true || closableConfig !== undefined || resolvedCloseIcon !== undefined);
  const customColor = !isPresetColor(color);
  const customColorStyle = customColor
    ? ({ "--launch-ui-tag-color": color } as CSSProperties)
    : undefined;
  const rootClassName = classes(
    "launch-ui-tag",
    `is-${variant}`,
    customColor ? "is-custom-color" : `is-${color}`,
    href !== undefined && "is-link",
    disabled && "is-disabled",
    resolvedClassNames.root,
    className,
  );
  const rootStyle = { ...customColorStyle, ...resolvedStyles.root, ...style };

  if (!visible) return null;

  const close = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onClose?.(event);
    if (!event.defaultPrevented) setVisible(false);
  };
  const content = (
    <>
      {renderTagContent(children, icon, resolvedClassNames, resolvedStyles)}
      {canClose ? (
        <button
          aria-label={closableConfig?.["aria-label"] ?? "Close tag"}
          className={classes("launch-ui-tag-close", resolvedClassNames.closeIcon)}
          disabled={disabled}
          onClick={close}
          style={resolvedStyles.closeIcon}
          type="button"
        >
          {resolvedCloseIcon === undefined || resolvedCloseIcon === true ? (
            <CloseIcon />
          ) : (
            resolvedCloseIcon
          )}
        </button>
      ) : null}
    </>
  );
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.currentTarget.click();
  };

  if (href !== undefined) {
    return (
      <a
        {...rootProps}
        aria-disabled={disabled || undefined}
        className={rootClassName}
        href={disabled ? undefined : href}
        onClick={handleClick}
        onKeyDown={onKeyDown}
        ref={ref as Ref<HTMLAnchorElement>}
        rel={rel}
        style={rootStyle}
        tabIndex={disabled ? -1 : rootProps.tabIndex}
        target={target}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      {...rootProps}
      aria-disabled={disabled || undefined}
      className={rootClassName}
      {...(onClick === undefined
        ? {}
        : {
            onClick: handleClick,
            onKeyDown: handleKeyDown,
            role: "button",
            tabIndex: disabled ? -1 : 0,
          })}
      ref={ref as Ref<HTMLSpanElement>}
      style={rootStyle}
    >
      {content}
    </span>
  );
});

const TagCheckable = forwardRef<HTMLButtonElement, TagCheckableProps>(
  function CheckableTag(checkableProps, ref) {
    const {
      checked,
      children,
      className,
      classNames: classNamesProp,
      disabled = false,
      icon,
      onChange,
      onClick,
      style,
      styles: stylesProp,
      type = "button",
      ...buttonProps
    } = checkableProps;
    const { resolvedClassNames, resolvedStyles } = resolveSemanticProps(
      checkableProps,
      classNamesProp,
      stylesProp,
    );
    return (
      <button
        {...buttonProps}
        aria-pressed={checked}
        className={classes(
          "launch-ui-tag",
          "is-checkable",
          checked && "is-checked",
          disabled && "is-disabled",
          resolvedClassNames.root,
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onChange?.(!checked);
        }}
        ref={ref}
        style={{ ...resolvedStyles.root, ...style }}
        type={type}
      >
        {renderTagContent(children, icon, resolvedClassNames, resolvedStyles)}
      </button>
    );
  },
);

function normalizeOption<TValue extends TagValue>(
  option: TagCheckableOption<TValue> | TValue,
): TagCheckableOption<TValue> {
  return typeof option === "object" ? option : { label: String(option), value: option };
}

function includesValue<TValue extends TagValue>(values: ReadonlyArray<TValue>, value: TValue) {
  return values.some((item) => Object.is(item, value));
}

function TagCheckableGroup<TValue extends TagValue = TagValue>(
  groupProps: TagCheckableGroupProps<TValue>,
) {
  const {
    className,
    classNames: classNamesProp,
    defaultValue,
    disabled = false,
    multiple = false,
    onChange,
    options = [],
    style,
    styles: stylesProp,
    value,
    ...rootProps
  } = groupProps;
  const [internalValue, setInternalValue] = useState<TValue | ReadonlyArray<TValue> | null>(
    defaultValue ?? (multiple ? [] : null),
  );
  const selectedValue = value === undefined ? internalValue : value;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: groupProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: groupProps }) : (stylesProp ?? {});

  const select = (optionValue: TValue, checked: boolean) => {
    if (multiple) {
      const current = Array.isArray(selectedValue) ? selectedValue : [];
      const next = checked
        ? [...current.filter((item) => !Object.is(item, optionValue)), optionValue]
        : current.filter((item) => !Object.is(item, optionValue));
      if (value === undefined) setInternalValue(next);
      (onChange as ((nextValue: TValue[]) => void) | undefined)?.(next);
      return;
    }
    const next = checked ? optionValue : null;
    if (value === undefined) setInternalValue(next);
    (onChange as ((nextValue: TValue | null) => void) | undefined)?.(next);
  };

  return (
    <div
      {...rootProps}
      className={classes("launch-ui-tag-group", resolvedClassNames.root, className)}
      role={rootProps.role ?? "group"}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {options.map((rawOption) => {
        const option = normalizeOption(rawOption);
        const checked = Array.isArray(selectedValue)
          ? includesValue(selectedValue, option.value)
          : Object.is(selectedValue, option.value);
        return (
          <TagCheckable
            checked={checked}
            className={classes(resolvedClassNames.item, option.className)}
            disabled={disabled || option.disabled === true}
            {...(option.icon === undefined ? {} : { icon: option.icon })}
            key={option.value}
            onChange={(nextChecked) => select(option.value, nextChecked)}
            style={{ ...resolvedStyles.item, ...option.style }}
          >
            {option.label}
          </TagCheckable>
        );
      })}
    </div>
  );
}

type TagComponent = typeof TagRoot & {
  readonly CheckableTag: typeof TagCheckable;
  readonly CheckableTagGroup: typeof TagCheckableGroup;
};

export const Tag = Object.assign(TagRoot, {
  CheckableTag: TagCheckable,
  CheckableTagGroup: TagCheckableGroup,
}) as TagComponent;
