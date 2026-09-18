import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type Key,
  type MouseEvent,
  type ReactNode,
} from "react";
import { type DropdownItem, DropdownMenu } from "../dropdown-menu/index.js";
import { classes } from "../internal/classes.js";
import { ChevronDownIcon } from "../internal/icons.js";

export type BreadcrumbSemanticName = "item" | "root" | "separator";
export type BreadcrumbClassNames = Partial<Record<BreadcrumbSemanticName, string>>;
export type BreadcrumbStyles = Partial<Record<BreadcrumbSemanticName, CSSProperties>>;
export type BreadcrumbParams = Readonly<Record<string, number | string>>;

export interface BreadcrumbMenuItem {
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly key: Key;
  readonly label: ReactNode;
  readonly onSelect?: () => void;
  readonly separatorBefore?: boolean;
}

export interface BreadcrumbMenu {
  readonly items: ReadonlyArray<BreadcrumbMenuItem>;
}

export interface BreadcrumbRouteItem {
  readonly children?: ReadonlyArray<BreadcrumbRouteItem>;
  readonly className?: string;
  readonly href?: string;
  readonly key?: Key;
  readonly menu?: BreadcrumbMenu;
  readonly onClick?: (event: MouseEvent<HTMLElement>) => void;
  readonly path?: string;
  readonly title: ReactNode;
  readonly type?: never;
}

export interface BreadcrumbSeparatorItem {
  readonly key?: Key;
  readonly separator?: ReactNode;
  readonly type: "separator";
}

export type BreadcrumbItem = BreadcrumbRouteItem | BreadcrumbSeparatorItem;

export type BreadcrumbItemRender = (
  route: BreadcrumbRouteItem,
  params: BreadcrumbParams,
  routes: ReadonlyArray<BreadcrumbRouteItem>,
  paths: ReadonlyArray<string>,
) => ReactNode;

export interface BreadcrumbProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "className"> {
  readonly className?: string;
  readonly classNames?:
    | BreadcrumbClassNames
    | ((info: { readonly props: BreadcrumbProps }) => BreadcrumbClassNames);
  readonly dropdownIcon?: ReactNode;
  readonly itemRender?: BreadcrumbItemRender;
  readonly items?: ReadonlyArray<BreadcrumbItem>;
  readonly params?: BreadcrumbParams;
  readonly routes?: ReadonlyArray<BreadcrumbRouteItem>;
  readonly separator?: ReactNode;
  readonly styles?:
    | BreadcrumbStyles
    | ((info: { readonly props: BreadcrumbProps }) => BreadcrumbStyles);
}

function replaceParams(value: string, params: BreadcrumbParams) {
  return value.replace(/:([A-Za-z0-9_]+)/g, (match, key: string) => {
    const replacement = params[key];
    return replacement === undefined ? match : encodeURIComponent(String(replacement));
  });
}

function normalizePath(path: string, params: BreadcrumbParams) {
  return replaceParams(path, params).replace(/^\/+|\/+$/g, "");
}

function resolveTitle(title: ReactNode, params: BreadcrumbParams) {
  if (typeof title !== "string") return title;
  return replaceParams(title, params);
}

function toDropdownItems(items: ReadonlyArray<BreadcrumbMenuItem>): ReadonlyArray<DropdownItem> {
  return items.map((item) => ({
    ...(item.danger === undefined ? {} : { danger: item.danger }),
    ...(item.disabled === undefined ? {} : { disabled: item.disabled }),
    id: String(item.key),
    label: item.label,
    ...(item.onSelect === undefined ? {} : { onSelect: item.onSelect }),
    ...(item.separatorBefore === undefined ? {} : { separatorBefore: item.separatorBefore }),
  }));
}

function routeChildrenToDropdownItems(
  items: ReadonlyArray<BreadcrumbRouteItem>,
  params: BreadcrumbParams,
  parentPaths: ReadonlyArray<string>,
): ReadonlyArray<DropdownItem> {
  return items.map((item, index) => {
    const path = item.path ? normalizePath(item.path, params) : undefined;
    const href =
      item.href !== undefined
        ? replaceParams(item.href, params)
        : path !== undefined
          ? `/${[...parentPaths, path].filter(Boolean).join("/")}`
          : undefined;
    const title = resolveTitle(item.title, params);
    return {
      id: String(item.key ?? item.href ?? item.path ?? index),
      label:
        href === undefined ? (
          title
        ) : (
          <a className="launch-ui-breadcrumb-menu-link" href={href}>
            {title}
          </a>
        ),
    };
  });
}

function isRouteItem(item: BreadcrumbItem): item is BreadcrumbRouteItem {
  return item.type !== "separator";
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(breadcrumbProps, ref) {
    const {
      "aria-label": ariaLabel = "Breadcrumb",
      className,
      classNames: classNamesProp,
      dropdownIcon = <ChevronDownIcon />,
      itemRender,
      items,
      params = {},
      routes,
      separator = "/",
      style,
      styles: stylesProp,
      ...props
    } = breadcrumbProps;
    const resolvedItems: ReadonlyArray<BreadcrumbItem> = items ?? routes ?? [];
    const routeItems = resolvedItems.filter(isRouteItem);
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: breadcrumbProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function"
        ? stylesProp({ props: breadcrumbProps })
        : (stylesProp ?? {});
    const paths: string[] = [];

    return (
      <nav
        {...props}
        aria-label={ariaLabel}
        className={classes("launch-ui-breadcrumb", resolvedClassNames.root, className)}
        ref={ref}
        style={{ ...resolvedStyles.root, ...style }}
      >
        <ol className="launch-ui-breadcrumb-list">
          {resolvedItems.map((item, index) => {
            if (item.type === "separator") {
              return (
                <li
                  aria-hidden="true"
                  className={classes(
                    "launch-ui-breadcrumb-separator",
                    resolvedClassNames.separator,
                  )}
                  key={item.key ?? `separator-${index}`}
                  style={resolvedStyles.separator}
                >
                  {item.separator ?? "/"}
                </li>
              );
            }

            if (item.path) paths.push(normalizePath(item.path, params));
            const previousItem = resolvedItems[index - 1];
            const showAutomaticSeparator =
              index > 0 &&
              previousItem?.type !== "separator" &&
              separator !== null &&
              separator !== "";
            const isLastRoute = item === routeItems.at(-1);
            const resolvedTitle = resolveTitle(item.title, params);
            const href =
              item.href !== undefined
                ? replaceParams(item.href, params)
                : item.path !== undefined
                  ? `/${paths.filter(Boolean).join("/")}`
                  : undefined;
            const defaultContent =
              href !== undefined ? (
                <a
                  aria-current={isLastRoute ? "page" : undefined}
                  className="launch-ui-breadcrumb-link"
                  href={href}
                  onClick={item.onClick}
                >
                  {resolvedTitle}
                </a>
              ) : item.onClick ? (
                <button
                  aria-current={isLastRoute ? "page" : undefined}
                  className="launch-ui-breadcrumb-button"
                  onClick={item.onClick}
                  type="button"
                >
                  {resolvedTitle}
                </button>
              ) : (
                <span
                  aria-current={isLastRoute ? "page" : undefined}
                  className="launch-ui-breadcrumb-label"
                >
                  {resolvedTitle}
                </span>
              );
            const content = itemRender?.(item, params, routeItems, [...paths]) ?? defaultContent;
            const dropdownItems = item.menu
              ? toDropdownItems(item.menu.items)
              : routeChildrenToDropdownItems(item.children ?? [], params, paths);
            const contentWithMenu =
              dropdownItems.length > 0 ? (
                <span className="launch-ui-breadcrumb-menu-trigger">
                  {content}
                  <DropdownMenu
                    align="start"
                    items={dropdownItems}
                    trigger={
                      <button
                        aria-label={
                          typeof resolvedTitle === "string"
                            ? `Open ${resolvedTitle} menu`
                            : "Open breadcrumb menu"
                        }
                        className="launch-ui-breadcrumb-menu-button"
                        type="button"
                      >
                        <span className="launch-ui-breadcrumb-dropdown-icon">{dropdownIcon}</span>
                      </button>
                    }
                  />
                </span>
              ) : (
                content
              );

            return (
              <li className="launch-ui-breadcrumb-entry" key={item.key ?? `item-${index}`}>
                {showAutomaticSeparator ? (
                  <span
                    aria-hidden="true"
                    className={classes(
                      "launch-ui-breadcrumb-separator",
                      resolvedClassNames.separator,
                    )}
                    style={resolvedStyles.separator}
                  >
                    {separator}
                  </span>
                ) : null}
                <span
                  className={classes(
                    "launch-ui-breadcrumb-item",
                    isLastRoute && "is-current",
                    item.className,
                    resolvedClassNames.item,
                  )}
                  style={resolvedStyles.item}
                >
                  {contentWithMenu}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  },
);
