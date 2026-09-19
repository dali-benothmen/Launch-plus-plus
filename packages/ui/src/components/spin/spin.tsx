import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { classes } from "../internal/classes.js";

export type SpinSize = "large" | "medium" | "small";
export type SpinSemanticName = "container" | "description" | "indicator" | "root" | "section";
export type SpinClassNames = Partial<Record<SpinSemanticName, string>>;
export type SpinStyles = Partial<Record<SpinSemanticName, CSSProperties>>;

export interface SpinProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children?: ReactNode;
  readonly classNames?: SpinClassNames | ((info: { readonly props: SpinProps }) => SpinClassNames);
  readonly delay?: number;
  readonly description?: ReactNode;
  readonly fullscreen?: boolean;
  readonly indicator?: ReactNode;
  readonly percent?: "auto" | number;
  readonly size?: SpinSize;
  readonly spinning?: boolean;
  readonly styles?: SpinStyles | ((info: { readonly props: SpinProps }) => SpinStyles);
}

function clampPercent(percent: number) {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

function nextAutoPercent(current: number) {
  const remaining = 100 - current;
  if (current <= 30) return current + remaining * 0.05;
  if (current <= 70) return current + remaining * 0.03;
  if (current <= 96) return current + remaining * 0.01;
  return current;
}

function DefaultIndicator({ percent }: { readonly percent: number | undefined }) {
  const safePercent = percent === undefined ? 0 : clampPercent(percent);
  const showProgress = percent !== undefined && safePercent > 0;
  return (
    <span className={classes("launch-ui-spin-default-indicator", showProgress && "is-progress")}>
      <span className="launch-ui-spin-dots" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {percent !== undefined ? (
        <svg
          aria-label={`${Math.round(safePercent)}% loaded`}
          className="launch-ui-spin-progress"
          role="progressbar"
          viewBox="0 0 100 100"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={safePercent}
        >
          <circle
            className="launch-ui-spin-progress-rail"
            cx="50"
            cy="50"
            pathLength="100"
            r="40"
          />
          <circle
            className="launch-ui-spin-progress-track"
            cx="50"
            cy="50"
            pathLength="100"
            r="40"
            strokeDasharray={`${safePercent} ${100 - safePercent}`}
          />
        </svg>
      ) : null}
    </span>
  );
}

export const Spin = forwardRef<HTMLDivElement, SpinProps>(function Spin(spinProps, ref) {
  const {
    children,
    className,
    classNames: classNamesProp,
    delay = 0,
    description,
    fullscreen = false,
    indicator,
    percent,
    size = "medium",
    spinning: requestedSpinning = true,
    style,
    styles: stylesProp,
    ...rootProps
  } = spinProps;
  const shouldDelay = requestedSpinning && Number.isFinite(delay) && delay > 0;
  const [spinning, setSpinning] = useState(requestedSpinning && !shouldDelay);
  const [autoPercent, setAutoPercent] = useState(0);
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: spinProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: spinProps }) : (stylesProp ?? {});
  const hasChildren = children !== undefined;
  const isNested = hasChildren || fullscreen;

  useEffect(() => {
    if (!requestedSpinning) {
      setSpinning(false);
      return;
    }
    if (!shouldDelay) {
      setSpinning(true);
      return;
    }
    const timer = window.setTimeout(() => setSpinning(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay, requestedSpinning, shouldDelay]);

  useEffect(() => {
    if (percent !== "auto" || !spinning) {
      setAutoPercent(0);
      return;
    }
    const timer = window.setInterval(() => {
      setAutoPercent((current) => nextAutoPercent(current));
    }, 200);
    return () => window.clearInterval(timer);
  }, [percent, spinning]);

  const resolvedPercent = percent === "auto" ? autoPercent : percent;
  const indicatorNode = indicator ?? <DefaultIndicator percent={resolvedPercent} />;
  const section = (
    <div
      className={classes("launch-ui-spin-section", resolvedClassNames.section)}
      style={resolvedStyles.section}
    >
      <span
        className={classes("launch-ui-spin-indicator", resolvedClassNames.indicator)}
        style={resolvedStyles.indicator}
      >
        {indicatorNode}
      </span>
      {description !== null && description !== undefined ? (
        <span
          className={classes("launch-ui-spin-description", resolvedClassNames.description)}
          style={resolvedStyles.description}
        >
          {description}
        </span>
      ) : null}
    </div>
  );
  const root = (
    <div
      {...rootProps}
      aria-busy={spinning}
      aria-live="polite"
      className={classes(
        "launch-ui-spin",
        `is-${size}`,
        spinning && "is-spinning",
        isNested && "is-nested",
        fullscreen && "is-fullscreen",
        resolvedClassNames.root,
        className,
      )}
      ref={ref}
      style={{ ...resolvedStyles.root, ...style }}
    >
      {spinning ? section : null}
      {hasChildren ? (
        <div
          className={classes("launch-ui-spin-container", resolvedClassNames.container)}
          style={resolvedStyles.container}
        >
          {children}
        </div>
      ) : null}
    </div>
  );

  if (fullscreen && typeof document !== "undefined") return createPortal(root, document.body);
  return root;
});
