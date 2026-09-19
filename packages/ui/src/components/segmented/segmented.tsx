import {
  type CSSProperties,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { classes } from "../internal/classes.js";
import { Tooltip, type TooltipProps } from "../tooltip/index.js";

export type SegmentedValue = number | string;
export type SegmentedOrientation = "horizontal" | "vertical";
export type SegmentedShape = "default" | "round";
export type SegmentedSize = "large" | "medium" | "small";
export type SegmentedSemanticName = "icon" | "item" | "label" | "root";
export type SegmentedClassNames = Partial<Record<SegmentedSemanticName, string>>;
export type SegmentedStyles = Partial<Record<SegmentedSemanticName, CSSProperties>>;

export interface SegmentedTooltipConfig {
  readonly placement?: TooltipProps["placement"];
  readonly title: ReactNode;
}

export interface SegmentedOption<TValue extends SegmentedValue = SegmentedValue> {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly label?: ReactNode;
  readonly tooltip?: ReactNode | SegmentedTooltipConfig;
  readonly value: TValue;
}

export interface SegmentedProps<TValue extends SegmentedValue = SegmentedValue>
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  readonly block?: boolean;
  readonly classNames?:
    | SegmentedClassNames
    | ((info: { readonly props: SegmentedProps<TValue> }) => SegmentedClassNames);
  readonly defaultValue?: TValue;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly onChange?: (value: TValue) => void;
  readonly options?: ReadonlyArray<SegmentedOption<TValue> | TValue>;
  readonly orientation?: SegmentedOrientation;
  readonly shape?: SegmentedShape;
  readonly size?: SegmentedSize;
  readonly styles?:
    | SegmentedStyles
    | ((info: { readonly props: SegmentedProps<TValue> }) => SegmentedStyles);
  readonly value?: TValue;
  readonly vertical?: boolean;
}

interface IndicatorMeasurement {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

function isTooltipConfig(
  value: ReactNode | SegmentedTooltipConfig,
): value is SegmentedTooltipConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isValidElement(value) &&
    "title" in value
  );
}

function sameMeasurement(previous: IndicatorMeasurement | undefined, next: IndicatorMeasurement) {
  return (
    previous?.height === next.height &&
    previous.left === next.left &&
    previous.top === next.top &&
    previous.width === next.width
  );
}

function SegmentedInner<TValue extends SegmentedValue = SegmentedValue>(
  segmentedProps: SegmentedProps<TValue>,
) {
  const {
    block = false,
    className,
    classNames: classNamesProp,
    defaultValue,
    disabled = false,
    name,
    onChange,
    options = [],
    orientation,
    shape = "default",
    size = "medium",
    style,
    styles: stylesProp,
    value,
    vertical = false,
    ...rootProps
  } = segmentedProps;
  const generatedName = `launch-segmented-${useId().replace(/:/g, "")}`;
  const normalizedOptions = useMemo(
    () =>
      options.map<SegmentedOption<TValue>>((option) =>
        typeof option === "object" && option !== null
          ? option
          : { label: String(option), value: option },
      ),
    [options],
  );
  const [internalValue, setInternalValue] = useState<TValue | undefined>(
    defaultValue ?? normalizedOptions[0]?.value,
  );
  const [indicator, setIndicator] = useState<IndicatorMeasurement>();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLabelElement | null>>([]);
  const selectedValue = value ?? internalValue;
  const selectedIndex = normalizedOptions.findIndex((option) =>
    Object.is(option.value, selectedValue),
  );
  const resolvedOrientation = orientation ?? (vertical ? "vertical" : "horizontal");
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: segmentedProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: segmentedProps }) : (stylesProp ?? {});

  useLayoutEffect(() => {
    const root = rootRef.current;
    const selectedItem = itemRefs.current[selectedIndex];
    if (!root || !selectedItem) {
      setIndicator(undefined);
      return;
    }

    const update = () => {
      const next = {
        height: selectedItem.offsetHeight,
        left: selectedItem.offsetLeft,
        top: selectedItem.offsetTop,
        width: selectedItem.offsetWidth,
      };
      setIndicator((current) => (sameMeasurement(current, next) ? current : next));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(root);
    observer.observe(selectedItem);
    return () => observer.disconnect();
  });

  const select = (option: SegmentedOption<TValue>) => {
    if (disabled || option.disabled || Object.is(option.value, selectedValue)) return;
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
  };

  return (
    <div
      {...rootProps}
      className={classes(
        "launch-ui-segmented",
        `is-${resolvedOrientation}`,
        `is-${size}`,
        shape === "round" && "is-round",
        block && "is-block",
        disabled && "is-disabled",
        resolvedClassNames.root,
        className,
      )}
      ref={rootRef}
      role="radiogroup"
      style={{ ...resolvedStyles.root, ...style }}
    >
      <span
        aria-hidden="true"
        className={classes("launch-ui-segmented-indicator", indicator && "is-visible")}
        style={
          indicator === undefined
            ? undefined
            : {
                height: indicator.height,
                transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                width: indicator.width,
              }
        }
      />
      {normalizedOptions.map((option, index) => {
        const checked = Object.is(option.value, selectedValue);
        const optionDisabled = disabled || option.disabled === true;
        const item = (
          <label
            className={classes(
              "launch-ui-segmented-item",
              checked && "is-selected",
              optionDisabled && "is-disabled",
              resolvedClassNames.item,
              option.className,
            )}
            key={`${typeof option.value}-${String(option.value)}`}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            style={resolvedStyles.item}
          >
            <input
              aria-label={option.label === undefined ? String(option.value) : undefined}
              checked={checked}
              disabled={optionDisabled}
              name={name ?? generatedName}
              onChange={() => select(option)}
              type="radio"
              value={String(option.value)}
            />
            <div className="launch-ui-segmented-item-content">
              {option.icon !== undefined ? (
                <span
                  aria-hidden="true"
                  className={classes("launch-ui-segmented-icon", resolvedClassNames.icon)}
                  style={resolvedStyles.icon}
                >
                  {option.icon}
                </span>
              ) : null}
              {option.label !== undefined ? (
                <div
                  className={classes("launch-ui-segmented-label", resolvedClassNames.label)}
                  style={resolvedStyles.label}
                >
                  {option.label}
                </div>
              ) : null}
            </div>
          </label>
        );

        if (option.tooltip === undefined || option.tooltip === null) return item;
        const tooltip = isTooltipConfig(option.tooltip)
          ? option.tooltip
          : { title: option.tooltip };
        return (
          <Tooltip
            key={`${typeof option.value}-${String(option.value)}`}
            {...(tooltip.placement === undefined ? {} : { placement: tooltip.placement })}
            title={tooltip.title}
          >
            {item}
          </Tooltip>
        );
      })}
    </div>
  );
}

export const Segmented = SegmentedInner as <TValue extends SegmentedValue = SegmentedValue>(
  props: SegmentedProps<TValue>,
) => ReactElement;
