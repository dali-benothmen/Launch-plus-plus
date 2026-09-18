import { createElement, type HTMLAttributes } from "react";
import { classes } from "../internal/classes.js";

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly level?: 1 | 2 | 3 | 4 | 5;
}

function Title({ className, level = 1, ...props }: TitleProps) {
  return createElement(`h${level}`, {
    ...props,
    className: classes("launch-ui-title", `is-level-${level}`, className),
  });
}

export interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  readonly strong?: boolean;
  readonly type?: "default" | "secondary" | "tertiary";
}

function Text({ className, strong = false, type = "default", ...props }: TextProps) {
  return (
    <span
      {...props}
      className={classes("launch-ui-text", `is-${type}`, strong && "is-strong", className)}
    />
  );
}

export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {}

function Paragraph({ className, ...props }: ParagraphProps) {
  return <p {...props} className={classes("launch-ui-paragraph", className)} />;
}

export const Typography = { Paragraph, Text, Title } as const;
