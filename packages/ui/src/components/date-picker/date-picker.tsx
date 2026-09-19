import {
  type CSSProperties,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { classes } from "../internal/classes.js";

export type DatePickerMode = "date" | "month" | "quarter" | "week" | "year";
export type DatePickerPlacement = "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
export type DatePickerSize = "large" | "medium" | "small";
export type DatePickerStatus = "error" | "warning";
export type DatePickerVariant = "borderless" | "filled" | "outlined" | "underlined";
export type DatePickerSemanticName =
  | "cell"
  | "clear"
  | "footer"
  | "input"
  | "panel"
  | "popup"
  | "prefix"
  | "root"
  | "suffix";
export type DatePickerClassNames = Partial<Record<DatePickerSemanticName, string>>;
export type DatePickerStyles = Partial<Record<DatePickerSemanticName, CSSProperties>>;
export type DatePickerFormat = string | ((value: Date) => string);

export interface DatePickerRef {
  readonly nativeElement: HTMLDivElement | null;
  blur: () => void;
  focus: () => void;
}

export interface DatePickerCellInfo {
  readonly originNode: ReactElement;
  readonly range?: "end" | "start";
  readonly today: Date;
  readonly type: DatePickerMode;
}

interface DatePickerSharedProps {
  readonly allowClear?: boolean | { readonly clearIcon?: ReactNode };
  readonly cellRender?: (current: Date, info: DatePickerCellInfo) => ReactNode;
  readonly className?: string;
  readonly classNames?:
    | DatePickerClassNames
    | ((info: { readonly props: DatePickerProps | RangePickerProps }) => DatePickerClassNames);
  readonly defaultOpen?: boolean;
  readonly disabledDate?: (
    current: Date,
    info: { readonly from?: Date; readonly type: DatePickerMode },
  ) => boolean;
  readonly format?: DatePickerFormat;
  readonly inputReadOnly?: boolean;
  readonly maxDate?: Date;
  readonly minDate?: Date;
  readonly needConfirm?: boolean;
  readonly onClear?: () => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly picker?: DatePickerMode;
  readonly placement?: DatePickerPlacement;
  readonly prefix?: ReactNode;
  readonly renderExtraFooter?: (mode: DatePickerMode) => ReactNode;
  readonly size?: DatePickerSize;
  readonly status?: DatePickerStatus;
  readonly style?: CSSProperties;
  readonly styles?:
    | DatePickerStyles
    | ((info: { readonly props: DatePickerProps | RangePickerProps }) => DatePickerStyles);
  readonly suffixIcon?: ReactNode;
  readonly variant?: DatePickerVariant;
}

export interface DatePickerPreset {
  readonly label: ReactNode;
  readonly value: Date | (() => Date);
}

export interface DatePickerProps extends DatePickerSharedProps {
  readonly defaultPickerValue?: Date;
  readonly defaultValue?: Date | ReadonlyArray<Date> | null;
  readonly disabled?: boolean;
  readonly multiple?: boolean;
  readonly onChange?: (
    value: Date | ReadonlyArray<Date> | null,
    dateString: string | ReadonlyArray<string> | null,
  ) => void;
  readonly onOk?: (value: Date | ReadonlyArray<Date> | null) => void;
  readonly onPanelChange?: (value: Date, mode: DatePickerMode) => void;
  readonly placeholder?: string;
  readonly presets?: ReadonlyArray<DatePickerPreset>;
  readonly value?: Date | ReadonlyArray<Date> | null;
}

export interface DateRangePreset {
  readonly label: ReactNode;
  readonly value: readonly [Date, Date] | (() => readonly [Date, Date]);
}

export interface RangePickerProps extends DatePickerSharedProps {
  readonly allowEmpty?: readonly [boolean, boolean];
  readonly defaultPickerValue?: readonly [Date, Date];
  readonly defaultValue?: readonly [Date | null, Date | null] | null;
  readonly disabled?: boolean | readonly [boolean, boolean];
  readonly id?: { readonly end?: string; readonly start?: string };
  readonly onCalendarChange?: (
    value: readonly [Date | null, Date | null],
    dateStrings: readonly [string, string],
    info: { readonly range: "end" | "start" },
  ) => void;
  readonly onChange?: (
    value: readonly [Date | null, Date | null] | null,
    dateStrings: readonly [string, string] | null,
  ) => void;
  readonly onOk?: (value: readonly [Date | null, Date | null] | null) => void;
  readonly placeholder?: readonly [string, string];
  readonly presets?: ReadonlyArray<DateRangePreset>;
  readonly separator?: ReactNode;
  readonly value?: readonly [Date | null, Date | null] | null;
}

interface CalendarPanelProps {
  readonly cellClassName?: string | undefined;
  readonly cellRender?: DatePickerSharedProps["cellRender"] | undefined;
  readonly cellStyle?: CSSProperties | undefined;
  readonly disabledDate?: DatePickerSharedProps["disabledDate"] | undefined;
  readonly maxDate?: Date | undefined;
  readonly minDate?: Date | undefined;
  readonly mode: DatePickerMode;
  readonly onNavigate: (value: Date) => void;
  readonly onPanelChange?: ((value: Date, mode: DatePickerMode) => void) | undefined;
  readonly onSelect: (value: Date) => void;
  readonly panelDate: Date;
  readonly range?: readonly [Date | null, Date | null] | null | undefined;
  readonly rangePart?: "end" | "start" | undefined;
  readonly selectedDates: ReadonlyArray<Date>;
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function addYears(value: Date, amount: number) {
  return new Date(value.getFullYear() + amount, value.getMonth(), 1);
}

function adjacentPanel(value: Date, mode: DatePickerMode, amount: number) {
  if (mode === "date" || mode === "week") return addMonths(value, amount);
  if (mode === "year") return addYears(value, amount * 12);
  return addYears(value, amount);
}

function sameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function isDateList(value: Date | ReadonlyArray<Date> | null): value is ReadonlyArray<Date> {
  return Array.isArray(value);
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoWeek(value: Date) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function defaultFormat(mode: DatePickerMode) {
  if (mode === "year") return "YYYY";
  if (mode === "month") return "YYYY-MM";
  if (mode === "quarter") return "YYYY-[Q]Q";
  if (mode === "week") return "YYYY-[W]WW";
  return "YYYY-MM-DD";
}

function formatDate(value: Date, format: DatePickerFormat | undefined, mode: DatePickerMode) {
  if (typeof format === "function") return format(value);
  const template = format ?? defaultFormat(mode);
  return template
    .replace(/\[([^\]]+)]/g, "$1")
    .replace(/YYYY/g, String(value.getFullYear()))
    .replace(/MM/g, pad(value.getMonth() + 1))
    .replace(/DD/g, pad(value.getDate()))
    .replace(/WW/g, pad(isoWeek(value)))
    .replace(/Q/g, String(Math.floor(value.getMonth() / 3) + 1));
}

function parseDate(value: string, mode: DatePickerMode) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  const year = numbers[0];
  if (year === undefined || year < 1000) return null;
  const month = mode === "year" ? 1 : (numbers[1] ?? 1);
  const day = mode === "date" || mode === "week" ? (numbers[2] ?? 1) : 1;
  const resolvedMonth = mode === "quarter" ? ((numbers[1] ?? 1) - 1) * 3 + 1 : month;
  const date = new Date(year, resolvedMonth - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== resolvedMonth - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isDateDisabled(
  value: Date,
  mode: DatePickerMode,
  minDate?: Date,
  maxDate?: Date,
  disabledDate?: DatePickerSharedProps["disabledDate"],
  from?: Date,
) {
  const time = startOfDay(value).getTime();
  if (minDate && time < startOfDay(minDate).getTime()) return true;
  if (maxDate && time > startOfDay(maxDate).getTime()) return true;
  return disabledDate?.(value, { ...(from === undefined ? {} : { from }), type: mode }) ?? false;
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 2.5v2M13 2.5v2M2.5 6h11M3.5 3.5h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />
    </svg>
  );
}

function calendarDays(panelDate: Date) {
  const first = startOfMonth(panelDate);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from(
    { length: 42 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

function renderCellContent(
  value: Date,
  content: ReactNode,
  props: CalendarPanelProps,
  className: string,
) {
  const originNode = <span className={className}>{content}</span>;
  return (
    props.cellRender?.(value, {
      originNode,
      ...(props.rangePart === undefined ? {} : { range: props.rangePart }),
      today: startOfDay(new Date()),
      type: props.mode,
    }) ?? originNode
  );
}

function CalendarPanel(props: CalendarPanelProps) {
  const {
    cellClassName,
    cellStyle,
    maxDate,
    minDate,
    mode,
    onNavigate,
    onPanelChange,
    onSelect,
    panelDate,
    range,
    selectedDates,
  } = props;
  const today = startOfDay(new Date());
  const title =
    mode === "year"
      ? `${Math.floor(panelDate.getFullYear() / 12) * 12} – ${Math.floor(panelDate.getFullYear() / 12) * 12 + 11}`
      : mode === "month" || mode === "quarter"
        ? String(panelDate.getFullYear())
        : `${monthNames[panelDate.getMonth()]} ${panelDate.getFullYear()}`;
  const navigationUnit = mode === "date" || mode === "week" ? "month" : "year";
  const navigate = (amount: number, superNavigation = false) => {
    const next =
      navigationUnit === "month"
        ? addMonths(panelDate, amount * (superNavigation ? 12 : 1))
        : addYears(panelDate, amount * (superNavigation ? 12 : 1));
    onNavigate(next);
    onPanelChange?.(next, mode);
  };
  const select = (value: Date) => {
    if (
      isDateDisabled(value, mode, minDate, maxDate, props.disabledDate, range?.[0] ?? undefined)
    ) {
      return;
    }
    onSelect(value);
  };

  const renderDateGrid = () => (
    <>
      <div className="launch-ui-date-picker-weekdays">
        {weekdayNames.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="launch-ui-date-picker-grid">
        {calendarDays(panelDate).map((date) => {
          const disabled = isDateDisabled(
            date,
            mode,
            minDate,
            maxDate,
            props.disabledDate,
            range?.[0] ?? undefined,
          );
          const selected = selectedDates.some((item) => sameDay(item, date));
          const outside = date.getMonth() !== panelDate.getMonth();
          const rangeStart = range?.[0] ? sameDay(range[0], date) : false;
          const rangeEnd = range?.[1] ? sameDay(range[1], date) : false;
          const inRange =
            range?.[0] && range[1]
              ? startOfDay(date).getTime() > startOfDay(range[0]).getTime() &&
                startOfDay(date).getTime() < startOfDay(range[1]).getTime()
              : false;
          const weekSelected =
            mode === "week" &&
            selectedDates.some(
              (item) =>
                isoWeek(item) === isoWeek(date) && item.getFullYear() === date.getFullYear(),
            );
          return (
            <button
              aria-label={formatDate(date, undefined, "date")}
              aria-pressed={selected || weekSelected}
              className={classes(
                "launch-ui-date-picker-cell",
                outside && "is-outside",
                disabled && "is-disabled",
                sameDay(today, date) && "is-today",
                (selected || weekSelected) && "is-selected",
                inRange && "is-in-range",
                rangeStart && "is-range-start",
                rangeEnd && "is-range-end",
                cellClassName,
              )}
              disabled={disabled}
              key={dateKey(date)}
              onClick={() => select(date)}
              style={cellStyle}
              type="button"
            >
              {renderCellContent(date, date.getDate(), props, "launch-ui-date-picker-cell-inner")}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderUnitGrid = () => {
    const yearBlockStart = Math.floor(panelDate.getFullYear() / 12) * 12;
    const units =
      mode === "year"
        ? Array.from({ length: 12 }, (_, index) => ({
            label: yearBlockStart + index,
            value: new Date(yearBlockStart + index, 0, 1),
          }))
        : mode === "quarter"
          ? Array.from({ length: 4 }, (_, index) => ({
              label: `Q${index + 1}`,
              value: new Date(panelDate.getFullYear(), index * 3, 1),
            }))
          : monthNames.map((label, index) => ({
              label,
              value: new Date(panelDate.getFullYear(), index, 1),
            }));
    return (
      <div className={classes("launch-ui-date-picker-unit-grid", `is-${mode}`)}>
        {units.map((unit) => {
          const selected = selectedDates.some((item) =>
            mode === "year"
              ? item.getFullYear() === unit.value.getFullYear()
              : mode === "quarter"
                ? item.getFullYear() === unit.value.getFullYear() &&
                  Math.floor(item.getMonth() / 3) === Math.floor(unit.value.getMonth() / 3)
                : item.getFullYear() === unit.value.getFullYear() &&
                  item.getMonth() === unit.value.getMonth(),
          );
          const disabled = isDateDisabled(
            unit.value,
            mode,
            minDate,
            maxDate,
            props.disabledDate,
            range?.[0] ?? undefined,
          );
          return (
            <button
              aria-pressed={selected}
              className={classes(
                "launch-ui-date-picker-unit",
                selected && "is-selected",
                disabled && "is-disabled",
                cellClassName,
              )}
              disabled={disabled}
              key={String(unit.label)}
              onClick={() => select(unit.value)}
              style={cellStyle}
              type="button"
            >
              {renderCellContent(unit.value, unit.label, props, "launch-ui-date-picker-unit-inner")}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="launch-ui-date-picker-calendar">
      <header className="launch-ui-date-picker-calendar-header">
        <span className="launch-ui-date-picker-header-actions">
          <button aria-label="Previous year" onClick={() => navigate(-1, true)} type="button">
            «
          </button>
          <button
            aria-label={`Previous ${navigationUnit}`}
            onClick={() => navigate(-1)}
            type="button"
          >
            ‹
          </button>
        </span>
        <strong>{title}</strong>
        <span className="launch-ui-date-picker-header-actions">
          <button aria-label={`Next ${navigationUnit}`} onClick={() => navigate(1)} type="button">
            ›
          </button>
          <button aria-label="Next year" onClick={() => navigate(1, true)} type="button">
            »
          </button>
        </span>
      </header>
      <div className="launch-ui-date-picker-calendar-body">
        {mode === "date" || mode === "week" ? renderDateGrid() : renderUnitGrid()}
      </div>
    </div>
  );
}

function usePickerPopup(
  controlledOpen: boolean | undefined,
  defaultOpen: boolean,
  disabled: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
  placement: DatePickerPlacement,
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled && nextOpen) return;
      if (controlledOpen === undefined) setInternalOpen(nextOpen);
      if (nextOpen !== open) onOpenChange?.(nextOpen);
    },
    [controlledOpen, disabled, onOpenChange, open],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const root = rootRef.current;
      const popup = popupRef.current;
      if (!root || !popup) return;
      const triggerRect = root.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const isTop = placement.startsWith("top");
      const isRight = placement.endsWith("Right");
      const top = isTop ? triggerRect.top - popupRect.height - 6 : triggerRect.bottom + 6;
      const idealLeft = isRight ? triggerRect.right - popupRect.width : triggerRect.left;
      setPopupStyle({
        left: Math.max(8, Math.min(idealLeft, window.innerWidth - popupRect.width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - popupRect.height - 8)),
      });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  return { open, popupRef, popupStyle, rootRef, setOpen };
}

function resolveCustomizations(
  props: DatePickerProps | RangePickerProps,
  classNamesProp: DatePickerSharedProps["classNames"],
  stylesProp: DatePickerSharedProps["styles"],
) {
  return {
    classNames:
      typeof classNamesProp === "function" ? classNamesProp({ props }) : (classNamesProp ?? {}),
    styles: typeof stylesProp === "function" ? stylesProp({ props }) : (stylesProp ?? {}),
  };
}

const DatePickerRoot = forwardRef<DatePickerRef, DatePickerProps>(
  function DatePicker(datePickerProps, forwardedRef) {
    const {
      allowClear = true,
      cellRender,
      className,
      classNames: classNamesProp,
      defaultOpen = false,
      defaultPickerValue,
      defaultValue = null,
      disabled = false,
      disabledDate,
      format,
      inputReadOnly = false,
      maxDate,
      minDate,
      multiple = false,
      needConfirm = false,
      onChange,
      onClear,
      onOk,
      onOpenChange,
      onPanelChange,
      open: controlledOpen,
      picker = "date",
      placement = "bottomLeft",
      placeholder = "Select date",
      prefix,
      presets = [],
      renderExtraFooter,
      size = "medium",
      status,
      style,
      styles: stylesProp,
      suffixIcon,
      value: controlledValue,
      variant = "outlined",
    } = datePickerProps;
    const [internalValue, setInternalValue] = useState<Date | ReadonlyArray<Date> | null>(
      defaultValue,
    );
    const value = controlledValue === undefined ? internalValue : controlledValue;
    const values: ReadonlyArray<Date> = isDateList(value)
      ? value
      : value instanceof Date
        ? [value]
        : [];
    const firstValue = values[0];
    const [panelDate, setPanelDate] = useState(() =>
      startOfMonth(defaultPickerValue ?? values[0] ?? new Date()),
    );
    const [pendingValue, setPendingValue] = useState<Date | null>(null);
    const [inputValue, setInputValue] = useState(() =>
      values.length === 1 ? formatDate(values[0] as Date, format, picker) : "",
    );
    const inputRef = useRef<HTMLInputElement | null>(null);
    const popup = usePickerPopup(controlledOpen, defaultOpen, disabled, onOpenChange, placement);
    const { classNames: resolvedClassNames, styles: resolvedStyles } = resolveCustomizations(
      datePickerProps,
      classNamesProp,
      stylesProp,
    );
    const visibleValues = needConfirm && pendingValue ? [pendingValue] : values;
    const displayText = multiple
      ? values.map((item) => formatDate(item, format, picker)).join(", ")
      : inputValue;

    useEffect(() => {
      if (!multiple) setInputValue(firstValue ? formatDate(firstValue, format, picker) : "");
    }, [firstValue, format, multiple, picker]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        get nativeElement() {
          return popup.rootRef.current;
        },
      }),
      [popup.rootRef],
    );

    const commitValue = (nextValue: Date | ReadonlyArray<Date> | null) => {
      if (controlledValue === undefined) setInternalValue(nextValue);
      onChange?.(
        nextValue,
        isDateList(nextValue)
          ? nextValue.map((item) => formatDate(item, format, picker))
          : nextValue
            ? formatDate(nextValue, format, picker)
            : null,
      );
    };

    const selectDate = (selected: Date) => {
      if (multiple) {
        const exists = values.some((item) => sameDay(item, selected));
        const nextValues = exists
          ? values.filter((item) => !sameDay(item, selected))
          : [...values, selected].sort((left, right) => left.getTime() - right.getTime());
        commitValue(nextValues);
        return;
      }
      if (needConfirm) {
        setPendingValue(selected);
        setInputValue(formatDate(selected, format, picker));
        return;
      }
      commitValue(selected);
      setInputValue(formatDate(selected, format, picker));
      popup.setOpen(false);
    };

    const clear = () => {
      setPendingValue(null);
      setInputValue("");
      commitValue(multiple ? [] : null);
      onClear?.();
      inputRef.current?.focus();
    };

    const parseInput = () => {
      if (multiple || inputReadOnly || inputValue.length === 0) return;
      const parsed = parseDate(inputValue, picker);
      if (parsed && !isDateDisabled(parsed, picker, minDate, maxDate, disabledDate)) {
        commitValue(parsed);
        setInputValue(formatDate(parsed, format, picker));
        setPanelDate(startOfMonth(parsed));
      } else if (!parsed) {
        setInputValue(values[0] ? formatDate(values[0], format, picker) : "");
      }
    };

    const popupNode = popup.open ? (
      <div
        className={classes(
          "launch-ui-date-picker-popup",
          `is-${placement}`,
          presets.length > 0 && "has-presets",
          resolvedClassNames.popup,
        )}
        ref={popup.popupRef}
        role="dialog"
        style={{ ...popup.popupStyle, ...resolvedStyles.popup }}
      >
        {presets.length > 0 ? (
          <aside className="launch-ui-date-picker-presets">
            {presets.map((preset) => (
              <button
                key={typeof preset.label === "string" ? preset.label : String(preset.value)}
                onClick={() =>
                  selectDate(typeof preset.value === "function" ? preset.value() : preset.value)
                }
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </aside>
        ) : null}
        <div className="launch-ui-date-picker-popup-main">
          <div
            className={classes("launch-ui-date-picker-panel", resolvedClassNames.panel)}
            style={resolvedStyles.panel}
          >
            <CalendarPanel
              cellClassName={resolvedClassNames.cell}
              cellRender={cellRender}
              cellStyle={resolvedStyles.cell}
              disabledDate={disabledDate}
              maxDate={maxDate}
              minDate={minDate}
              mode={picker}
              onNavigate={setPanelDate}
              onPanelChange={onPanelChange}
              onSelect={selectDate}
              panelDate={panelDate}
              selectedDates={visibleValues}
            />
          </div>
          {renderExtraFooter || needConfirm || multiple || picker === "date" ? (
            <footer
              className={classes("launch-ui-date-picker-footer", resolvedClassNames.footer)}
              style={resolvedStyles.footer}
            >
              <span>
                {picker === "date" ? (
                  <button onClick={() => selectDate(startOfDay(new Date()))} type="button">
                    Today
                  </button>
                ) : null}
                {renderExtraFooter?.(picker)}
              </span>
              {needConfirm || multiple ? (
                <button
                  className="launch-ui-date-picker-ok"
                  disabled={needConfirm && pendingValue === null}
                  onClick={() => {
                    const confirmed = needConfirm ? pendingValue : value;
                    if (needConfirm && pendingValue) commitValue(pendingValue);
                    onOk?.(confirmed);
                    setPendingValue(null);
                    popup.setOpen(false);
                  }}
                  type="button"
                >
                  OK
                </button>
              ) : null}
            </footer>
          ) : null}
        </div>
      </div>
    ) : null;

    return (
      <div
        className={classes(
          "launch-ui-date-picker",
          `is-${size}`,
          `is-${variant}`,
          status && `is-${status}`,
          disabled && "is-disabled",
          multiple && "is-multiple",
          popup.open && "is-open",
          resolvedClassNames.root,
          className,
        )}
        ref={popup.rootRef}
        style={{ ...resolvedStyles.root, ...style }}
      >
        {prefix !== undefined ? (
          <span
            className={classes("launch-ui-date-picker-prefix", resolvedClassNames.prefix)}
            style={resolvedStyles.prefix}
          >
            {prefix}
          </span>
        ) : null}
        <input
          aria-haspopup="dialog"
          aria-expanded={popup.open}
          aria-invalid={status === "error" || undefined}
          className={classes("launch-ui-date-picker-input", resolvedClassNames.input)}
          disabled={disabled}
          onBlur={parseInput}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => popup.setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              parseInput();
              popup.setOpen(true);
            }
          }}
          placeholder={placeholder}
          readOnly={inputReadOnly || multiple}
          ref={inputRef}
          role="combobox"
          style={resolvedStyles.input}
          value={displayText}
        />
        {allowClear && values.length > 0 && !disabled ? (
          <button
            aria-label="Clear date"
            className={classes("launch-ui-date-picker-clear", resolvedClassNames.clear)}
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            style={resolvedStyles.clear}
            type="button"
          >
            {typeof allowClear === "object" && allowClear.clearIcon !== undefined ? (
              allowClear.clearIcon
            ) : (
              <CloseIcon />
            )}
          </button>
        ) : null}
        <span
          className={classes("launch-ui-date-picker-suffix", resolvedClassNames.suffix)}
          style={resolvedStyles.suffix}
        >
          {suffixIcon ?? <CalendarIcon />}
        </span>
        {typeof document !== "undefined" && popupNode
          ? createPortal(popupNode, document.body)
          : null}
      </div>
    );
  },
);

const RangePicker = forwardRef<DatePickerRef, RangePickerProps>(
  function RangePicker(rangePickerProps, forwardedRef) {
    const {
      allowClear = true,
      cellRender,
      className,
      classNames: classNamesProp,
      defaultOpen = false,
      defaultPickerValue,
      defaultValue = null,
      disabled = false,
      disabledDate,
      format,
      id,
      inputReadOnly = false,
      maxDate,
      minDate,
      needConfirm = false,
      onCalendarChange,
      onChange,
      onClear,
      onOk,
      onOpenChange,
      open: controlledOpen,
      picker = "date",
      placement = "bottomLeft",
      placeholder = ["Start date", "End date"],
      prefix,
      presets = [],
      renderExtraFooter,
      separator = <ArrowIcon />,
      size = "medium",
      status,
      style,
      styles: stylesProp,
      suffixIcon,
      value: controlledValue,
      variant = "outlined",
    } = rangePickerProps;
    const fullyDisabled = disabled === true;
    const disabledParts = Array.isArray(disabled) ? disabled : [fullyDisabled, fullyDisabled];
    const [internalValue, setInternalValue] = useState<readonly [Date | null, Date | null] | null>(
      defaultValue,
    );
    const value = controlledValue === undefined ? internalValue : controlledValue;
    const range = value ?? [null, null];
    const startValue = range[0];
    const endValue = range[1];
    const [draftRange, setDraftRange] = useState<readonly [Date | null, Date | null]>(range);
    const [activePart, setActivePart] = useState<"end" | "start">("start");
    const initialPanel = defaultPickerValue?.[0] ?? range[0] ?? new Date();
    const [panelDate, setPanelDate] = useState(startOfMonth(initialPanel));
    const [startInput, setStartInput] = useState(
      range[0] ? formatDate(range[0], format, picker) : "",
    );
    const [endInput, setEndInput] = useState(range[1] ? formatDate(range[1], format, picker) : "");
    const startInputRef = useRef<HTMLInputElement | null>(null);
    const endInputRef = useRef<HTMLInputElement | null>(null);
    const popup = usePickerPopup(
      controlledOpen,
      defaultOpen,
      fullyDisabled,
      onOpenChange,
      placement,
    );
    const { classNames: resolvedClassNames, styles: resolvedStyles } = resolveCustomizations(
      rangePickerProps,
      classNamesProp,
      stylesProp,
    );

    useEffect(() => {
      setStartInput(startValue ? formatDate(startValue, format, picker) : "");
      setEndInput(endValue ? formatDate(endValue, format, picker) : "");
      if (!popup.open) setDraftRange([startValue, endValue]);
    }, [endValue, format, picker, popup.open, startValue]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => {
          startInputRef.current?.blur();
          endInputRef.current?.blur();
        },
        focus: () => startInputRef.current?.focus(),
        get nativeElement() {
          return popup.rootRef.current;
        },
      }),
      [popup.rootRef],
    );

    const emitRange = (nextRange: readonly [Date | null, Date | null] | null) => {
      if (controlledValue === undefined) setInternalValue(nextRange);
      onChange?.(
        nextRange,
        nextRange
          ? [
              nextRange[0] ? formatDate(nextRange[0], format, picker) : "",
              nextRange[1] ? formatDate(nextRange[1], format, picker) : "",
            ]
          : null,
      );
    };

    const selectRangeDate = (selected: Date) => {
      if (activePart === "start" || !draftRange[0] || draftRange[1]) {
        const next: readonly [Date, null] = [selected, null];
        setDraftRange(next);
        setStartInput(formatDate(selected, format, picker));
        setEndInput("");
        setActivePart("end");
        onCalendarChange?.(next, [formatDate(selected, format, picker), ""], { range: "start" });
        endInputRef.current?.focus();
        return;
      }
      const ordered: readonly [Date, Date] =
        selected.getTime() < draftRange[0].getTime()
          ? [selected, draftRange[0]]
          : [draftRange[0], selected];
      setDraftRange(ordered);
      setStartInput(formatDate(ordered[0], format, picker));
      setEndInput(formatDate(ordered[1], format, picker));
      setActivePart("start");
      onCalendarChange?.(
        ordered,
        [formatDate(ordered[0], format, picker), formatDate(ordered[1], format, picker)],
        { range: "end" },
      );
      if (!needConfirm) {
        emitRange(ordered);
        popup.setOpen(false);
      }
    };

    const parseRangeInput = (part: "end" | "start") => {
      if (inputReadOnly) return;
      const text = part === "start" ? startInput : endInput;
      if (!text) return;
      const parsed = parseDate(text, picker);
      if (
        !parsed ||
        isDateDisabled(parsed, picker, minDate, maxDate, disabledDate, draftRange[0] ?? undefined)
      )
        return;
      const next: readonly [Date | null, Date | null] =
        part === "start" ? [parsed, draftRange[1]] : [draftRange[0], parsed];
      setDraftRange(next);
      if (next[0] && next[1]) emitRange(next[0] <= next[1] ? next : [next[1], next[0]]);
    };

    const clear = () => {
      setDraftRange([null, null]);
      setStartInput("");
      setEndInput("");
      emitRange(null);
      onClear?.();
    };

    const popupNode = popup.open ? (
      <div
        className={classes(
          "launch-ui-date-picker-popup",
          "is-range",
          `is-${placement}`,
          presets.length > 0 && "has-presets",
          resolvedClassNames.popup,
        )}
        ref={popup.popupRef}
        role="dialog"
        style={{ ...popup.popupStyle, ...resolvedStyles.popup }}
      >
        {presets.length > 0 ? (
          <aside className="launch-ui-date-picker-presets">
            {presets.map((preset) => (
              <button
                key={typeof preset.label === "string" ? preset.label : String(preset.value)}
                onClick={() => {
                  const presetValue =
                    typeof preset.value === "function" ? preset.value() : preset.value;
                  setDraftRange(presetValue);
                  emitRange(presetValue);
                  popup.setOpen(false);
                }}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </aside>
        ) : null}
        <div className="launch-ui-date-picker-popup-main">
          <div
            className={classes("launch-ui-date-picker-panel", "is-range", resolvedClassNames.panel)}
            style={resolvedStyles.panel}
          >
            <CalendarPanel
              cellClassName={resolvedClassNames.cell}
              cellRender={cellRender}
              cellStyle={resolvedStyles.cell}
              disabledDate={disabledDate}
              maxDate={maxDate}
              minDate={minDate}
              mode={picker}
              onNavigate={setPanelDate}
              onSelect={selectRangeDate}
              panelDate={panelDate}
              range={draftRange}
              rangePart={activePart}
              selectedDates={draftRange.filter((item): item is Date => item instanceof Date)}
            />
            <CalendarPanel
              cellClassName={resolvedClassNames.cell}
              cellRender={cellRender}
              cellStyle={resolvedStyles.cell}
              disabledDate={disabledDate}
              maxDate={maxDate}
              minDate={minDate}
              mode={picker}
              onNavigate={(next) => setPanelDate(adjacentPanel(next, picker, -1))}
              onSelect={selectRangeDate}
              panelDate={adjacentPanel(panelDate, picker, 1)}
              range={draftRange}
              rangePart={activePart}
              selectedDates={draftRange.filter((item): item is Date => item instanceof Date)}
            />
          </div>
          {renderExtraFooter || needConfirm ? (
            <footer
              className={classes("launch-ui-date-picker-footer", resolvedClassNames.footer)}
              style={resolvedStyles.footer}
            >
              <span>{renderExtraFooter?.(picker)}</span>
              {needConfirm ? (
                <button
                  className="launch-ui-date-picker-ok"
                  disabled={!draftRange[0] || !draftRange[1]}
                  onClick={() => {
                    emitRange(draftRange);
                    onOk?.(draftRange);
                    popup.setOpen(false);
                  }}
                  type="button"
                >
                  OK
                </button>
              ) : null}
            </footer>
          ) : null}
        </div>
      </div>
    ) : null;

    return (
      <div
        className={classes(
          "launch-ui-date-picker",
          "is-range",
          `is-${size}`,
          `is-${variant}`,
          status && `is-${status}`,
          fullyDisabled && "is-disabled",
          popup.open && "is-open",
          resolvedClassNames.root,
          className,
        )}
        ref={popup.rootRef}
        style={{ ...resolvedStyles.root, ...style }}
      >
        {prefix !== undefined ? (
          <span
            className={classes("launch-ui-date-picker-prefix", resolvedClassNames.prefix)}
            style={resolvedStyles.prefix}
          >
            {prefix}
          </span>
        ) : null}
        <input
          aria-haspopup="dialog"
          aria-expanded={popup.open}
          aria-invalid={status === "error" || undefined}
          className={classes("launch-ui-date-picker-input", resolvedClassNames.input)}
          disabled={disabledParts[0]}
          id={id?.start}
          onBlur={() => parseRangeInput("start")}
          onChange={(event) => setStartInput(event.target.value)}
          onFocus={() => {
            setActivePart("start");
            popup.setOpen(true);
          }}
          placeholder={placeholder[0]}
          readOnly={inputReadOnly}
          ref={startInputRef}
          role="combobox"
          style={resolvedStyles.input}
          value={startInput}
        />
        <span className="launch-ui-date-picker-separator">{separator}</span>
        <input
          aria-haspopup="dialog"
          aria-expanded={popup.open}
          aria-invalid={status === "error" || undefined}
          className={classes("launch-ui-date-picker-input", resolvedClassNames.input)}
          disabled={disabledParts[1]}
          id={id?.end}
          onBlur={() => parseRangeInput("end")}
          onChange={(event) => setEndInput(event.target.value)}
          onFocus={() => {
            setActivePart("end");
            popup.setOpen(true);
          }}
          placeholder={placeholder[1]}
          readOnly={inputReadOnly}
          ref={endInputRef}
          role="combobox"
          style={resolvedStyles.input}
          value={endInput}
        />
        {allowClear && (range[0] || range[1]) && !fullyDisabled ? (
          <button
            aria-label="Clear date range"
            className={classes("launch-ui-date-picker-clear", resolvedClassNames.clear)}
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            style={resolvedStyles.clear}
            type="button"
          >
            {typeof allowClear === "object" && allowClear.clearIcon !== undefined ? (
              allowClear.clearIcon
            ) : (
              <CloseIcon />
            )}
          </button>
        ) : null}
        <span
          className={classes("launch-ui-date-picker-suffix", resolvedClassNames.suffix)}
          style={resolvedStyles.suffix}
        >
          {suffixIcon ?? <CalendarIcon />}
        </span>
        {typeof document !== "undefined" && popupNode
          ? createPortal(popupNode, document.body)
          : null}
      </div>
    );
  },
);

interface DatePickerComponent
  extends ForwardRefExoticComponent<DatePickerProps & RefAttributes<DatePickerRef>> {
  readonly RangePicker: typeof RangePicker;
}

export const DatePicker = Object.assign(DatePickerRoot, { RangePicker }) as DatePickerComponent;
