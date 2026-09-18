import {
  type CSSProperties,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
} from "react";
import { Dropdown, type DropdownMenuItem, type DropdownPlacement } from "../dropdown/index.js";
import { classes } from "../internal/classes.js";
import { Tooltip, type TooltipProps } from "../tooltip/index.js";

export type MenuMode = "horizontal" | "inline" | "vertical";
export type MenuTheme = "dark" | "light";
export type MenuSemanticName =
  | "divider"
  | "expandIcon"
  | "group"
  | "groupTitle"
  | "item"
  | "itemExtra"
  | "itemIcon"
  | "itemLabel"
  | "root"
  | "subMenu"
  | "subMenuList"
  | "subMenuTitle";
export type MenuClassNames = Partial<Record<MenuSemanticName, string>>;
export type MenuStyles = Partial<Record<MenuSemanticName, CSSProperties>>;

export interface MenuItemType {
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly extra?: ReactNode;
  readonly icon?: ReactNode;
  readonly key: string;
  readonly label: ReactNode;
  readonly title?: string;
  readonly type?: "item";
}

export interface SubMenuType {
  readonly children: ReadonlyArray<MenuItem>;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly key: string;
  readonly label: ReactNode;
  readonly onTitleClick?: (info: {
    readonly domEvent: ReactMouseEvent<HTMLButtonElement>;
    readonly key: string;
  }) => void;
  readonly popupClassName?: string;
  readonly popupRender?: MenuPopupRender;
  readonly theme?: MenuTheme;
  readonly title?: string;
  readonly type?: "submenu";
}

export interface MenuItemGroupType {
  readonly children: ReadonlyArray<MenuItem>;
  readonly key?: string;
  readonly label: ReactNode;
  readonly type: "group";
}

export interface MenuDividerType {
  readonly dashed?: boolean;
  readonly key?: string;
  readonly type: "divider";
}

export type MenuItem = MenuDividerType | MenuItemGroupType | MenuItemType | SubMenuType;
export type MenuDomEvent = Event | ReactKeyboardEvent<HTMLElement> | ReactMouseEvent<HTMLElement>;

export interface MenuClickInfo {
  readonly domEvent: MenuDomEvent;
  readonly itemData: MenuItemType;
  readonly key: string;
  readonly keyPath: ReadonlyArray<string>;
}

export interface MenuSelectInfo extends MenuClickInfo {
  readonly selectedKeys: ReadonlyArray<string>;
}

export interface MenuPopupRenderInfo {
  readonly item: SubMenuType;
  readonly keys: ReadonlyArray<string>;
}

export type MenuPopupRender = (node: ReactElement, info: MenuPopupRenderInfo) => ReactNode;

export interface MenuExpandIconProps {
  readonly isSubMenu: true;
  readonly item: SubMenuType;
  readonly open: boolean;
}

export interface MenuTooltipConfig {
  readonly placement?: TooltipProps["placement"];
}

export interface MenuProps extends Omit<HTMLAttributes<HTMLUListElement>, "onClick" | "onSelect"> {
  readonly classNames?: MenuClassNames | ((info: { readonly props: MenuProps }) => MenuClassNames);
  readonly defaultOpenKeys?: ReadonlyArray<string>;
  readonly defaultSelectedKeys?: ReadonlyArray<string>;
  readonly expandIcon?: ReactNode | ((props: MenuExpandIconProps) => ReactNode);
  readonly inlineCollapsed?: boolean;
  readonly inlineIndent?: number;
  readonly items?: ReadonlyArray<MenuItem>;
  readonly mode?: MenuMode;
  readonly multiple?: boolean;
  readonly onClick?: (info: MenuClickInfo) => void;
  readonly onDeselect?: (info: MenuSelectInfo) => void;
  readonly onOpenChange?: (openKeys: ReadonlyArray<string>) => void;
  readonly onSelect?: (info: MenuSelectInfo) => void;
  readonly openKeys?: ReadonlyArray<string>;
  readonly popupRender?: MenuPopupRender;
  readonly selectable?: boolean;
  readonly selectedKeys?: ReadonlyArray<string>;
  readonly styles?: MenuStyles | ((info: { readonly props: MenuProps }) => MenuStyles);
  readonly theme?: MenuTheme;
  readonly tooltip?: false | MenuTooltipConfig;
  readonly triggerSubMenuAction?: "click" | "hover";
}

function MenuChevron() {
  return (
    <svg aria-hidden="true" className="launch-ui-navigation-menu-chevron" viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function hasChildren(item: MenuItem): item is SubMenuType {
  return item.type !== "divider" && item.type !== "group" && "children" in item;
}

export function Menu(menuProps: MenuProps) {
  const {
    className,
    classNames: classNamesProp,
    defaultOpenKeys = [],
    defaultSelectedKeys = [],
    expandIcon,
    inlineCollapsed = false,
    inlineIndent = 24,
    items = [],
    mode = "vertical",
    multiple = false,
    onClick,
    onDeselect,
    onOpenChange,
    onSelect,
    openKeys: controlledOpenKeys,
    popupRender,
    selectable = true,
    selectedKeys: controlledSelectedKeys,
    style,
    styles: stylesProp,
    theme = "light",
    tooltip,
    triggerSubMenuAction = "hover",
    ...rootProps
  } = menuProps;
  const [internalOpenKeys, setInternalOpenKeys] = useState<ReadonlyArray<string>>(defaultOpenKeys);
  const [internalSelectedKeys, setInternalSelectedKeys] =
    useState<ReadonlyArray<string>>(defaultSelectedKeys);
  const openKeys = controlledOpenKeys ?? internalOpenKeys;
  const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: menuProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: menuProps }) : (stylesProp ?? {});
  const isCollapsed = mode === "inline" && inlineCollapsed;
  const rendersInline = mode === "inline" && !isCollapsed;

  const updateOpenKeys = (nextKeys: ReadonlyArray<string>) => {
    if (controlledOpenKeys === undefined) setInternalOpenKeys(nextKeys);
    onOpenChange?.(nextKeys);
  };

  const setSubMenuOpen = (key: string, open: boolean) => {
    const isOpen = openKeys.includes(key);
    if (open === isOpen) return;
    updateOpenKeys(open ? [...openKeys, key] : openKeys.filter((openKey) => openKey !== key));
  };

  const activateItem = (
    item: MenuItemType,
    keyPath: ReadonlyArray<string>,
    domEvent: MenuDomEvent,
  ) => {
    const info: MenuClickInfo = { domEvent, itemData: item, key: item.key, keyPath };
    onClick?.(info);
    if (!selectable) return;

    const isSelected = selectedKeys.includes(item.key);
    let nextSelectedKeys = selectedKeys;
    if (multiple) {
      nextSelectedKeys = isSelected
        ? selectedKeys.filter((key) => key !== item.key)
        : [...selectedKeys, item.key];
    } else if (!isSelected || selectedKeys.length !== 1) {
      nextSelectedKeys = [item.key];
    }

    if (controlledSelectedKeys === undefined) setInternalSelectedKeys(nextSelectedKeys);
    const selectInfo: MenuSelectInfo = { ...info, selectedKeys: nextSelectedKeys };
    if (multiple && isSelected) onDeselect?.(selectInfo);
    else onSelect?.(selectInfo);
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    item: MenuItemType,
    keyPath: ReadonlyArray<string>,
  ) => {
    if (item.disabled || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    activateItem(item, keyPath, event);
  };

  const renderExpandIcon = (item: SubMenuType, open: boolean) => {
    const icon =
      typeof expandIcon === "function"
        ? expandIcon({ isSubMenu: true, item, open })
        : (expandIcon ?? <MenuChevron />);
    return (
      <span
        className={classes(
          "launch-ui-navigation-menu-expand-icon",
          open && "is-open",
          resolvedClassNames.expandIcon,
        )}
        style={resolvedStyles.expandIcon}
      >
        {icon}
      </span>
    );
  };

  const renderItemParts = (item: MenuItemType | SubMenuType, hideText = false) => (
    <>
      {item.icon !== undefined ? (
        <span
          className={classes("launch-ui-navigation-menu-item-icon", resolvedClassNames.itemIcon)}
          style={resolvedStyles.itemIcon}
        >
          {item.icon}
        </span>
      ) : null}
      <span
        className={classes(
          "launch-ui-navigation-menu-item-label",
          hideText && "is-hidden",
          resolvedClassNames.itemLabel,
        )}
        style={resolvedStyles.itemLabel}
      >
        {item.label}
      </span>
      {"extra" in item && item.extra !== undefined && !hideText ? (
        <span
          className={classes("launch-ui-navigation-menu-item-extra", resolvedClassNames.itemExtra)}
          style={resolvedStyles.itemExtra}
        >
          {item.extra}
        </span>
      ) : null}
    </>
  );

  const mapPopupItems = (
    childItems: ReadonlyArray<MenuItem>,
    parentPath: ReadonlyArray<string>,
  ): ReadonlyArray<DropdownMenuItem> =>
    childItems.map((item, index) => {
      if (item.type === "divider") {
        return { key: item.key ?? `divider-${index}`, type: "divider" };
      }
      if (item.type === "group") {
        return {
          children: mapPopupItems(item.children, parentPath),
          key: item.key ?? `group-${index}`,
          label: item.label,
          type: "group",
        };
      }
      const keyPath = [item.key, ...parentPath];
      return {
        ...(hasChildren(item) ? { children: mapPopupItems(item.children, keyPath) } : {}),
        ...(item.disabled === undefined ? {} : { disabled: item.disabled }),
        ...(item.icon === undefined ? {} : { icon: item.icon }),
        key: item.key,
        label: (
          <span
            className={classes(
              "launch-ui-navigation-menu-popup-label",
              selectedKeys.includes(item.key) && "is-selected",
            )}
          >
            {item.label}
          </span>
        ),
        ...(!hasChildren(item) && item.danger ? { danger: true } : {}),
        ...(!hasChildren(item) && item.extra !== undefined ? { extra: item.extra } : {}),
        ...(!hasChildren(item)
          ? {
              onClick: ({ domEvent }: { readonly domEvent: Event }) =>
                activateItem(item, keyPath, domEvent),
            }
          : {}),
      };
    });

  const renderPopupSubMenu = (
    item: SubMenuType,
    parentPath: ReadonlyArray<string>,
    level: number,
  ) => {
    const isOpen = openKeys.includes(item.key);
    const keyPath = [item.key, ...parentPath];
    const placement: DropdownPlacement = mode === "horizontal" ? "bottomLeft" : "rightTop";
    const trigger = (
      <button
        className={classes(
          "launch-ui-navigation-menu-item",
          "launch-ui-navigation-menu-submenu-title",
          isOpen && "is-open",
          resolvedClassNames.item,
          resolvedClassNames.subMenuTitle,
        )}
        disabled={item.disabled}
        onClick={(event) => item.onTitleClick?.({ domEvent: event, key: item.key })}
        style={
          {
            "--launch-ui-menu-level": level,
            "--launch-ui-menu-indent": `${inlineIndent}px`,
            ...resolvedStyles.item,
            ...resolvedStyles.subMenuTitle,
          } as CSSProperties
        }
        title={isCollapsed ? item.title : undefined}
        type="button"
      >
        {renderItemParts(item, isCollapsed)}
        {!isCollapsed ? renderExpandIcon(item, isOpen) : null}
      </button>
    );
    const menuNode = (
      <div className="launch-ui-navigation-menu-popup-placeholder" />
    ) as ReactElement;
    const resolvedPopupRender = item.popupRender ?? popupRender;

    return (
      <li
        className={classes(
          "launch-ui-navigation-menu-submenu",
          item.disabled && "is-disabled",
          resolvedClassNames.subMenu,
        )}
        key={item.key}
        role="none"
        style={resolvedStyles.subMenu}
      >
        <Dropdown
          classNames={{
            root: classes(
              "launch-ui-navigation-menu-popup",
              `is-${item.theme ?? theme}`,
              item.popupClassName,
            ),
          }}
          menu={{ items: mapPopupItems(item.children, keyPath) }}
          onOpenChange={(nextOpen) => setSubMenuOpen(item.key, nextOpen)}
          open={isOpen}
          placement={placement}
          {...(resolvedPopupRender === undefined
            ? {}
            : {
                popupRender: (node: ReactNode) =>
                  resolvedPopupRender(isValidElement(node) ? node : menuNode, {
                    item,
                    keys: keyPath,
                  }),
              })}
          trigger={[triggerSubMenuAction]}
        >
          {trigger}
        </Dropdown>
      </li>
    );
  };

  const renderLeaf = (item: MenuItemType, parentPath: ReadonlyArray<string>, level: number) => {
    const keyPath = [item.key, ...parentPath];
    const isSelected = selectedKeys.includes(item.key);
    const leaf = (
      <li key={item.key} role="none">
        <div
          aria-current={selectable && isSelected ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          className={classes(
            "launch-ui-navigation-menu-item",
            isSelected && "is-selected",
            item.disabled && "is-disabled",
            item.danger && "is-danger",
            resolvedClassNames.item,
          )}
          onClick={(event) => {
            if (!item.disabled) activateItem(item, keyPath, event);
          }}
          onKeyDown={(event) => handleItemKeyDown(event, item, keyPath)}
          role="menuitem"
          style={
            {
              "--launch-ui-menu-level": level,
              "--launch-ui-menu-indent": `${inlineIndent}px`,
              ...resolvedStyles.item,
            } as CSSProperties
          }
          tabIndex={item.disabled ? -1 : 0}
          title={isCollapsed ? item.title : undefined}
        >
          {renderItemParts(item, isCollapsed)}
        </div>
      </li>
    );

    if (!isCollapsed || tooltip === false) return leaf;
    return (
      <Tooltip
        key={item.key}
        placement={tooltip?.placement ?? "right"}
        title={item.title ?? item.label}
      >
        {leaf}
      </Tooltip>
    );
  };

  const renderItems = (
    menuItems: ReadonlyArray<MenuItem>,
    parentPath: ReadonlyArray<string> = [],
    level = 0,
  ): ReactNode =>
    menuItems.map((item, index) => {
      if (item.type === "divider") {
        return (
          <li key={item.key ?? `divider-${index}`} role="none">
            <hr
              className={classes(
                "launch-ui-navigation-menu-divider",
                item.dashed && "is-dashed",
                resolvedClassNames.divider,
              )}
              style={resolvedStyles.divider}
            />
          </li>
        );
      }

      if (item.type === "group") {
        return (
          <li
            className={classes("launch-ui-navigation-menu-group", resolvedClassNames.group)}
            key={item.key ?? `group-${index}`}
            role="none"
            style={resolvedStyles.group}
          >
            <div
              className={classes(
                "launch-ui-navigation-menu-group-title",
                resolvedClassNames.groupTitle,
              )}
              style={resolvedStyles.groupTitle}
            >
              {item.label}
            </div>
            <ul className="launch-ui-navigation-menu-group-list">
              {renderItems(item.children, parentPath, level)}
            </ul>
          </li>
        );
      }

      if (!hasChildren(item)) return renderLeaf(item, parentPath, level);
      if (!rendersInline) return renderPopupSubMenu(item, parentPath, level);

      const isOpen = openKeys.includes(item.key);
      const keyPath = [item.key, ...parentPath];
      return (
        <li
          className={classes(
            "launch-ui-navigation-menu-submenu",
            isOpen && "is-open",
            item.disabled && "is-disabled",
            resolvedClassNames.subMenu,
          )}
          key={item.key}
          role="none"
          style={resolvedStyles.subMenu}
        >
          <button
            aria-expanded={isOpen}
            className={classes(
              "launch-ui-navigation-menu-item",
              "launch-ui-navigation-menu-submenu-title",
              isOpen && "is-open",
              resolvedClassNames.item,
              resolvedClassNames.subMenuTitle,
            )}
            disabled={item.disabled}
            onClick={(event) => {
              item.onTitleClick?.({ domEvent: event, key: item.key });
              setSubMenuOpen(item.key, !isOpen);
            }}
            style={
              {
                "--launch-ui-menu-level": level,
                "--launch-ui-menu-indent": `${inlineIndent}px`,
                ...resolvedStyles.item,
                ...resolvedStyles.subMenuTitle,
              } as CSSProperties
            }
            type="button"
          >
            {renderItemParts(item)}
            {renderExpandIcon(item, isOpen)}
          </button>
          {isOpen ? (
            <ul
              className={classes(
                "launch-ui-navigation-menu-submenu-list",
                resolvedClassNames.subMenuList,
              )}
              style={resolvedStyles.subMenuList}
            >
              {renderItems(item.children, keyPath, level + 1)}
            </ul>
          ) : null}
        </li>
      );
    });

  const rootMenuProps = {
    "aria-orientation": mode === "horizontal" ? ("horizontal" as const) : ("vertical" as const),
    role: "menu" as const,
  };

  return (
    <ul
      {...rootProps}
      {...rootMenuProps}
      className={classes(
        "launch-ui-navigation-menu",
        `is-${mode}`,
        `is-${theme}`,
        isCollapsed && "is-collapsed",
        resolvedClassNames.root,
        className,
      )}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {renderItems(items)}
    </ul>
  );
}
