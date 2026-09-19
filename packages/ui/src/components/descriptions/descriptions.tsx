import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";
import { classes } from "../internal/classes.js";

export type DescriptionsSize = "large" | "medium" | "small";
export type DescriptionsLayout = "horizontal" | "vertical";
export type DescriptionsBreakpoint = "lg" | "md" | "sm" | "xl" | "xs" | "xxl";
export type DescriptionsColumn = number | Partial<Record<DescriptionsBreakpoint, number>>;
export type DescriptionsSemanticName = "content" | "extra" | "header" | "label" | "root" | "title";
export type DescriptionsClassNames = Partial<Record<DescriptionsSemanticName, string>>;
export type DescriptionsStyles = Partial<Record<DescriptionsSemanticName, CSSProperties>>;

export interface DescriptionsItemProps {
  readonly children?: ReactNode;
  readonly key?: string | number;
  readonly label?: ReactNode;
  readonly span?: "filled" | number;
}

export interface DescriptionsItem extends DescriptionsItemProps {
  readonly key: string | number;
}

export interface DescriptionsProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly bordered?: boolean;
  readonly children?: ReactNode;
  readonly classNames?:
    | DescriptionsClassNames
    | ((info: { readonly props: DescriptionsProps }) => DescriptionsClassNames);
  readonly colon?: boolean;
  readonly column?: DescriptionsColumn;
  readonly extra?: ReactNode;
  readonly items?: ReadonlyArray<DescriptionsItem>;
  readonly layout?: DescriptionsLayout;
  readonly size?: DescriptionsSize;
  readonly styles?:
    | DescriptionsStyles
    | ((info: { readonly props: DescriptionsProps }) => DescriptionsStyles);
  readonly title?: ReactNode;
}

function DescriptionsItemComponent({ children }: DescriptionsItemProps) {
  return children;
}

function getChildItems(children: ReactNode): ReadonlyArray<DescriptionsItem> {
  return Children.toArray(children).flatMap((child, index) => {
    if (!isValidElement<DescriptionsItemProps>(child) || child.type !== DescriptionsItemComponent) {
      return [];
    }
    return [
      {
        ...child.props,
        key: child.key ?? index,
      },
    ];
  });
}

function getColumnStyles(column: DescriptionsColumn): CSSProperties {
  if (typeof column === "number") {
    return { "--launch-ui-descriptions-columns": Math.max(1, Math.floor(column)) } as CSSProperties;
  }

  const xs = Math.max(1, Math.floor(column.xs ?? 1));
  const sm = Math.max(1, Math.floor(column.sm ?? xs));
  const md = Math.max(1, Math.floor(column.md ?? sm));
  const lg = Math.max(1, Math.floor(column.lg ?? md));
  const xl = Math.max(1, Math.floor(column.xl ?? lg));
  const xxl = Math.max(1, Math.floor(column.xxl ?? xl));
  return {
    "--launch-ui-descriptions-columns": xs,
    "--launch-ui-descriptions-columns-sm": sm,
    "--launch-ui-descriptions-columns-md": md,
    "--launch-ui-descriptions-columns-lg": lg,
    "--launch-ui-descriptions-columns-xl": xl,
    "--launch-ui-descriptions-columns-xxl": xxl,
  } as CSSProperties;
}

const DescriptionsRoot = forwardRef<HTMLDivElement, DescriptionsProps>(
  function Descriptions(descriptionsProps, ref) {
    const {
      bordered = false,
      children,
      className,
      classNames: classNamesProp,
      colon = true,
      column = 3,
      extra,
      items,
      layout = "horizontal",
      size = "large",
      style,
      styles: stylesProp,
      title,
      ...rootProps
    } = descriptionsProps;
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: descriptionsProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function"
        ? stylesProp({ props: descriptionsProps })
        : (stylesProp ?? {});
    const resolvedItems = items ?? getChildItems(children);
    const hasHeader =
      (title !== null && title !== undefined) || (extra !== null && extra !== undefined);

    return (
      <div
        {...rootProps}
        className={classes(
          "launch-ui-descriptions",
          `is-${size}`,
          `is-${layout}`,
          bordered && "is-bordered",
          resolvedClassNames.root,
          className,
        )}
        ref={ref}
        style={{ ...getColumnStyles(column), ...resolvedStyles.root, ...style }}
      >
        {hasHeader ? (
          <div
            className={classes("launch-ui-descriptions-header", resolvedClassNames.header)}
            style={resolvedStyles.header}
          >
            {title !== null && title !== undefined ? (
              <div
                className={classes("launch-ui-descriptions-title", resolvedClassNames.title)}
                style={resolvedStyles.title}
              >
                {title}
              </div>
            ) : null}
            {extra !== null && extra !== undefined ? (
              <div
                className={classes("launch-ui-descriptions-extra", resolvedClassNames.extra)}
                style={resolvedStyles.extra}
              >
                {extra}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="launch-ui-descriptions-list">
          {resolvedItems.map((item) => {
            const span = item.span ?? 1;
            const itemStyle =
              span === "filled"
                ? undefined
                : ({
                    "--launch-ui-descriptions-span": Math.max(1, Math.floor(span)),
                  } as CSSProperties);
            return (
              <div
                className={classes("launch-ui-descriptions-item", span === "filled" && "is-filled")}
                key={item.key}
                style={itemStyle}
              >
                <div
                  className={classes("launch-ui-descriptions-label", resolvedClassNames.label)}
                  style={resolvedStyles.label}
                >
                  {item.label}
                  {colon && !bordered ? (
                    <span aria-hidden="true" className="launch-ui-descriptions-colon">
                      :
                    </span>
                  ) : null}
                </div>
                <div
                  className={classes("launch-ui-descriptions-content", resolvedClassNames.content)}
                  style={resolvedStyles.content}
                >
                  {item.children}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

export const Descriptions = Object.assign(DescriptionsRoot, {
  Item: DescriptionsItemComponent,
}) as typeof DescriptionsRoot & {
  readonly Item: typeof DescriptionsItemComponent;
};
