import {
  type CSSProperties,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type UIEvent,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { classes } from "../internal/classes.js";
import { CheckIcon, ChevronDownIcon, CloseIcon, LoadingIcon } from "../internal/icons.js";

export type SelectValue = string | number;
export type SelectMode = "multiple" | "tags";
export type SelectPlacement = "bottomLeft" | "bottomRight" | "topLeft" | "topRight";
export type SelectSize = "large" | "medium" | "small";
export type SelectStatus = "error" | "warning";
export type SelectVariant = "borderless" | "filled" | "outlined" | "underlined";
export type SelectChangeValue = SelectValue | ReadonlyArray<SelectValue> | undefined;

export interface SelectOption {
  readonly [key: string]: unknown;
  readonly disabled?: boolean;
  readonly label: ReactNode;
  readonly value: SelectValue;
}

export interface SelectOptionGroup {
  readonly label: ReactNode;
  readonly options: ReadonlyArray<SelectOption>;
}

export type SelectOptionEntry = SelectOption | SelectOptionGroup;

export interface SelectSearchConfig {
  readonly filterOption?: boolean | ((inputValue: string, option: SelectOption) => boolean);
  readonly filterSort?: (
    first: SelectOption,
    second: SelectOption,
    info: { readonly searchValue: string },
  ) => number;
  readonly onSearch?: (value: string) => void;
  readonly optionFilterProp?: string | ReadonlyArray<string>;
}

export interface SelectClearConfig {
  readonly clearIcon?: ReactNode;
}

export type SelectSemanticName =
  | "clear"
  | "group"
  | "groupLabel"
  | "input"
  | "item"
  | "list"
  | "popup"
  | "root"
  | "selector"
  | "suffix"
  | "tag";
export type SelectClassNames = Partial<Record<SelectSemanticName, string>>;
export type SelectStyles = Partial<Record<SelectSemanticName, CSSProperties>>;

export interface SelectLabelInfo {
  readonly label?: ReactNode;
  readonly value: SelectValue;
}

export interface SelectTagRenderInfo extends SelectLabelInfo {
  readonly closable: boolean;
  readonly onClose: () => void;
}

export interface SelectRef {
  readonly nativeElement: HTMLDivElement | null;
  blur: () => void;
  focus: () => void;
}

export interface SelectProps {
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
  readonly allowClear?: boolean | SelectClearConfig;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly classNames?:
    | SelectClassNames
    | ((info: { readonly props: SelectProps }) => SelectClassNames);
  readonly defaultOpen?: boolean;
  readonly defaultValue?: SelectChangeValue;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly labelRender?: (info: SelectLabelInfo) => ReactNode;
  readonly loading?: boolean;
  readonly maxTagCount?: number | "responsive";
  readonly menuItemSelectedIcon?: ReactNode;
  readonly mode?: SelectMode;
  readonly notFoundContent?: ReactNode;
  readonly onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onChange?: (
    value: SelectChangeValue,
    option?: SelectOption | ReadonlyArray<SelectOption>,
  ) => void;
  readonly onClear?: () => void;
  readonly onDeselect?: (value: SelectValue, option: SelectOption) => void;
  readonly onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onPopupScroll?: (event: UIEvent<HTMLDivElement>) => void;
  readonly onSelect?: (value: SelectValue, option: SelectOption) => void;
  readonly onValueChange?: (value: SelectChangeValue) => void;
  readonly open?: boolean;
  readonly optionRender?: (option: SelectOption, info: { readonly index: number }) => ReactNode;
  readonly options: ReadonlyArray<SelectOptionEntry>;
  readonly placement?: SelectPlacement;
  readonly placeholder?: ReactNode;
  readonly popupMatchSelectWidth?: boolean | number;
  readonly popupRender?: (menu: ReactElement) => ReactNode;
  readonly showSearch?: boolean | SelectSearchConfig;
  readonly size?: SelectSize;
  readonly status?: SelectStatus;
  readonly style?: CSSProperties;
  readonly styles?: SelectStyles | ((info: { readonly props: SelectProps }) => SelectStyles);
  readonly tagRender?: (info: SelectTagRenderInfo) => ReactNode;
  readonly tokenSeparators?: ReadonlyArray<string>;
  readonly value?: SelectChangeValue;
  readonly variant?: SelectVariant;
}

interface VisibleOption {
  readonly id: string;
  readonly index: number;
  readonly option: SelectOption;
}

interface VisibleGroup {
  readonly key: string;
  readonly label?: ReactNode;
  readonly options: ReadonlyArray<VisibleOption>;
}

function isGroup(entry: SelectOptionEntry): entry is SelectOptionGroup {
  return "options" in entry;
}

function valuesEqual(first: SelectValue, second: SelectValue) {
  return first === second;
}

function textContent(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textContent).join(" ");
  if (value && typeof value === "object" && "props" in value) {
    return textContent(
      (value as { readonly props?: { readonly children?: unknown } }).props?.children,
    );
  }
  return "";
}

function asValues(value: SelectChangeValue): ReadonlyArray<SelectValue> {
  if (value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value as SelectValue];
}

function defaultFilter(
  searchValue: string,
  option: SelectOption,
  optionFilterProp: string | ReadonlyArray<string>,
) {
  const fields = Array.isArray(optionFilterProp) ? optionFilterProp : [optionFilterProp];
  const query = searchValue.toLocaleLowerCase();
  return fields.some((field) => textContent(option[field]).toLocaleLowerCase().includes(query));
}

function escapedSeparatorExpression(separators: ReadonlyArray<string>) {
  return new RegExp(
    `[${separators.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}]`,
  );
}

export const Select = forwardRef<SelectRef, SelectProps>(
  function Select(selectProps, forwardedRef) {
    const {
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      allowClear = false,
      ariaLabel = "Select",
      className,
      classNames: classNamesProp,
      defaultOpen = false,
      defaultValue,
      disabled = false,
      id,
      labelRender,
      loading = false,
      maxTagCount,
      menuItemSelectedIcon,
      mode,
      notFoundContent = "Not found",
      onBlur,
      onChange,
      onClear,
      onDeselect,
      onFocus,
      onOpenChange,
      onPopupScroll,
      onSelect,
      onValueChange,
      open: controlledOpen,
      optionRender,
      options,
      placement = "bottomLeft",
      placeholder = "Please select",
      popupMatchSelectWidth = true,
      popupRender,
      showSearch = false,
      size = "medium",
      status,
      style,
      styles: stylesProp,
      tagRender,
      tokenSeparators = [],
      value: controlledValue,
      variant = "outlined",
    } = selectProps;
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const selectorRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const [internalValue, setInternalValue] = useState<SelectChangeValue>(
      defaultValue ?? (mode === undefined ? undefined : []),
    );
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const [searchValue, setSearchValue] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [popupPosition, setPopupPosition] = useState<CSSProperties>({ visibility: "hidden" });
    const multiple = mode !== undefined;
    const searchable = showSearch !== false || multiple;
    const value = controlledValue ?? internalValue;
    const selectedValues = asValues(value);
    const open = controlledOpen ?? internalOpen;
    const searchConfig = typeof showSearch === "object" ? showSearch : undefined;
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: selectProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: selectProps }) : (stylesProp ?? {});

    const flatOptions = useMemo(
      () => options.flatMap((entry) => (isGroup(entry) ? entry.options : [entry])),
      [options],
    );
    const optionFor = useCallback(
      (selectedValue: SelectValue) =>
        flatOptions.find((option) => valuesEqual(option.value, selectedValue)),
      [flatOptions],
    );
    const selectedOptions = useMemo(
      () =>
        selectedValues.map(
          (selectedValue) => optionFor(selectedValue) ?? { label: undefined, value: selectedValue },
        ),
      [optionFor, selectedValues],
    );

    const visibleGroups = useMemo<ReadonlyArray<VisibleGroup>>(() => {
      let nextIndex = 0;
      const filterOption = searchConfig?.filterOption ?? true;
      const optionFilterProp = searchConfig?.optionFilterProp ?? "label";
      const matches = (option: SelectOption) => {
        if (!searchable || searchValue.length === 0 || filterOption === false) return true;
        if (typeof filterOption === "function") return filterOption(searchValue, option);
        return defaultFilter(searchValue, option, optionFilterProp);
      };

      return options.flatMap((entry, entryIndex) => {
        const source = isGroup(entry) ? entry.options : [entry];
        const filtered = source.filter(matches);
        const sorted = searchConfig?.filterSort
          ? [...filtered].sort(
              (first, second) => searchConfig.filterSort?.(first, second, { searchValue }) ?? 0,
            )
          : filtered;
        const groupOptions = sorted.map((option, optionIndex) => ({
          id: `${listboxId}-option-${entryIndex}-${optionIndex}`,
          index: nextIndex++,
          option,
        }));
        if (groupOptions.length === 0) return [];
        return [
          {
            key: `${entryIndex}`,
            label: isGroup(entry) ? entry.label : undefined,
            options: groupOptions,
          },
        ];
      });
    }, [listboxId, options, searchConfig, searchValue, searchable]);
    const visibleOptions = useMemo(
      () => visibleGroups.flatMap((group) => group.options),
      [visibleGroups],
    );
    const activeOption = visibleOptions.find((entry) => entry.index === activeIndex);
    const firstEnabledIndex = visibleOptions.find((entry) => !entry.option.disabled)?.index ?? -1;
    const popupVisible = open && !disabled;

    const updateOpen = useCallback(
      (nextOpen: boolean) => {
        if (disabled) return;
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        if (nextOpen !== open) onOpenChange?.(nextOpen);
        if (!nextOpen) {
          setSearchValue("");
          setActiveIndex(-1);
        }
      },
      [controlledOpen, disabled, onOpenChange, open],
    );

    const commitValue = useCallback(
      (nextValue: SelectChangeValue, nextOptions?: SelectOption | ReadonlyArray<SelectOption>) => {
        if (controlledValue === undefined) setInternalValue(nextValue);
        onChange?.(nextValue, nextOptions);
        onValueChange?.(nextValue);
      },
      [controlledValue, onChange, onValueChange],
    );

    const removeValue = useCallback(
      (removedValue: SelectValue) => {
        const option = optionFor(removedValue) ?? {
          label: String(removedValue),
          value: removedValue,
        };
        const nextValues = selectedValues.filter((entry) => !valuesEqual(entry, removedValue));
        commitValue(
          nextValues,
          nextValues.map((entry) => optionFor(entry) ?? { label: String(entry), value: entry }),
        );
        onDeselect?.(removedValue, option);
      },
      [commitValue, onDeselect, optionFor, selectedValues],
    );

    const selectOption = useCallback(
      (option: SelectOption) => {
        if (option.disabled) return;
        if (multiple) {
          if (selectedValues.some((entry) => valuesEqual(entry, option.value)))
            removeValue(option.value);
          else {
            const nextValues = [...selectedValues, option.value];
            commitValue(nextValues, [...selectedOptions, option]);
            onSelect?.(option.value, option);
          }
          setSearchValue("");
          inputRef.current?.focus();
          return;
        }
        commitValue(option.value, option);
        onSelect?.(option.value, option);
        updateOpen(false);
        selectorRef.current?.focus();
      },
      [commitValue, multiple, onSelect, removeValue, selectedOptions, selectedValues, updateOpen],
    );

    const createTags = useCallback(
      (tokens: ReadonlyArray<string>) => {
        if (mode !== "tags") return;
        const trimmed = tokens.map((token) => token.trim()).filter(Boolean);
        if (trimmed.length === 0) return;
        const nextValues = [...selectedValues];
        for (const token of trimmed) {
          const matching = flatOptions.find(
            (option) =>
              String(option.value).toLocaleLowerCase() === token.toLocaleLowerCase() ||
              textContent(option.label).toLocaleLowerCase() === token.toLocaleLowerCase(),
          );
          const next = matching?.value ?? token;
          if (!nextValues.some((entry) => valuesEqual(entry, next))) nextValues.push(next);
        }
        commitValue(
          nextValues,
          nextValues.map((entry) => optionFor(entry) ?? { label: String(entry), value: entry }),
        );
        setSearchValue("");
      },
      [commitValue, flatOptions, mode, optionFor, selectedValues],
    );

    const moveActive = (direction: 1 | -1) => {
      if (visibleOptions.length === 0) return;
      let candidate = activeIndex;
      for (let attempt = 0; attempt < visibleOptions.length; attempt += 1) {
        candidate =
          candidate < 0
            ? direction > 0
              ? 0
              : visibleOptions.length - 1
            : (candidate + direction + visibleOptions.length) % visibleOptions.length;
        if (visibleOptions[candidate]?.option.disabled !== true) {
          setActiveIndex(candidate);
          return;
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!popupVisible) {
          setActiveIndex(firstEnabledIndex);
          updateOpen(true);
        } else moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter") {
        if (!popupVisible) {
          event.preventDefault();
          updateOpen(true);
        } else if (activeOption !== undefined) {
          event.preventDefault();
          selectOption(activeOption.option);
        } else if (mode === "tags" && searchValue.trim()) {
          event.preventDefault();
          createTags([searchValue]);
        }
      } else if (event.key === "Escape") updateOpen(false);
      else if (event.key === "Backspace" && multiple && searchValue.length === 0) {
        const lastValue = selectedValues.at(-1);
        if (lastValue !== undefined) removeValue(lastValue);
      }
    };

    const handleSearchChange = (nextSearch: string) => {
      if (mode === "tags" && tokenSeparators.length > 0) {
        const expression = escapedSeparatorExpression(tokenSeparators);
        if (expression.test(nextSearch)) {
          createTags(nextSearch.split(expression));
          return;
        }
      }
      setSearchValue(nextSearch);
      searchConfig?.onSearch?.(nextSearch);
      setActiveIndex(firstEnabledIndex);
      updateOpen(true);
    };

    const clearSelection = () => {
      commitValue(multiple ? [] : undefined, multiple ? [] : undefined);
      setSearchValue("");
      onClear?.();
      inputRef.current?.focus();
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => (inputRef.current ?? selectorRef.current)?.blur(),
        focus: () => (inputRef.current ?? selectorRef.current)?.focus(),
        get nativeElement() {
          return rootRef.current;
        },
      }),
      [],
    );

    useEffect(() => {
      if (!popupVisible) return;
      const closeOnOutsidePointer = (event: PointerEvent) => {
        const target = event.target as Node;
        if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) return;
        updateOpen(false);
      };
      document.addEventListener("pointerdown", closeOnOutsidePointer);
      return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
    }, [popupVisible, updateOpen]);

    useEffect(() => {
      if (!popupVisible || activeOption === undefined) return;
      document.getElementById(activeOption.id)?.scrollIntoView({ block: "nearest" });
    }, [activeOption, popupVisible]);

    useEffect(() => {
      if (popupVisible) setActiveIndex(firstEnabledIndex);
    }, [firstEnabledIndex, popupVisible]);

    useLayoutEffect(() => {
      if (!popupVisible || rootRef.current === null) return;
      const root = rootRef.current;
      const update = () => {
        const rect = root.getBoundingClientRect();
        const placeAbove = placement.startsWith("top");
        const alignRight = placement.endsWith("Right");
        const width =
          typeof popupMatchSelectWidth === "number"
            ? Math.max(rect.width, popupMatchSelectWidth)
            : popupMatchSelectWidth
              ? rect.width
              : undefined;
        setPopupPosition({
          ...(alignRight ? { right: window.innerWidth - rect.right } : { left: rect.left }),
          minWidth: popupMatchSelectWidth === false ? rect.width : undefined,
          top: placeAbove ? rect.top - 4 : rect.bottom + 4,
          transform: placeAbove ? "translateY(-100%)" : undefined,
          visibility: "visible",
          width,
        });
      };
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      const observer =
        typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
      observer?.observe(root);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
        observer?.disconnect();
      };
    }, [placement, popupMatchSelectWidth, popupVisible]);

    const shownOptions =
      maxTagCount === undefined || maxTagCount === "responsive"
        ? selectedOptions
        : selectedOptions.slice(0, Math.max(0, maxTagCount));
    const omittedTagCount = selectedOptions.length - shownOptions.length;
    const selectedOption = selectedOptions[0];
    const hasValue = selectedValues.length > 0;
    const clearConfig = typeof allowClear === "object" ? allowClear : undefined;
    const showClear = allowClear !== false && hasValue && !disabled && !loading;
    const inputPlaceholder = hasValue
      ? undefined
      : typeof placeholder === "string"
        ? placeholder
        : undefined;

    const menu = (
      <div
        className={classes("launch-ui-select-list", resolvedClassNames.list)}
        onScroll={onPopupScroll}
        role="presentation"
        style={resolvedStyles.list}
      >
        {visibleGroups.length === 0 ? (
          <div className="launch-ui-select-empty">{notFoundContent}</div>
        ) : (
          visibleGroups.map((group) => (
            <div
              className={classes(
                "launch-ui-select-group",
                group.label !== undefined && "has-label",
                resolvedClassNames.group,
              )}
              key={group.key}
              role={group.label === undefined ? "presentation" : "group"}
              style={resolvedStyles.group}
            >
              {group.label === undefined ? null : (
                <div
                  className={classes("launch-ui-select-group-label", resolvedClassNames.groupLabel)}
                  style={resolvedStyles.groupLabel}
                >
                  {group.label}
                </div>
              )}
              {group.options.map((entry) => {
                const selected = selectedValues.some((selectedValue) =>
                  valuesEqual(selectedValue, entry.option.value),
                );
                return (
                  <div
                    aria-disabled={entry.option.disabled || undefined}
                    aria-selected={selected}
                    className={classes(
                      "launch-ui-select-item",
                      selected && "is-selected",
                      entry.index === activeIndex && "is-active",
                      entry.option.disabled && "is-disabled",
                      resolvedClassNames.item,
                    )}
                    id={entry.id}
                    key={`${typeof entry.option.value}-${String(entry.option.value)}`}
                    onClick={() => selectOption(entry.option)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectOption(entry.option);
                      }
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => !entry.option.disabled && setActiveIndex(entry.index)}
                    role="option"
                    style={resolvedStyles.item}
                    tabIndex={-1}
                  >
                    <span className="launch-ui-select-item-label">
                      {optionRender?.(entry.option, { index: entry.index }) ?? entry.option.label}
                    </span>
                    {selected ? (
                      <span className="launch-ui-item-indicator">
                        {menuItemSelectedIcon ?? <CheckIcon />}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
    const popup = popupVisible ? (
      <div
        className={classes(
          "launch-ui-select-content",
          placement.startsWith("top") ? "is-top" : "is-bottom",
          resolvedClassNames.popup,
        )}
        data-launch-ui-popup="select"
        id={listboxId}
        ref={popupRef}
        role="listbox"
        style={{ ...popupPosition, ...resolvedStyles.popup }}
      >
        {popupRender?.(menu) ?? menu}
      </div>
    ) : null;

    return (
      <div
        className={classes(
          "launch-ui-select",
          `is-${size}`,
          `is-${variant}`,
          status && `is-${status}`,
          multiple && "is-multiple",
          popupVisible && "is-open",
          disabled && "is-disabled",
          resolvedClassNames.root,
          className,
        )}
        ref={rootRef}
        style={{ ...resolvedStyles.root, ...style }}
      >
        <div
          aria-controls={listboxId}
          aria-describedby={ariaDescribedBy}
          aria-expanded={popupVisible}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={classes("launch-ui-select-trigger", resolvedClassNames.selector)}
          id={id}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null;
            if (
              nextTarget &&
              (rootRef.current?.contains(nextTarget) || popupRef.current?.contains(nextTarget))
            )
              return;
            onBlur?.(event);
          }}
          onClick={() => {
            if (disabled || loading) return;
            if (searchable) {
              updateOpen(true);
              inputRef.current?.focus();
            } else updateOpen(!open);
          }}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          ref={selectorRef}
          role="combobox"
          style={resolvedStyles.selector}
          tabIndex={disabled ? -1 : 0}
        >
          <div className="launch-ui-select-selection">
            {multiple
              ? shownOptions.map((option) => {
                  const onClose = () => removeValue(option.value);
                  const content =
                    labelRender?.({ label: option.label, value: option.value }) ??
                    option.label ??
                    String(option.value);
                  return tagRender ? (
                    <span
                      className={classes("launch-ui-select-custom-tag", resolvedClassNames.tag)}
                      key={String(option.value)}
                      style={resolvedStyles.tag}
                    >
                      {tagRender({
                        closable: !disabled,
                        label: option.label ?? String(option.value),
                        onClose,
                        value: option.value,
                      })}
                    </span>
                  ) : (
                    <span
                      className={classes("launch-ui-select-tag", resolvedClassNames.tag)}
                      key={String(option.value)}
                      style={resolvedStyles.tag}
                    >
                      <span>{content}</span>
                      {!disabled ? (
                        <button
                          aria-label={`Remove ${textContent(option.label) || String(option.value)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onClose();
                          }}
                          type="button"
                        >
                          <CloseIcon />
                        </button>
                      ) : null}
                    </span>
                  );
                })
              : null}
            {multiple && omittedTagCount > 0 ? (
              <span className="launch-ui-select-tag">+ {omittedTagCount} ...</span>
            ) : null}
            {searchable ? (
              <input
                aria-activedescendant={activeOption?.id}
                aria-autocomplete="list"
                autoComplete="off"
                className={classes("launch-ui-select-search", resolvedClassNames.input)}
                disabled={disabled}
                onChange={(event) => handleSearchChange(event.currentTarget.value)}
                onPaste={(event) => {
                  if (mode !== "tags" || tokenSeparators.length === 0) return;
                  const pasted = event.clipboardData.getData("text");
                  if (tokenSeparators.some((separator) => pasted.includes(separator))) {
                    event.preventDefault();
                    createTags(pasted.split(escapedSeparatorExpression(tokenSeparators)));
                  }
                }}
                placeholder={inputPlaceholder}
                ref={inputRef}
                style={resolvedStyles.input}
                value={searchValue}
              />
            ) : null}
            {!multiple && (!searchable || (searchValue.length === 0 && hasValue)) ? (
              <span className={classes("launch-ui-select-value", !hasValue && "is-placeholder")}>
                {hasValue && selectedOption
                  ? (labelRender?.({ label: selectedOption.label, value: selectedOption.value }) ??
                    selectedOption.label ??
                    String(selectedOption.value))
                  : placeholder}
              </span>
            ) : null}
          </div>
          <div className="launch-ui-select-actions">
            {showClear ? (
              <button
                aria-label="Clear selection"
                className={classes("launch-ui-select-clear", resolvedClassNames.clear)}
                onClick={(event) => {
                  event.stopPropagation();
                  clearSelection();
                }}
                style={resolvedStyles.clear}
                type="button"
              >
                {clearConfig?.clearIcon ?? <CloseIcon />}
              </button>
            ) : null}
            <span
              className={classes("launch-ui-select-icon", resolvedClassNames.suffix)}
              style={resolvedStyles.suffix}
            >
              {loading ? <LoadingIcon /> : <ChevronDownIcon />}
            </span>
          </div>
        </div>
        {typeof document === "undefined" || popup === null
          ? null
          : createPortal(popup, document.body)}
      </div>
    );
  },
);
