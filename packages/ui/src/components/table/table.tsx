import type { TableHTMLAttributes } from "react";
import { classes } from "../internal/classes.js";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  readonly containerClassName?: string;
}

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div className={classes("launch-ui-table-wrap", containerClassName)}>
      <table {...props} className={classes("launch-ui-table", className)} />
    </div>
  );
}
