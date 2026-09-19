import { CaretDownOutlined, CaretUpOutlined, FilterOutlined } from "@ant-design/icons";
import {
  Children,
  type CSSProperties,
  type HTMLAttributes,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
  useMemo,
  useState,
} from "react";
import { Button } from "../button/index.js";
import { Checkbox } from "../checkbox/index.js";
import { Dropdown, type DropdownMenuItem } from "../dropdown/index.js";
import { Flex } from "../flex/index.js";
import { classes } from "../internal/classes.js";
import { Pagination, type PaginationProps } from "../pagination/index.js";
import { Radio } from "../radio/index.js";
import { Typography } from "../typography/index.js";

export type TableSize = "large" | "medium" | "small";
export type TableSortOrder = "ascend" | "descend";
export type TableAction = "filter" | "paginate" | "sort";
export type TableSemanticName =
  | "body"
  | "cell"
  | "empty"
  | "header"
  | "pagination"
  | "root"
  | "row"
  | "table";
export type TableClassNames = Partial<Record<TableSemanticName, string>>;
export type TableStyles = Partial<Record<TableSemanticName, CSSProperties>>;
export type TableDataIndex<TRecord> = keyof TRecord | ReadonlyArray<number | string>;

export interface TableFilterItem {
  readonly children?: ReadonlyArray<TableFilterItem>;
  readonly text: ReactNode;
  readonly value: Key;
}

export interface TableColumn<TRecord extends object> {
  readonly align?: "center" | "left" | "right";
  readonly children?: ReadonlyArray<TableColumn<TRecord>>;
  readonly className?: string;
  readonly dataIndex?: TableDataIndex<TRecord>;
  readonly defaultFilteredValue?: ReadonlyArray<Key>;
  readonly defaultSortOrder?: TableSortOrder;
  readonly ellipsis?: boolean;
  readonly filteredValue?: ReadonlyArray<Key> | null;
  readonly filterMultiple?: boolean;
  readonly filters?: ReadonlyArray<TableFilterItem>;
  readonly key?: Key;
  readonly onFilter?: (value: Key, record: TRecord) => boolean;
  readonly render?: (value: unknown, record: TRecord, index: number) => ReactNode;
  readonly sorter?:
    | boolean
    | ((first: TRecord, second: TRecord) => number)
    | {
        readonly compare?: (first: TRecord, second: TRecord) => number;
        readonly multiple?: number;
      };
  readonly sortDirections?: ReadonlyArray<TableSortOrder>;
  readonly sortOrder?: TableSortOrder | null;
  readonly title?: ReactNode;
  readonly width?: number | string;
}

export interface TableRowSelection<TRecord extends object> {
  readonly columnTitle?: ReactNode;
  readonly defaultSelectedRowKeys?: ReadonlyArray<Key>;
  readonly getCheckboxProps?: (record: TRecord) => {
    readonly disabled?: boolean;
    readonly name?: string;
    readonly title?: string;
  };
  readonly onChange?: (selectedRowKeys: Key[], selectedRows: TRecord[]) => void;
  readonly onSelect?: (
    record: TRecord,
    selected: boolean,
    selectedRows: TRecord[],
    nativeEvent: Event,
  ) => void;
  readonly selectedRowKeys?: ReadonlyArray<Key>;
  readonly type?: "checkbox" | "radio";
}

export interface TablePaginationConfig extends Omit<PaginationProps, "total"> {
  readonly total?: number;
}

export interface TableSorterResult<TRecord extends object> {
  readonly column?: TableColumn<TRecord>;
  readonly columnKey?: Key;
  readonly field?: TableDataIndex<TRecord>;
  readonly order?: TableSortOrder;
}

export interface TablePaginationInfo {
  readonly current: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface TableChangeExtra<TRecord extends object> {
  readonly action: TableAction;
  readonly currentDataSource: ReadonlyArray<TRecord>;
}

export interface TableProps<TRecord extends object = Record<string, unknown>>
  extends Omit<TableHTMLAttributes<HTMLTableElement>, "children" | "onChange" | "title"> {
  readonly bordered?: boolean;
  readonly children?: ReactNode;
  readonly classNames?:
    | TableClassNames
    | ((info: { readonly props: TableProps<TRecord> }) => TableClassNames);
  readonly columns?: ReadonlyArray<TableColumn<TRecord>>;
  readonly containerClassName?: string;
  readonly containerStyle?: CSSProperties;
  readonly dataSource?: ReadonlyArray<TRecord>;
  readonly footer?: (currentPageData: ReadonlyArray<TRecord>) => ReactNode;
  readonly loading?: boolean;
  readonly locale?: { readonly emptyText?: ReactNode };
  readonly onChange?: (
    pagination: TablePaginationInfo,
    filters: Record<string, ReadonlyArray<Key> | null>,
    sorter: TableSorterResult<TRecord>,
    extra: TableChangeExtra<TRecord>,
  ) => void;
  readonly onRow?: (record: TRecord, index: number) => HTMLAttributes<HTMLTableRowElement>;
  readonly pagination?: false | TablePaginationConfig;
  readonly rowClassName?: string | ((record: TRecord, index: number) => string);
  readonly rowKey?: keyof TRecord | ((record: TRecord) => Key);
  readonly rowSelection?: TableRowSelection<TRecord>;
  readonly scroll?: { readonly x?: number | string | true; readonly y?: number };
  readonly showHeader?: boolean;
  readonly size?: TableSize;
  readonly sortDirections?: ReadonlyArray<TableSortOrder>;
  readonly styles?: TableStyles | ((info: { readonly props: TableProps<TRecord> }) => TableStyles);
  readonly title?: (currentPageData: ReadonlyArray<TRecord>) => ReactNode;
}

type TableColumnDefinitionProps<TRecord extends object> = TableColumn<TRecord>;

interface TableColumnGroupDefinitionProps<TRecord extends object>
  extends Omit<TableColumn<TRecord>, "children" | "dataIndex" | "render" | "sorter"> {
  readonly children?: ReactNode;
}

interface SortState {
  readonly key?: string;
  readonly order?: TableSortOrder;
}

interface HeaderCell<TRecord extends object> {
  readonly colSpan: number;
  readonly column: TableColumn<TRecord>;
  readonly key: string;
  readonly rowSpan: number;
}

function TableColumnDefinition<TRecord extends object>(
  _props: TableColumnDefinitionProps<TRecord>,
) {
  return null;
}

function TableColumnGroupDefinition<TRecord extends object>(
  _props: TableColumnGroupDefinitionProps<TRecord>,
) {
  return null;
}

function parseColumnChildren<TRecord extends object>(children: ReactNode): TableColumn<TRecord>[] {
  const parsed: TableColumn<TRecord>[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === TableColumnDefinition) {
      const props = child.props as TableColumnDefinitionProps<TRecord>;
      const key = props.key ?? child.key;
      parsed.push({ ...props, ...(key === null || key === undefined ? {} : { key }) });
      return;
    }
    if (child.type === TableColumnGroupDefinition) {
      const props = child.props as TableColumnGroupDefinitionProps<TRecord>;
      const key = props.key ?? child.key;
      parsed.push({
        ...props,
        children: parseColumnChildren<TRecord>(props.children),
        ...(key === null || key === undefined ? {} : { key }),
      });
    }
  });
  return parsed;
}

function flattenColumns<TRecord extends object>(
  columns: ReadonlyArray<TableColumn<TRecord>>,
): TableColumn<TRecord>[] {
  return columns.flatMap((column) =>
    column.children && column.children.length > 0 ? flattenColumns(column.children) : [column],
  );
}

function maxColumnDepth<TRecord extends object>(
  columns: ReadonlyArray<TableColumn<TRecord>>,
): number {
  return columns.reduce(
    (depth, column) =>
      Math.max(
        depth,
        column.children && column.children.length > 0 ? 1 + maxColumnDepth(column.children) : 1,
      ),
    1,
  );
}

function leafCount<TRecord extends object>(column: TableColumn<TRecord>): number {
  return column.children && column.children.length > 0
    ? column.children.reduce((count, child) => count + leafCount(child), 0)
    : 1;
}

function buildHeaderRows<TRecord extends object>(
  columns: ReadonlyArray<TableColumn<TRecord>>,
): HeaderCell<TRecord>[][] {
  const depth = maxColumnDepth(columns);
  const rows = Array.from({ length: depth }, () => [] as HeaderCell<TRecord>[]);
  const visit = (items: ReadonlyArray<TableColumn<TRecord>>, level: number, parentKey: string) => {
    items.forEach((column, index) => {
      const key = columnIdentifier(column, `${parentKey}-${index}`);
      const hasChildren = Boolean(column.children?.length);
      rows[level]?.push({
        colSpan: leafCount(column),
        column,
        key,
        rowSpan: hasChildren ? 1 : depth - level,
      });
      if (hasChildren) visit(column.children ?? [], level + 1, key);
    });
  };
  visit(columns, 0, "column");
  return rows;
}

function columnIdentifier<TRecord extends object>(column: TableColumn<TRecord>, fallback: string) {
  if (column.key !== undefined) return String(column.key);
  if (Array.isArray(column.dataIndex)) return column.dataIndex.join(".");
  if (column.dataIndex !== undefined) return String(column.dataIndex);
  return fallback;
}

function getRecordValue<TRecord extends object>(
  record: TRecord,
  dataIndex?: TableDataIndex<TRecord>,
) {
  if (dataIndex === undefined) return undefined;
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  return path.reduce<unknown>((value, part) => {
    if (value === null || value === undefined || typeof value !== "object") return undefined;
    return (value as Record<PropertyKey, unknown>)[part as PropertyKey];
  }, record);
}

function getRecordKey<TRecord extends object>(
  record: TRecord,
  index: number,
  rowKey?: TableProps<TRecord>["rowKey"],
) {
  if (typeof rowKey === "function") return rowKey(record);
  const candidate =
    rowKey === undefined ? (record as { readonly key?: unknown }).key : record[rowKey];
  return typeof candidate === "string" ||
    typeof candidate === "number" ||
    typeof candidate === "bigint"
    ? candidate
    : index;
}

function hasKey(keys: ReadonlyArray<Key>, key: Key) {
  return keys.some((candidate) => Object.is(candidate, key));
}

function flattenFilterItems(items: ReadonlyArray<TableFilterItem>): TableFilterItem[] {
  return items.flatMap((item) =>
    item.children && item.children.length > 0 ? flattenFilterItems(item.children) : [item],
  );
}

function filterMenuItems(items: ReadonlyArray<TableFilterItem>): DropdownMenuItem[] {
  return flattenFilterItems(items).map((item, index) => ({
    key: `${index}:${String(item.value)}`,
    label: item.text,
  }));
}

function filterValueForMenuKey(items: ReadonlyArray<TableFilterItem>, key: string) {
  const index = Number(key.split(":", 1)[0]);
  return flattenFilterItems(items)[index]?.value;
}

function menuKeyForFilterValue(items: ReadonlyArray<TableFilterItem>, value: Key) {
  const index = flattenFilterItems(items).findIndex((item) => Object.is(item.value, value));
  return index < 0 ? undefined : `${index}:${String(value)}`;
}

function initialFilters<TRecord extends object>(columns: ReadonlyArray<TableColumn<TRecord>>) {
  const entries = flattenColumns(columns).flatMap((column, index) =>
    column.defaultFilteredValue === undefined
      ? []
      : [[columnIdentifier(column, `column-${index}`), column.defaultFilteredValue] as const],
  );
  return Object.fromEntries(entries) as Record<string, ReadonlyArray<Key>>;
}

function initialSort<TRecord extends object>(
  columns: ReadonlyArray<TableColumn<TRecord>>,
): SortState {
  const column = flattenColumns(columns).find((candidate) => candidate.defaultSortOrder);
  return column?.defaultSortOrder
    ? { key: columnIdentifier(column, "column"), order: column.defaultSortOrder }
    : {};
}

function resolveSortOrder<TRecord extends object>(
  column: TableColumn<TRecord>,
  key: string,
  sort: SortState,
) {
  return column.sortOrder ?? (sort.key === key ? sort.order : undefined);
}

function processRows<TRecord extends object>(
  data: ReadonlyArray<TRecord>,
  columns: ReadonlyArray<TableColumn<TRecord>>,
  filterState: Record<string, ReadonlyArray<Key>>,
  sort: SortState,
) {
  const leaves = flattenColumns(columns);
  const filtered = data.filter((record) =>
    leaves.every((column, index) => {
      const key = columnIdentifier(column, `column-${index}`);
      const selected = column.filteredValue ?? filterState[key] ?? [];
      if (selected.length === 0 || !column.onFilter) return true;
      return selected.some((value) => column.onFilter?.(value, record));
    }),
  );
  const sortColumn = leaves.find((column, index) => {
    const key = columnIdentifier(column, `column-${index}`);
    return resolveSortOrder(column, key, sort) !== undefined;
  });
  if (!sortColumn) return filtered;
  const sortIndex = leaves.indexOf(sortColumn);
  const key = columnIdentifier(sortColumn, `column-${sortIndex}`);
  const order = resolveSortOrder(sortColumn, key, sort);
  const compare =
    typeof sortColumn.sorter === "function"
      ? sortColumn.sorter
      : typeof sortColumn.sorter === "object"
        ? sortColumn.sorter.compare
        : undefined;
  if (!compare || !order) return filtered;
  return [...filtered].sort((first, second) => {
    const result = compare(first, second);
    return order === "descend" ? -result : result;
  });
}

function SortIcons({ order }: { readonly order: TableSortOrder | undefined }) {
  return (
    <span aria-hidden="true" className="launch-ui-table-sort-icons">
      <CaretUpOutlined className={order === "ascend" ? "is-active" : undefined} />
      <CaretDownOutlined className={order === "descend" ? "is-active" : undefined} />
    </span>
  );
}

function TableInner<TRecord extends object = Record<string, unknown>>(
  tableProps: TableProps<TRecord>,
) {
  const {
    bordered = false,
    children,
    className,
    classNames: classNamesProp,
    columns: columnsProp,
    containerClassName,
    containerStyle,
    dataSource = [],
    footer,
    loading = false,
    locale,
    onChange,
    onRow,
    pagination = {},
    rowClassName,
    rowKey,
    rowSelection,
    scroll,
    showHeader = true,
    size = "medium",
    sortDirections = ["ascend", "descend"],
    style,
    styles: stylesProp,
    title,
    ...nativeTableProps
  } = tableProps;
  const childColumns = useMemo(() => parseColumnChildren<TRecord>(children), [children]);
  const columns = columnsProp ?? childColumns;
  const leaves = useMemo(() => flattenColumns(columns), [columns]);
  const headerRows = useMemo(() => buildHeaderRows(columns), [columns]);
  const dataMode = columnsProp !== undefined || childColumns.length > 0;
  const [filterState, setFilterState] = useState<Record<string, ReadonlyArray<Key>>>(() =>
    initialFilters(columns),
  );
  const [sortState, setSortState] = useState<SortState>(() => initialSort(columns));
  const paginationConfig = pagination === false ? undefined : pagination;
  const [currentPage, setCurrentPage] = useState(paginationConfig?.defaultCurrent ?? 1);
  const [pageSize, setPageSize] = useState(paginationConfig?.defaultPageSize ?? 10);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<ReadonlyArray<Key>>(
    rowSelection?.defaultSelectedRowKeys ?? [],
  );
  const selectedKeys = rowSelection?.selectedRowKeys ?? internalSelectedKeys;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: tableProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: tableProps }) : (stylesProp ?? {});
  const processedRows = useMemo(
    () => processRows(dataSource, columns, filterState, sortState),
    [columns, dataSource, filterState, sortState],
  );
  const resolvedPageSize = paginationConfig?.pageSize ?? pageSize;
  const resolvedCurrent = paginationConfig?.current ?? currentPage;
  const total = paginationConfig?.total ?? processedRows.length;
  const pageStart = paginationConfig ? Math.max(0, (resolvedCurrent - 1) * resolvedPageSize) : 0;
  const pageRows = paginationConfig
    ? processedRows.slice(pageStart, pageStart + resolvedPageSize)
    : processedRows;
  const sorterInfo = (sort = sortState): TableSorterResult<TRecord> => {
    const columnIndex = leaves.findIndex(
      (column, index) => columnIdentifier(column, `column-${index}`) === sort.key,
    );
    const column = leaves[columnIndex];
    return column && sort.order
      ? {
          column,
          ...(column.key === undefined && sort.key === undefined
            ? {}
            : { columnKey: column.key ?? sort.key }),
          ...(column.dataIndex === undefined ? {} : { field: column.dataIndex }),
          order: sort.order,
        }
      : {};
  };

  const emitChange = (
    action: TableAction,
    nextPage = resolvedCurrent,
    nextPageSize = resolvedPageSize,
    nextFilters = filterState,
    nextSort = sortState,
  ) => {
    const currentDataSource = processRows(dataSource, columns, nextFilters, nextSort);
    onChange?.(
      { current: nextPage, pageSize: nextPageSize, total: currentDataSource.length },
      Object.fromEntries(
        leaves.map((column, index) => {
          const key = columnIdentifier(column, `column-${index}`);
          const values = column.filteredValue ?? nextFilters[key];
          return [key, values && values.length > 0 ? values : null];
        }),
      ),
      sorterInfo(nextSort),
      { action, currentDataSource },
    );
  };

  const changeSort = (column: TableColumn<TRecord>, key: string) => {
    const directions = column.sortDirections ?? sortDirections;
    const currentOrder = resolveSortOrder(column, key, sortState);
    const currentIndex = currentOrder ? directions.indexOf(currentOrder) : -1;
    const nextOrder = directions[currentIndex + 1];
    const nextSort = nextOrder ? { key, order: nextOrder } : {};
    if (column.sortOrder === undefined) setSortState(nextSort);
    if (paginationConfig?.current === undefined) setCurrentPage(1);
    emitChange("sort", 1, resolvedPageSize, filterState, nextSort);
  };

  const changeFilter = (
    column: TableColumn<TRecord>,
    key: string,
    value: Key,
    selected: boolean,
  ) => {
    const current = column.filteredValue ?? filterState[key] ?? [];
    const nextValues =
      column.filterMultiple === false
        ? selected
          ? [value]
          : []
        : selected
          ? [...current.filter((item) => !Object.is(item, value)), value]
          : current.filter((item) => !Object.is(item, value));
    const nextFilters = { ...filterState, [key]: nextValues };
    if (column.filteredValue === undefined) setFilterState(nextFilters);
    if (paginationConfig?.current === undefined) setCurrentPage(1);
    emitChange("filter", 1, resolvedPageSize, nextFilters, sortState);
  };

  const selectedRowsFor = (keys: ReadonlyArray<Key>) =>
    dataSource.filter((record, index) => hasKey(keys, getRecordKey(record, index, rowKey)));

  const updateSelection = (keys: ReadonlyArray<Key>) => {
    if (rowSelection?.selectedRowKeys === undefined) setInternalSelectedKeys(keys);
    rowSelection?.onChange?.([...keys], selectedRowsFor(keys));
  };

  const changeRowSelection = (record: TRecord, index: number, selected: boolean, event: Event) => {
    if (!rowSelection) return;
    const key = getRecordKey(record, index, rowKey);
    const nextKeys =
      rowSelection.type === "radio"
        ? selected
          ? [key]
          : []
        : selected
          ? [...selectedKeys.filter((item) => !Object.is(item, key)), key]
          : selectedKeys.filter((item) => !Object.is(item, key));
    updateSelection(nextKeys);
    rowSelection.onSelect?.(record, selected, selectedRowsFor(nextKeys), event);
  };

  const changePage = (nextPage: number, nextPageSize: number) => {
    if (paginationConfig?.current === undefined) setCurrentPage(nextPage);
    if (paginationConfig?.pageSize === undefined) setPageSize(nextPageSize);
    paginationConfig?.onChange?.(nextPage, nextPageSize);
    emitChange("paginate", nextPage, nextPageSize);
  };

  const renderHeaderContent = (column: TableColumn<TRecord>, key: string) => {
    const order = resolveSortOrder(column, key, sortState);
    const selectedFilters = column.filteredValue ?? filterState[key] ?? [];
    const filterItems = column.filters ?? [];
    const selectedMenuKeys = selectedFilters
      .map((value) => menuKeyForFilterValue(filterItems, value))
      .filter((value): value is string => value !== undefined);
    return (
      <Flex align="center" gap="small" justify="space-between">
        {column.sorter ? (
          <Button
            className="launch-ui-table-sort-button"
            icon={<SortIcons order={order} />}
            iconPlacement="end"
            onClick={() => changeSort(column, key)}
            size="small"
            variant="text"
          >
            {column.title}
          </Button>
        ) : (
          <span>{column.title}</span>
        )}
        {filterItems.length > 0 ? (
          <Dropdown
            menu={{
              items: filterMenuItems(filterItems),
              onDeselect: ({ key: menuKey }) => {
                const value = filterValueForMenuKey(filterItems, menuKey);
                if (value !== undefined) changeFilter(column, key, value, false);
              },
              onSelect: ({ key: menuKey }) => {
                const value = filterValueForMenuKey(filterItems, menuKey);
                if (value !== undefined) changeFilter(column, key, value, true);
              },
              selectable: true,
              selectedKeys: selectedMenuKeys,
            }}
            trigger={["click"]}
          >
            <Button
              aria-label={`Filter ${typeof column.title === "string" ? column.title : "column"}`}
              color={selectedFilters.length > 0 ? "primary" : "default"}
              icon={<FilterOutlined />}
              iconOnly
              size="small"
              variant="text"
            />
          </Dropdown>
        ) : null}
      </Flex>
    );
  };

  const changeablePageRows = pageRows
    .map((record, index) => ({
      disabled: rowSelection?.getCheckboxProps?.(record).disabled === true,
      key: getRecordKey(record, pageStart + index, rowKey),
    }))
    .filter((item) => !item.disabled);
  const allPageRowsSelected =
    changeablePageRows.length > 0 &&
    changeablePageRows.every(({ key }) => hasKey(selectedKeys, key));
  const somePageRowsSelected = changeablePageRows.some(({ key }) => hasKey(selectedKeys, key));

  const tableNode = (
    <table
      {...nativeTableProps}
      className={classes(
        "launch-ui-table",
        `is-${size}`,
        bordered && "is-bordered",
        resolvedClassNames.table,
        className,
      )}
      style={{ ...resolvedStyles.table, ...style }}
    >
      {dataMode && leaves.some((column) => column.width !== undefined) ? (
        <colgroup>
          {rowSelection ? <col className="launch-ui-table-selection-column" /> : null}
          {leaves.map((column, index) => (
            <col
              key={columnIdentifier(column, `column-${index}`)}
              style={column.width === undefined ? undefined : { width: column.width }}
            />
          ))}
        </colgroup>
      ) : null}
      {dataMode && showHeader ? (
        <thead className={resolvedClassNames.header} style={resolvedStyles.header}>
          {headerRows.map((headerRow, rowIndex) => (
            <tr key={headerRow.map((cell) => cell.key).join("|") || "header"}>
              {rowSelection && rowIndex === 0 ? (
                <th
                  className={classes("launch-ui-table-selection-cell", resolvedClassNames.cell)}
                  rowSpan={headerRows.length}
                  style={resolvedStyles.cell}
                >
                  {rowSelection.type === "radio" ? (
                    rowSelection.columnTitle
                  ) : (
                    <Checkbox
                      aria-label="Select all rows on this page"
                      checked={allPageRowsSelected}
                      indeterminate={!allPageRowsSelected && somePageRowsSelected}
                      onChange={(event) => {
                        const pageKeys = changeablePageRows.map(({ key }) => key);
                        const nextKeys = event.target.checked
                          ? [...selectedKeys.filter((key) => !hasKey(pageKeys, key)), ...pageKeys]
                          : selectedKeys.filter((key) => !hasKey(pageKeys, key));
                        updateSelection(nextKeys);
                      }}
                    />
                  )}
                </th>
              ) : null}
              {headerRow.map(({ colSpan, column, key, rowSpan }) => (
                <th
                  className={classes(column.className, resolvedClassNames.cell)}
                  colSpan={colSpan}
                  key={key}
                  rowSpan={rowSpan}
                  style={{ textAlign: column.align, ...resolvedStyles.cell }}
                >
                  {column.children?.length ? column.title : renderHeaderContent(column, key)}
                </th>
              ))}
            </tr>
          ))}
        </thead>
      ) : null}
      {dataMode ? (
        <tbody className={resolvedClassNames.body} style={resolvedStyles.body}>
          {pageRows.length > 0 ? (
            pageRows.map((record, pageIndex) => {
              const dataIndex = pageStart + pageIndex;
              const key = getRecordKey(record, dataIndex, rowKey);
              const rowProps = onRow?.(record, dataIndex) ?? {};
              const customRowClass =
                typeof rowClassName === "function" ? rowClassName(record, dataIndex) : rowClassName;
              const selectionProps = rowSelection?.getCheckboxProps?.(record) ?? {};
              return (
                <tr
                  {...rowProps}
                  className={classes(
                    hasKey(selectedKeys, key) && "is-selected",
                    resolvedClassNames.row,
                    customRowClass,
                    rowProps.className,
                  )}
                  key={key}
                  style={{ ...resolvedStyles.row, ...rowProps.style }}
                >
                  {rowSelection ? (
                    <td
                      className={classes("launch-ui-table-selection-cell", resolvedClassNames.cell)}
                      style={resolvedStyles.cell}
                    >
                      {rowSelection.type === "radio" ? (
                        <Radio
                          aria-label={`Select row ${dataIndex + 1}`}
                          checked={hasKey(selectedKeys, key)}
                          {...(selectionProps.disabled === undefined
                            ? {}
                            : { disabled: selectionProps.disabled })}
                          {...(selectionProps.name === undefined
                            ? {}
                            : { name: selectionProps.name })}
                          onChange={(event) =>
                            changeRowSelection(
                              record,
                              dataIndex,
                              event.target.checked,
                              event.nativeEvent.nativeEvent,
                            )
                          }
                          value={String(key)}
                        />
                      ) : (
                        <Checkbox
                          aria-label={`Select row ${dataIndex + 1}`}
                          checked={hasKey(selectedKeys, key)}
                          {...(selectionProps.disabled === undefined
                            ? {}
                            : { disabled: selectionProps.disabled })}
                          {...(selectionProps.name === undefined
                            ? {}
                            : { name: selectionProps.name })}
                          onChange={(event) =>
                            changeRowSelection(
                              record,
                              dataIndex,
                              event.target.checked,
                              event.nativeEvent,
                            )
                          }
                          {...(selectionProps.title === undefined
                            ? {}
                            : { title: selectionProps.title })}
                          value={String(key)}
                        />
                      )}
                    </td>
                  ) : null}
                  {leaves.map((column, columnIndex) => {
                    const value = getRecordValue(record, column.dataIndex);
                    return (
                      <td
                        className={classes(
                          column.ellipsis && "is-ellipsis",
                          column.className,
                          resolvedClassNames.cell,
                        )}
                        key={columnIdentifier(column, `column-${columnIndex}`)}
                        style={{ textAlign: column.align, ...resolvedStyles.cell }}
                        title={column.ellipsis && typeof value === "string" ? value : undefined}
                      >
                        {column.render
                          ? column.render(value, record, dataIndex)
                          : (value as ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                className={classes("launch-ui-table-empty", resolvedClassNames.empty)}
                colSpan={leaves.length + (rowSelection ? 1 : 0)}
                style={resolvedStyles.empty}
              >
                <Typography.Text type="secondary">{locale?.emptyText ?? "No data"}</Typography.Text>
              </td>
            </tr>
          )}
        </tbody>
      ) : (
        children
      )}
    </table>
  );

  return (
    <div
      className={classes("launch-ui-table-root", resolvedClassNames.root, containerClassName)}
      style={{ ...resolvedStyles.root, ...containerStyle }}
    >
      {dataMode && title ? <div className="launch-ui-table-title">{title(pageRows)}</div> : null}
      <div
        className={classes("launch-ui-table-wrap", scroll?.y !== undefined && "has-scroll-y")}
        style={{
          ...(scroll?.y === undefined ? {} : { maxHeight: scroll.y, overflowY: "auto" }),
          ...(scroll?.x === undefined ? {} : { overflowX: "auto" }),
        }}
      >
        {tableNode}
        {dataMode && loading ? (
          <div className="launch-ui-table-loading">
            <Typography.Text>Loading…</Typography.Text>
          </div>
        ) : null}
      </div>
      {dataMode && footer ? <div className="launch-ui-table-footer">{footer(pageRows)}</div> : null}
      {dataMode && paginationConfig ? (
        <div
          className={classes("launch-ui-table-pagination", resolvedClassNames.pagination)}
          style={resolvedStyles.pagination}
        >
          <Pagination
            {...paginationConfig}
            current={resolvedCurrent}
            onChange={changePage}
            pageSize={resolvedPageSize}
            total={total}
          />
        </div>
      ) : null}
    </div>
  );
}

type TableComponent = (<TRecord extends object = Record<string, unknown>>(
  props: TableProps<TRecord>,
) => ReactElement) & {
  readonly Column: typeof TableColumnDefinition;
  readonly ColumnGroup: typeof TableColumnGroupDefinition;
};

export const Table = Object.assign(TableInner, {
  Column: TableColumnDefinition,
  ColumnGroup: TableColumnGroupDefinition,
}) as TableComponent;
