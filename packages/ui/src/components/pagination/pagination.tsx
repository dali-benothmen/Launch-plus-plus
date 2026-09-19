import {
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Input } from "../input/index.js";
import { classes } from "../internal/classes.js";
import { Select, type SelectOption } from "../select/index.js";

export type PaginationAlign = "center" | "end" | "start";
export type PaginationSize = "large" | "medium" | "small";
export type PaginationItemType = "next" | "page" | "prev";
export type PaginationSemanticName =
  | "ellipsis"
  | "item"
  | "next"
  | "options"
  | "pages"
  | "prev"
  | "quickJumper"
  | "quickJumperInput"
  | "root"
  | "simple"
  | "sizeChanger"
  | "total";
export type PaginationClassNames = Partial<Record<PaginationSemanticName, string>>;
export type PaginationStyles = Partial<Record<PaginationSemanticName, CSSProperties>>;

export interface PaginationSizeChangerConfig {
  readonly className?: string;
  readonly disabled?: boolean;
}

export interface PaginationSizeChangerProps {
  readonly disabled: boolean;
  readonly onChange: (pageSize: number) => void;
  readonly options: ReadonlyArray<number>;
  readonly value: number;
}

export interface PaginationComponents {
  readonly sizeChanger?: ComponentType<PaginationSizeChangerProps>;
}

export interface PaginationQuickJumperConfig {
  readonly goButton: ReactNode;
}

export interface PaginationSimpleConfig {
  readonly readOnly?: boolean;
}

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  readonly align?: PaginationAlign;
  readonly classNames?:
    | PaginationClassNames
    | ((info: { readonly props: PaginationProps }) => PaginationClassNames);
  readonly components?: PaginationComponents;
  readonly current?: number;
  readonly defaultCurrent?: number;
  readonly defaultPageSize?: number;
  readonly disabled?: boolean;
  readonly hideOnSinglePage?: boolean;
  readonly itemRender?: (
    page: number,
    type: PaginationItemType,
    originalElement: ReactNode,
  ) => ReactNode;
  readonly onChange?: (page: number, pageSize: number) => void;
  readonly onShowSizeChange?: (current: number, size: number) => void;
  readonly pageSize?: number;
  readonly pageSizeOptions?: ReadonlyArray<number>;
  readonly responsive?: boolean;
  readonly showLessItems?: boolean;
  readonly showQuickJumper?: boolean | PaginationQuickJumperConfig;
  readonly showSizeChanger?: boolean | PaginationSizeChangerConfig;
  readonly showTitle?: boolean;
  readonly showTotal?: (total: number, range: readonly [number, number]) => ReactNode;
  readonly simple?: boolean | PaginationSimpleConfig;
  readonly size?: PaginationSize;
  readonly styles?:
    | PaginationStyles
    | ((info: { readonly props: PaginationProps }) => PaginationStyles);
  readonly total?: number;
  readonly totalBoundaryShowSizeChanger?: number;
}

type PageItem = "jump-next" | "jump-prev" | number;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(Math.round(value), minimum), maximum);
}

function range(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function getPageItems(pageCount: number, current: number, showLessItems: boolean): PageItem[] {
  const siblingCount = showLessItems ? 1 : 2;
  const edgeWindow = siblingCount * 2 + 5;
  if (pageCount <= edgeWindow) return range(1, pageCount);

  let start = Math.max(2, current - siblingCount);
  let end = Math.min(pageCount - 1, current + siblingCount);

  if (current <= siblingCount + 2) {
    start = 2;
    end = edgeWindow - 1;
  } else if (current >= pageCount - siblingCount - 1) {
    start = pageCount - edgeWindow + 2;
    end = pageCount - 1;
  }

  return [
    1,
    ...(start > 2 ? (["jump-prev"] as const) : []),
    ...range(start, end),
    ...(end < pageCount - 1 ? (["jump-next"] as const) : []),
    pageCount,
  ];
}

function PreviousIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-pagination-icon" viewBox="0 0 16 16">
      <path d="m10 3.5-4.5 4.5 4.5 4.5" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-pagination-icon" viewBox="0 0 16 16">
      <path d="m6 3.5 4.5 4.5-4.5 4.5" />
    </svg>
  );
}

export function Pagination(paginationProps: PaginationProps) {
  const {
    align = "start",
    className,
    classNames: classNamesProp,
    components,
    current: controlledCurrent,
    defaultCurrent = 1,
    defaultPageSize = 10,
    disabled = false,
    hideOnSinglePage = false,
    itemRender,
    onChange,
    onShowSizeChange,
    pageSize: controlledPageSize,
    pageSizeOptions = [10, 20, 50, 100],
    responsive = false,
    showLessItems = false,
    showQuickJumper = false,
    showSizeChanger,
    showTitle = true,
    showTotal,
    simple = false,
    size,
    style,
    styles: stylesProp,
    total: totalProp = 0,
    totalBoundaryShowSizeChanger = 50,
    ...rootProps
  } = paginationProps;
  const total = Math.max(0, totalProp);
  const [internalCurrent, setInternalCurrent] = useState(Math.max(1, defaultCurrent));
  const [internalPageSize, setInternalPageSize] = useState(Math.max(1, defaultPageSize));
  const [isResponsiveSmall, setIsResponsiveSmall] = useState(false);
  const pageSize = Math.max(1, controlledPageSize ?? internalPageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = clamp(controlledCurrent ?? internalCurrent, 1, pageCount);
  const [quickDraft, setQuickDraft] = useState("");
  const [simpleDraft, setSimpleDraft] = useState(String(current));
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: paginationProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: paginationProps }) : (stylesProp ?? {});
  const resolvedSize = size ?? (responsive && isResponsiveSmall ? "small" : "medium");
  const shouldShowSizeChanger =
    showSizeChanger === false
      ? false
      : showSizeChanger === true || typeof showSizeChanger === "object"
        ? true
        : total > totalBoundaryShowSizeChanger;
  const isSimple = simple !== false;
  const simpleReadOnly = typeof simple === "object" && simple.readOnly === true;
  const quickJumperConfig = typeof showQuickJumper === "object" ? showQuickJumper : undefined;
  const pageItems = useMemo(
    () => getPageItems(pageCount, current, showLessItems || isResponsiveSmall),
    [current, isResponsiveSmall, pageCount, showLessItems],
  );

  useEffect(() => setSimpleDraft(String(current)), [current]);

  useEffect(() => {
    if (!responsive || size !== undefined || typeof window === "undefined") {
      setIsResponsiveSmall(false);
      return;
    }
    const query = window.matchMedia("(max-width: 575px)");
    const update = () => setIsResponsiveSmall(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [responsive, size]);

  const changePage = (nextPage: number) => {
    if (disabled) return;
    const resolvedPage = clamp(nextPage, 1, pageCount);
    if (resolvedPage === current) return;
    if (controlledCurrent === undefined) setInternalCurrent(resolvedPage);
    onChange?.(resolvedPage, pageSize);
  };

  const changePageSize = (nextPageSize: number) => {
    if (disabled) return;
    const resolvedPageSize = Math.max(1, nextPageSize);
    const nextPageCount = Math.max(1, Math.ceil(total / resolvedPageSize));
    const nextCurrent = clamp(current, 1, nextPageCount);
    if (controlledPageSize === undefined) setInternalPageSize(resolvedPageSize);
    if (controlledCurrent === undefined) setInternalCurrent(nextCurrent);
    onShowSizeChange?.(nextCurrent, resolvedPageSize);
    onChange?.(nextCurrent, resolvedPageSize);
  };

  const submitQuickJump = () => {
    const page = Number.parseInt(quickDraft, 10);
    if (Number.isFinite(page)) changePage(page);
    setQuickDraft("");
  };

  const submitSimplePage = () => {
    const page = Number.parseInt(simpleDraft, 10);
    if (Number.isFinite(page)) changePage(page);
    setSimpleDraft(String(current));
  };

  const renderItemContent = (page: number, type: PaginationItemType, content: ReactNode) =>
    itemRender?.(page, type, <span>{content}</span>) ?? content;

  const renderNavigationButton = (type: "next" | "prev") => {
    const isPrevious = type === "prev";
    const targetPage = current + (isPrevious ? -1 : 1);
    const isDisabled = disabled || (isPrevious ? current <= 1 : current >= pageCount);
    const label = isPrevious ? "Previous page" : "Next page";
    return (
      <button
        aria-label={label}
        className={classes(
          "launch-ui-pagination-item",
          `is-${type}`,
          resolvedClassNames.item,
          resolvedClassNames[type],
        )}
        disabled={isDisabled}
        onClick={() => changePage(targetPage)}
        style={{ ...resolvedStyles.item, ...resolvedStyles[type] }}
        title={showTitle ? label : undefined}
        type="button"
      >
        {renderItemContent(targetPage, type, isPrevious ? <PreviousIcon /> : <NextIcon />)}
      </button>
    );
  };

  const renderPages = () => {
    if (isSimple) {
      return (
        <div
          className={classes("launch-ui-pagination-simple", resolvedClassNames.simple)}
          style={resolvedStyles.simple}
        >
          {simpleReadOnly ? (
            <span className="launch-ui-pagination-simple-current">{current}</span>
          ) : (
            <Input
              aria-label="Current page"
              className="launch-ui-pagination-simple-input"
              disabled={disabled}
              inputMode="numeric"
              min={1}
              onBlur={submitSimplePage}
              onChange={(event) => setSimpleDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSimplePage();
              }}
              type="number"
              value={simpleDraft}
            />
          )}
          <span aria-hidden="true">/</span>
          <span>{pageCount}</span>
        </div>
      );
    }

    return (
      <div
        className={classes("launch-ui-pagination-pages", resolvedClassNames.pages)}
        style={resolvedStyles.pages}
      >
        {pageItems.map((item) => {
          if (typeof item === "number") {
            const selected = item === current;
            return (
              <button
                aria-current={selected ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={classes(
                  "launch-ui-pagination-item",
                  selected && "is-selected",
                  resolvedClassNames.item,
                )}
                disabled={disabled}
                key={item}
                onClick={() => changePage(item)}
                style={resolvedStyles.item}
                title={showTitle ? `Page ${item}` : undefined}
                type="button"
              >
                {renderItemContent(item, "page", item)}
              </button>
            );
          }

          const jumpSize = showLessItems || isResponsiveSmall ? 3 : 5;
          const isBackward = item === "jump-prev";
          const target = current + (isBackward ? -jumpSize : jumpSize);
          const label = `Jump ${isBackward ? "backward" : "forward"} ${jumpSize} pages`;
          return (
            <button
              aria-label={label}
              className={classes(
                "launch-ui-pagination-item",
                "is-ellipsis",
                resolvedClassNames.ellipsis,
              )}
              disabled={disabled}
              key={item}
              onClick={() => changePage(target)}
              style={resolvedStyles.ellipsis}
              title={showTitle ? label : undefined}
              type="button"
            >
              <span aria-hidden="true">•••</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (hideOnSinglePage && pageCount <= 1) return null;

  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(total, current * pageSize);
  const normalizedOptions = Array.from(new Set([...pageSizeOptions, pageSize]))
    .filter((option) => option > 0)
    .sort((first, second) => first - second);
  const selectOptions: ReadonlyArray<SelectOption> = normalizedOptions.map((option) => ({
    label: `${option} / page`,
    value: String(option),
  }));
  const CustomSizeChanger = components?.sizeChanger;
  const sizeChangerConfig = typeof showSizeChanger === "object" ? showSizeChanger : undefined;

  return (
    <nav
      {...rootProps}
      aria-label={rootProps["aria-label"] ?? "Pagination"}
      className={classes(
        "launch-ui-pagination",
        `is-${align}`,
        `is-${resolvedSize}`,
        disabled && "is-disabled",
        isResponsiveSmall && "is-responsive-small",
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {showTotal !== undefined ? (
        <div
          className={classes("launch-ui-pagination-total", resolvedClassNames.total)}
          style={resolvedStyles.total}
        >
          {showTotal(total, [start, end])}
        </div>
      ) : null}
      {renderNavigationButton("prev")}
      {renderPages()}
      {renderNavigationButton("next")}
      {shouldShowSizeChanger ? (
        <div
          className={classes("launch-ui-pagination-options", resolvedClassNames.options)}
          style={resolvedStyles.options}
        >
          <div
            className={classes("launch-ui-pagination-size-changer", resolvedClassNames.sizeChanger)}
            style={resolvedStyles.sizeChanger}
          >
            {CustomSizeChanger !== undefined ? (
              <CustomSizeChanger
                disabled={disabled || sizeChangerConfig?.disabled === true}
                onChange={changePageSize}
                options={normalizedOptions}
                value={pageSize}
              />
            ) : (
              <Select
                ariaLabel="Items per page"
                {...(sizeChangerConfig?.className === undefined
                  ? {}
                  : { className: sizeChangerConfig.className })}
                disabled={disabled || sizeChangerConfig?.disabled === true}
                onValueChange={(value) => changePageSize(Number(value))}
                options={selectOptions}
                value={String(pageSize)}
              />
            )}
          </div>
        </div>
      ) : null}
      {showQuickJumper !== false ? (
        <div
          className={classes("launch-ui-pagination-quick-jumper", resolvedClassNames.quickJumper)}
          style={resolvedStyles.quickJumper}
        >
          <span>Go to</span>
          <Input
            aria-label="Page to jump to"
            className={classes(
              "launch-ui-pagination-quick-input",
              resolvedClassNames.quickJumperInput,
            )}
            disabled={disabled}
            inputMode="numeric"
            min={1}
            onChange={(event) => setQuickDraft(event.currentTarget.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") submitQuickJump();
            }}
            style={resolvedStyles.quickJumperInput}
            type="number"
            value={quickDraft}
          />
          <span>Page</span>
          {quickJumperConfig !== undefined ? (
            <button
              className="launch-ui-pagination-go-button"
              disabled={disabled}
              onClick={submitQuickJump}
              type="button"
            >
              {quickJumperConfig.goButton}
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
