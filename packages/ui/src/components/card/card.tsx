import { forwardRef, type HTMLAttributes } from "react";
import { classes } from "../internal/classes.js";

export interface CardProps extends HTMLAttributes<HTMLElement> {}

export const Card = forwardRef<HTMLElement, CardProps>(function Card({ className, ...props }, ref) {
  return <section {...props} className={classes("launch-ui-card", className)} ref={ref} />;
});
