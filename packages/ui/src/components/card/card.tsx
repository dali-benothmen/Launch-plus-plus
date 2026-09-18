import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { classes } from "../internal/classes.js";

export type CardSize = "medium" | "small";
export type CardVariant = "borderless" | "outlined";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly cover?: ReactNode;
  readonly extra?: ReactNode;
  readonly hoverable?: boolean;
  readonly size?: CardSize;
  readonly title?: ReactNode;
  readonly variant?: CardVariant;
}

export interface CardMetaProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly avatar?: ReactNode;
  readonly description?: ReactNode;
  readonly title?: ReactNode;
}

function CardMeta({ avatar, children, className, description, title, ...props }: CardMetaProps) {
  return (
    <div {...props} className={classes("launch-ui-card-meta", className)}>
      {avatar ? <div className="launch-ui-card-meta-avatar">{avatar}</div> : null}
      <div className="launch-ui-card-meta-detail">
        {title ? <div className="launch-ui-card-meta-title">{title}</div> : null}
        {description ? <div className="launch-ui-card-meta-description">{description}</div> : null}
        {children}
      </div>
    </div>
  );
}

const CardRoot = forwardRef<HTMLElement, CardProps>(function Card(
  {
    children,
    className,
    cover,
    extra,
    hoverable = false,
    size = "medium",
    title,
    variant = "outlined",
    ...props
  },
  ref,
) {
  const hasHeader = title !== undefined || extra !== undefined;

  return (
    <section
      {...props}
      className={classes(
        "launch-ui-card",
        `is-${size}`,
        `is-${variant}`,
        hoverable && "is-hoverable",
        className,
      )}
      ref={ref}
    >
      {hasHeader ? (
        <div className="launch-ui-card-header">
          <div className="launch-ui-card-title">{title}</div>
          {extra ? <div className="launch-ui-card-extra">{extra}</div> : null}
        </div>
      ) : null}
      {cover ? <div className="launch-ui-card-cover">{cover}</div> : null}
      <div className="launch-ui-card-body">{children}</div>
    </section>
  );
});

export const Card = Object.assign(CardRoot, { Meta: CardMeta }) as typeof CardRoot & {
  readonly Meta: typeof CardMeta;
};
