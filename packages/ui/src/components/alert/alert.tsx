import type { HTMLAttributes, ReactNode } from "react";
import { classes } from "../internal/classes.js";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  readonly description?: ReactNode;
  readonly status?: "error" | "info" | "success" | "warning";
  readonly title: ReactNode;
}

export function Alert({ className, description, status = "info", title, ...props }: AlertProps) {
  const symbols = { error: "×", info: "i", success: "✓", warning: "!" } as const;
  return (
    <div
      {...props}
      className={classes("launch-ui-alert", `is-${status}`, className)}
      role={status === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true" className="launch-ui-alert-icon">
        {symbols[status]}
      </span>
      <div className="launch-ui-alert-copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
    </div>
  );
}
