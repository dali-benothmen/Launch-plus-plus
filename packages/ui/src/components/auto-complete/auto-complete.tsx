import {
  type ChangeEvent,
  type CSSProperties,
  cloneElement,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
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
import { Input, type InputVariant } from "../input/index.js";
import { classes } from "../internal/classes.js";
import { CloseIcon } from "../internal/icons.js";

export type AutoCompleteSize = "large" | "medium" | "small";
export type AutoCompleteStatus = "error" | "warning";

export interface AutoCompleteOption {
  readonly disabled?: boolean;
  readonly label?: ReactNode;
  readonly value: string;
}

export interface AutoCompleteOptionGroup {
  readonly label: ReactNode;
  readonly options: ReadonlyArray<AutoCompleteOption>;
}

export type AutoCompleteOptionEntry = AutoCompleteOption | AutoCompleteOptionGroup;

export interface AutoCompleteSearchConfig {
  readonly filterOption?: boolean | ((inputValue: string, option: AutoCompleteOption) => boolean);
  readonly onSearch?: (value: string) => void;
}

export interface AutoCompleteClearConfig {
  readonly clearIcon?: ReactNode;
}

export interface AutoCompletePopupClassNames {
  readonly empty?: string;
  readonly group?: string;
  readonly groupLabel?: string;
  readonly list?: string;
  readonly listItem?: string;
  readonly root?: string;
}

export interface AutoCompleteClassNames {
  readonly clear?: string;
  readonly input?: string;
  readonly popup?: AutoCompletePopupClassNames;
  readonly root?: string;
}

export interface AutoCompletePopupStyles {
  readonly empty?: CSSProperties;
  readonly group?: CSSProperties;
  readonly groupLabel?: CSSProperties;
  readonly list?: CSSProperties;
  readonly listItem?: CSSProperties;
  readonly root?: CSSProperties;
}

export interface AutoCompleteStyles {
  readonly clear?: CSSProperties;
  readonly input?: CSSProperties;
  readonly popup?: AutoCompletePopupStyles;
  readonly root?: CSSProperties;
}

type AutoCompleteInputElement = HTMLInputElement | HTMLTextAreaElement;

interface CustomInputProps {
  readonly "aria-activedescendant"?: string;
  readonly "aria-autocomplete"?: "list";
  readonly "aria-controls"?: string;
  readonly "aria-expanded"?: boolean;
  readonly "aria-haspopup"?: "listbox";
  readonly autoComplete?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onBlur?: (event: FocusEvent<AutoCompleteInputElement>) => void;
  readonly onChange?: (event: ChangeEvent<AutoCompleteInputElement>) => void;
  readonly onFocus?: (event: FocusEvent<AutoCompleteInputElement>) => void;
  readonly onKeyDown?: (event: KeyboardEvent<AutoCompleteInputElement>) => void;
  readonly placeholder?: string;
  readonly ref?: Ref<AutoCompleteInputElement>;
  readonly role?: "combobox";
  readonly style?: CSSProperties;
  readonly value?: string;
}

export interface AutoCompleteRef {
  readonly nativeElement: AutoCompleteInputElement | null;
  blur: () => void;
  focus: () => void;
}

export interface AutoCompleteProps {
  readonly allowClear?: boolean | AutoCompleteClearConfig;
  readonly backfill?: boolean;
  readonly children?: ReactElement<CustomInputProps>;
  readonly className?: string;
  readonly classNames?:
    | AutoCompleteClassNames
    | ((info: { readonly props: AutoCompleteProps }) => AutoCompleteClassNames);
  readonly defaultActiveFirstOption?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  readonly notFoundContent?: ReactNode;
  readonly onBlur?: (event: FocusEvent<AutoCompleteInputElement>) => void;
  readonly onChange?: (value: string) => void;
  readonly onClear?: () => void;
  readonly onFocus?: (event: FocusEvent<AutoCompleteInputElement>) => void;
  readonly onInputKeyDown?: (event: KeyboardEvent<AutoCompleteInputElement>) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onPopupScroll?: (event: UIEvent<HTMLDivElement>) => void;
  readonly onSearch?: (value: string) => void;
  readonly onSelect?: (value: string, option: AutoCompleteOption) => void;
  readonly open?: boolean;
  readonly options?: ReadonlyArray<AutoCompleteOptionEntry>;
  readonly placeholder?: string;
  readonly popupMatchSelectWidth?: boolean | number;
  readonly popupRender?: (originNode: ReactElement) => ReactNode;
  readonly showSearch?: boolean | AutoCompleteSearchConfig;
  readonly size?: AutoCompleteSize;
  readonly status?: AutoCompleteStatus;
  readonly style?: CSSProperties;
  readonly styles?:
    | AutoCompleteStyles
    | ((info: { readonly props: AutoCompleteProps }) => AutoCompleteStyles);
  readonly value?: string;
  readonly variant?: InputVariant;
  readonly virtual?: boolean;
}

interface VisibleOption {
  readonly id: string;
  readonly index: number;
  readonly option: AutoCompleteOption;
}

interface VisibleGroup {
  readonly key: string;
  readonly label?: ReactNode;
  readonly options: ReadonlyArray<VisibleOption>;
}

function isGroup(entry: AutoCompleteOptionEntry): entry is AutoCompleteOptionGroup {
  return "options" in entry;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) ref.current = value;
}

function defaultFilter(inputValue: string, option: AutoCompleteOption) {
  return option.value.toLocaleLowerCase().includes(inputValue.toLocaleLowerCase());
}

export const AutoComplete = forwardRef<AutoCompleteRef, AutoCompleteProps>(
  function AutoComplete(autoCompleteProps, forwardedRef) {
    const {
      allowClear = false,
      backfill = false,
      children,
      className,
      classNames: classNamesProp,
      defaultActiveFirstOption = true,
      defaultOpen = false,
      defaultValue = "",
      disabled = false,
      getPopupContainer,
      notFoundContent,
      onBlur,
      onChange,
      onClear,
      onFocus,
      onInputKeyDown,
      onOpenChange,
      onPopupScroll,
      onSearch,
      onSelect,
      open: controlledOpen,
      options = [],
      placeholder,
      popupMatchSelectWidth = true,
      popupRender,
      showSearch = true,
      size = "medium",
      status,
      style,
      styles: stylesProp,
      value: controlledValue,
      variant = "outlined",
    } = autoCompleteProps;
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<AutoCompleteInputElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [backfillValue, setBackfillValue] = useState<string>();
    const [popupPosition, setPopupPosition] = useState<CSSProperties>({ visibility: "hidden" });
    const value = controlledValue ?? internalValue;
    const displayedValue = backfillValue ?? value;
    const open = controlledOpen ?? internalOpen;
    const searchConfig = typeof showSearch === "object" ? showSearch : undefined;
    const filterOption = searchConfig?.filterOption ?? true;
    const searchHandler = searchConfig?.onSearch ?? onSearch;
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: autoCompleteProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function"
        ? stylesProp({ props: autoCompleteProps })
        : (stylesProp ?? {});

    const visibleGroups = useMemo<ReadonlyArray<VisibleGroup>>(() => {
      let nextIndex = 0;
      const filter = (option: AutoCompleteOption) => {
        if (showSearch === false || filterOption === false || value.length === 0) return true;
        if (typeof filterOption === "function") return filterOption(value, option);
        return defaultFilter(value, option);
      };

      return options.flatMap((entry, entryIndex) => {
        const source = isGroup(entry) ? entry.options : [entry];
        const groupOptions = source.flatMap((option, optionIndex) => {
          if (!filter(option)) return [];
          const visibleOption: VisibleOption = {
            id: `${listboxId}-option-${entryIndex}-${optionIndex}`,
            index: nextIndex++,
            option,
          };
          return [visibleOption];
        });
        if (groupOptions.length === 0) return [];
        return [
          {
            key: `${entryIndex}`,
            label: isGroup(entry) ? entry.label : undefined,
            options: groupOptions,
          },
        ];
      });
    }, [filterOption, listboxId, options, showSearch, value]);
    const visibleOptions = useMemo(
      () => visibleGroups.flatMap((group) => group.options),
      [visibleGroups],
    );
    const firstEnabledIndex = visibleOptions.find((entry) => !entry.option.disabled)?.index ?? -1;
    const lastEnabledIndex =
      [...visibleOptions].reverse().find((entry) => !entry.option.disabled)?.index ?? -1;
    const hasPopupContent = visibleOptions.length > 0 || notFoundContent != null;
    const popupVisible = open && !disabled && hasPopupContent;
    const activeOption = visibleOptions.find((option) => option.index === activeIndex);

    const updateOpen = useCallback(
      (nextOpen: boolean) => {
        if (disabled) return;
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        if (nextOpen !== open) onOpenChange?.(nextOpen);
      },
      [controlledOpen, disabled, onOpenChange, open],
    );

    const commitValue = useCallback(
      (nextValue: string) => {
        if (controlledValue === undefined) setInternalValue(nextValue);
        onChange?.(nextValue);
      },
      [controlledValue, onChange],
    );

    const selectOption = useCallback(
      (option: AutoCompleteOption) => {
        if (option.disabled) return;
        setBackfillValue(undefined);
        commitValue(option.value);
        onSelect?.(option.value, option);
        updateOpen(false);
        inputRef.current?.focus();
      },
      [commitValue, onSelect, updateOpen],
    );

    const moveActive = (direction: 1 | -1) => {
      if (visibleOptions.length === 0) return;
      let candidate = activeIndex;
      for (let attempts = 0; attempts < visibleOptions.length; attempts += 1) {
        candidate =
          candidate < 0
            ? direction > 0
              ? 0
              : visibleOptions.length - 1
            : (candidate + direction + visibleOptions.length) % visibleOptions.length;
        const entry = visibleOptions[candidate];
        if (entry !== undefined && !entry.option.disabled) {
          setActiveIndex(candidate);
          if (backfill) setBackfillValue(entry.option.value);
          return;
        }
      }
    };

    const handleInputChange = (event: ChangeEvent<AutoCompleteInputElement>) => {
      const nextValue = event.currentTarget.value;
      setBackfillValue(undefined);
      commitValue(nextValue);
      searchHandler?.(nextValue);
      setActiveIndex(defaultActiveFirstOption ? firstEnabledIndex : -1);
      updateOpen(true);
    };

    const handleInputKeyDown = (event: KeyboardEvent<AutoCompleteInputElement>) => {
      onInputKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (popupVisible) moveActive(1);
        else {
          setActiveIndex(firstEnabledIndex);
          if (backfill) setBackfillValue(visibleOptions[firstEnabledIndex]?.option.value);
          updateOpen(true);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (popupVisible) moveActive(-1);
        else {
          setActiveIndex(lastEnabledIndex);
          if (backfill) setBackfillValue(visibleOptions[lastEnabledIndex]?.option.value);
          updateOpen(true);
        }
      } else if (event.key === "Enter" && popupVisible && activeOption !== undefined) {
        event.preventDefault();
        selectOption(activeOption.option);
      } else if (event.key === "Escape") {
        setBackfillValue(undefined);
        updateOpen(false);
      }
    };

    const handleFocus = (event: FocusEvent<AutoCompleteInputElement>) => {
      onFocus?.(event);
      if (!event.defaultPrevented) {
        setActiveIndex(defaultActiveFirstOption ? firstEnabledIndex : -1);
        updateOpen(true);
      }
    };

    const handleBlur = (event: FocusEvent<AutoCompleteInputElement>) => {
      onBlur?.(event);
      setBackfillValue(undefined);
      updateOpen(false);
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        get nativeElement() {
          return inputRef.current;
        },
      }),
      [],
    );

    useEffect(() => {
      if (
        visibleOptions.some(
          (entry) => entry.index === activeIndex && entry.option.disabled !== true,
        )
      ) {
        return;
      }
      setActiveIndex(defaultActiveFirstOption ? firstEnabledIndex : -1);
    }, [activeIndex, defaultActiveFirstOption, firstEnabledIndex, visibleOptions]);

    useEffect(() => {
      if (!popupVisible || activeOption === undefined) return;
      document.getElementById(activeOption.id)?.scrollIntoView({ block: "nearest" });
    }, [activeOption, popupVisible]);

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

    useLayoutEffect(() => {
      if (!popupVisible || rootRef.current === null) return;
      const root = rootRef.current;
      const update = () => {
        const rect = root.getBoundingClientRect();
        const estimatedHeight = Math.min(256, Math.max(40, visibleOptions.length * 32 + 8));
        const placeAbove =
          window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
        const width =
          typeof popupMatchSelectWidth === "number"
            ? Math.max(rect.width, popupMatchSelectWidth)
            : popupMatchSelectWidth
              ? rect.width
              : undefined;
        setPopupPosition({
          left: rect.left,
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
    }, [popupMatchSelectWidth, popupVisible, visibleOptions.length]);

    const childProps = children?.props;
    const resolvedPlaceholder = childProps?.placeholder ?? placeholder;
    const sharedInputProps = {
      ...(popupVisible && activeOption !== undefined
        ? { "aria-activedescendant": activeOption.id }
        : {}),
      "aria-autocomplete": "list" as const,
      "aria-controls": listboxId,
      "aria-expanded": popupVisible,
      "aria-haspopup": "listbox" as const,
      autoComplete: "off",
      disabled,
      onBlur: (event: FocusEvent<AutoCompleteInputElement>) => {
        childProps?.onBlur?.(event);
        if (!event.defaultPrevented) handleBlur(event);
      },
      onChange: (event: ChangeEvent<AutoCompleteInputElement>) => {
        childProps?.onChange?.(event);
        if (!event.defaultPrevented) handleInputChange(event);
      },
      onFocus: (event: FocusEvent<AutoCompleteInputElement>) => {
        childProps?.onFocus?.(event);
        if (!event.defaultPrevented) handleFocus(event);
      },
      onKeyDown: (event: KeyboardEvent<AutoCompleteInputElement>) => {
        childProps?.onKeyDown?.(event);
        if (!event.defaultPrevented) handleInputKeyDown(event);
      },
      ...(resolvedPlaceholder === undefined ? {} : { placeholder: resolvedPlaceholder }),
      role: "combobox" as const,
      value: displayedValue,
    };
    const input =
      children === undefined ? (
        <Input
          {...sharedInputProps}
          className={classes("launch-ui-autocomplete-input", resolvedClassNames.input)}
          ref={(node) => {
            inputRef.current = node;
          }}
          {...(status === undefined ? {} : { status })}
          {...(resolvedStyles.input === undefined ? {} : { style: resolvedStyles.input })}
          variant={variant}
        />
      ) : (
        cloneElement(children, {
          ...sharedInputProps,
          className: classes(
            "launch-ui-autocomplete-input",
            childProps?.className,
            resolvedClassNames.input,
          ),
          ref: (node: AutoCompleteInputElement | null) => {
            inputRef.current = node;
            assignRef(childProps?.ref, node);
          },
          style: { ...childProps?.style, ...resolvedStyles.input },
        })
      );
    const clearConfig = typeof allowClear === "object" ? allowClear : undefined;
    const showClear = allowClear !== false && displayedValue.length > 0 && !disabled;
    const popupContainer =
      rootRef.current !== null && getPopupContainer !== undefined
        ? getPopupContainer(rootRef.current)
        : typeof document === "undefined"
          ? null
          : document.body;

    const list = (
      <div
        className={classes("launch-ui-autocomplete-list", resolvedClassNames.popup?.list)}
        id={listboxId}
        onScroll={onPopupScroll}
        role="listbox"
        style={resolvedStyles.popup?.list}
      >
        {visibleOptions.length === 0 ? (
          <div
            className={classes("launch-ui-autocomplete-empty", resolvedClassNames.popup?.empty)}
            style={resolvedStyles.popup?.empty}
          >
            {notFoundContent}
          </div>
        ) : (
          visibleGroups.map((group) => (
            <div
              {...(group.label === undefined
                ? {}
                : { "aria-labelledby": `${listboxId}-group-${group.key}` })}
              className={classes("launch-ui-autocomplete-group", resolvedClassNames.popup?.group)}
              key={group.key}
              role={group.label === undefined ? "presentation" : "group"}
              style={resolvedStyles.popup?.group}
            >
              {group.label !== undefined ? (
                <div
                  className={classes(
                    "launch-ui-autocomplete-group-label",
                    resolvedClassNames.popup?.groupLabel,
                  )}
                  id={`${listboxId}-group-${group.key}`}
                  style={resolvedStyles.popup?.groupLabel}
                >
                  {group.label}
                </div>
              ) : null}
              {group.options.map(({ id, index, option }) => (
                <div
                  aria-disabled={option.disabled || undefined}
                  aria-selected={index === activeIndex}
                  className={classes(
                    "launch-ui-autocomplete-option",
                    index === activeIndex && "is-active",
                    option.disabled && "is-disabled",
                    resolvedClassNames.popup?.listItem,
                  )}
                  id={id}
                  key={id}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") selectOption(option);
                  }}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  role="option"
                  style={resolvedStyles.popup?.listItem}
                  tabIndex={-1}
                >
                  {option.label ?? option.value}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
    const popup = (
      <div
        className={classes("launch-ui-autocomplete-popup", resolvedClassNames.popup?.root)}
        ref={popupRef}
        style={{ ...popupPosition, ...resolvedStyles.popup?.root }}
      >
        {popupRender?.(list) ?? list}
      </div>
    );

    return (
      <div
        className={classes(
          "launch-ui-autocomplete",
          `is-${size}`,
          status && `is-${status}`,
          disabled && "is-disabled",
          showClear && "has-clear",
          resolvedClassNames.root,
          className,
        )}
        ref={rootRef}
        style={{ ...resolvedStyles.root, ...style }}
      >
        {input}
        {showClear ? (
          <button
            aria-label="Clear input"
            className={classes("launch-ui-autocomplete-clear", resolvedClassNames.clear)}
            onClick={() => {
              setBackfillValue(undefined);
              commitValue("");
              searchHandler?.("");
              onClear?.();
              setActiveIndex(-1);
              updateOpen(false);
              inputRef.current?.focus();
            }}
            style={resolvedStyles.clear}
            type="button"
          >
            {clearConfig?.clearIcon ?? <CloseIcon />}
          </button>
        ) : null}
        {popupVisible && popupContainer !== null ? createPortal(popup, popupContainer) : null}
      </div>
    );
  },
);
