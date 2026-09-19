import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";
import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";
import { classes } from "../internal/classes.js";
import { Tooltip } from "../tooltip/index.js";

export type ProgressType = "circle" | "dashboard" | "line";
export type ProgressStatus = "active" | "exception" | "normal" | "success";
export type ProgressStrokeLinecap = "butt" | "round" | "square";
export type ProgressSize =
  | "medium"
  | "small"
  | number
  | readonly [number | string, number]
  | { readonly height?: number; readonly width?: number };
export type ProgressGapPlacement = "bottom" | "end" | "start" | "top";
export type ProgressSemanticName = "body" | "indicator" | "rail" | "root" | "track";
export type ProgressClassNames = Partial<Record<ProgressSemanticName, string>>;
export type ProgressStyles = Partial<Record<ProgressSemanticName, CSSProperties>>;

export interface ProgressGradient {
  readonly direction?: string;
  readonly from?: string;
  readonly to?: string;
  readonly [stop: string]: string | undefined;
}

export interface ProgressSuccess {
  readonly percent?: number;
  readonly strokeColor?: string;
}

export interface ProgressSteps {
  readonly count: number;
  readonly gap: number;
}

export interface ProgressPercentPosition {
  readonly align?: "center" | "end" | "start";
  readonly type?: "inner" | "outer";
}

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "style"> {
  readonly className?: string;
  readonly classNames?:
    | ProgressClassNames
    | ((info: { readonly props: ProgressProps }) => ProgressClassNames);
  readonly format?: (percent?: number, successPercent?: number) => ReactNode;
  readonly gapDegree?: number;
  readonly gapPlacement?: ProgressGapPlacement;
  readonly percent?: number;
  readonly percentPosition?: ProgressPercentPosition;
  readonly railColor?: string;
  readonly rounding?: (step: number) => number;
  readonly showInfo?: boolean;
  readonly size?: ProgressSize;
  readonly status?: ProgressStatus;
  readonly steps?: number | ProgressSteps;
  readonly strokeColor?: string | ReadonlyArray<string> | ProgressGradient;
  readonly strokeLinecap?: ProgressStrokeLinecap;
  readonly strokeWidth?: number;
  readonly style?: CSSProperties;
  readonly styles?: ProgressStyles | ((info: { readonly props: ProgressProps }) => ProgressStyles);
  readonly success?: ProgressSuccess;
  readonly type?: ProgressType;
}

interface ResolvedSize {
  readonly height: number;
  readonly width?: number | string;
}

const defaultRailColor = "var(--launch-ui-fill-secondary)";

function isStringArray(value: unknown): value is ReadonlyArray<string> {
  return Array.isArray(value);
}

function clamp(value: number | undefined, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? (value ?? 0) : 0));
}

function resolveNode(
  format: ProgressProps["format"],
  percent: number,
  successPercent: number | undefined,
) {
  return format ? format(percent, successPercent) : `${percent}%`;
}

function resolveStatus(status: ProgressStatus | undefined, percent: number): ProgressStatus {
  if (status !== undefined) return status;
  return percent >= 100 ? "success" : "normal";
}

function statusColor(status: ProgressStatus) {
  if (status === "exception") return "var(--launch-ui-error)";
  if (status === "success") return "var(--launch-ui-success)";
  return "var(--launch-ui-primary)";
}

function resolveLineSize(size: ProgressSize, strokeWidth: number | undefined): ResolvedSize {
  if (typeof size === "number") return { height: size, width: size };
  if (Array.isArray(size)) {
    const tuple = size as readonly [number | string, number];
    return { height: tuple[1], width: tuple[0] };
  }
  if (typeof size === "object") {
    const objectSize = size as { readonly height?: number; readonly width?: number };
    return {
      height: objectSize.height ?? strokeWidth ?? 8,
      ...(objectSize.width === undefined ? {} : { width: objectSize.width }),
    };
  }
  return { height: strokeWidth ?? (size === "small" ? 6 : 8) };
}

function resolveStepSize(
  size: ProgressSize,
  strokeWidth: number | undefined,
): { readonly height: number; readonly width: number } {
  if (typeof size === "number") return { height: size, width: size };
  if (Array.isArray(size)) {
    const tuple = size as readonly [number | string, number];
    return { height: tuple[1], width: typeof tuple[0] === "number" ? tuple[0] : 14 };
  }
  if (typeof size === "object") {
    const objectSize = size as { readonly height?: number; readonly width?: number };
    return { height: objectSize.height ?? strokeWidth ?? 8, width: objectSize.width ?? 14 };
  }
  return {
    height: strokeWidth ?? 8,
    width: size === "small" ? 2 : 14,
  };
}

function resolveCircleSize(size: ProgressSize) {
  if (typeof size === "number") return size;
  if (Array.isArray(size)) {
    const tuple = size as readonly [number | string, number];
    return typeof tuple[0] === "number" ? tuple[0] : tuple[1];
  }
  if (typeof size === "object") {
    const objectSize = size as { readonly height?: number; readonly width?: number };
    return objectSize.width ?? objectSize.height ?? 120;
  }
  return size === "small" ? 60 : 120;
}

function gradientEntries(gradient: ProgressGradient) {
  const explicitStops = Object.entries(gradient)
    .filter(([key, value]) => key.endsWith("%") && value !== undefined)
    .map(([key, value]) => ({ offset: clamp(Number.parseFloat(key)), color: value as string }))
    .sort((left, right) => left.offset - right.offset);
  if (explicitStops.length > 0) return explicitStops;
  return [
    { offset: 0, color: gradient.from ?? "var(--launch-ui-primary)" },
    { offset: 100, color: gradient.to ?? "var(--launch-ui-primary-hover)" },
  ];
}

function lineBackground(strokeColor: ProgressProps["strokeColor"], fallback: string) {
  if (typeof strokeColor === "string") return strokeColor;
  if (isStringArray(strokeColor)) return strokeColor[0] ?? fallback;
  if (strokeColor !== undefined) {
    const stops = gradientEntries(strokeColor)
      .map(({ color, offset }) => `${color} ${offset}%`)
      .join(", ");
    return `linear-gradient(${strokeColor.direction ?? "to right"}, ${stops})`;
  }
  return fallback;
}

function isLightHex(color: string) {
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex === undefined) return false;
  const normalized = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join("") : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 255000 > 0.68;
}

function dashboardRotation(placement: ProgressGapPlacement, gapDegree: number) {
  const center = { bottom: 90, end: 0, start: 180, top: -90 }[placement];
  return center + gapDegree / 2;
}

function createStepKeys(count: number) {
  return Array.from({ length: count }, (_, index) => `step-${index + 1}`);
}

function ProgressIndicator({
  className,
  node,
  status,
  statusIcon = true,
  style,
  type,
}: {
  readonly className?: string | undefined;
  readonly node: ReactNode;
  readonly status: ProgressStatus;
  readonly statusIcon?: boolean;
  readonly style?: CSSProperties | undefined;
  readonly type: ProgressType;
}) {
  let content = node;
  if (statusIcon && status === "success") {
    content = type === "line" ? <CheckCircleFilled /> : <CheckOutlined />;
  } else if (statusIcon && status === "exception") {
    content = type === "line" ? <CloseCircleFilled /> : <CloseOutlined />;
  }
  return (
    <span
      className={classes("launch-ui-progress-indicator", className)}
      style={style}
      title={typeof content === "string" ? content : undefined}
    >
      {content}
    </span>
  );
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(progressProps, ref) {
    const {
      className,
      classNames: classNamesProp,
      format,
      gapDegree = 75,
      gapPlacement = "bottom",
      percent = 0,
      percentPosition = {},
      railColor = defaultRailColor,
      rounding = Math.round,
      showInfo = true,
      size = "medium",
      status: statusProp,
      steps,
      strokeColor,
      strokeLinecap = "round",
      strokeWidth,
      style,
      styles: stylesProp,
      success,
      type = "line",
      ...rootProps
    } = progressProps;
    const gradientId = `launch-ui-progress-${useId().replaceAll(":", "")}`;
    const safePercent = clamp(percent);
    const successPercent = success?.percent === undefined ? undefined : clamp(success.percent);
    const status = resolveStatus(statusProp, successPercent ?? safePercent);
    const resolvedClassNames =
      typeof classNamesProp === "function"
        ? classNamesProp({ props: progressProps })
        : (classNamesProp ?? {});
    const resolvedStyles =
      typeof stylesProp === "function" ? stylesProp({ props: progressProps }) : (stylesProp ?? {});
    const positionType = percentPosition.type ?? "outer";
    const positionAlign = percentPosition.align ?? "end";
    const infoNode = resolveNode(format, safePercent, successPercent);
    const defaultColor = statusColor(status);
    const rootClassName = classes(
      "launch-ui-progress",
      `is-${type}`,
      `is-${status}`,
      `is-${typeof size === "string" ? size : "custom"}`,
      showInfo && "has-info",
      steps !== undefined && "has-steps",
      resolvedClassNames.root,
      className,
    );
    const sharedRootProps = {
      ...rootProps,
      "aria-valuemax": 100,
      "aria-valuemin": 0,
      "aria-valuenow": safePercent,
      ...(typeof infoNode === "string" ? { "aria-valuetext": infoNode } : {}),
      className: rootClassName,
      ref,
      role: "progressbar",
      style: { ...resolvedStyles.root, ...style },
    };

    if (type === "line") {
      const lineSize = resolveLineSize(size, strokeWidth);
      const stepSize = resolveStepSize(size, strokeWidth);
      const lineColor = lineBackground(strokeColor, defaultColor);
      const innerColor =
        typeof strokeColor === "string" && isLightHex(strokeColor)
          ? "var(--launch-ui-text)"
          : "#fff";
      const indicator = showInfo ? (
        <ProgressIndicator
          className={classes(
            `is-${positionType}`,
            `is-align-${positionAlign}`,
            resolvedClassNames.indicator,
          )}
          node={infoNode}
          status={status}
          statusIcon={format === undefined && positionType !== "inner"}
          style={{
            ...(positionType === "inner" ? { color: innerColor } : {}),
            ...resolvedStyles.indicator,
          }}
          type={type}
        />
      ) : null;

      if (steps !== undefined) {
        const count = Math.max(1, Math.floor(typeof steps === "number" ? steps : steps.count));
        const completed = clamp(rounding(count * (safePercent / 100)), 0, count);
        const colors = isStringArray(strokeColor) ? strokeColor : undefined;
        return (
          <div {...sharedRootProps}>
            <div
              className={classes("launch-ui-progress-body", resolvedClassNames.body)}
              style={resolvedStyles.body}
            >
              <div
                className={classes("launch-ui-progress-steps", resolvedClassNames.rail)}
                style={{ gap: 2, ...resolvedStyles.rail }}
              >
                {createStepKeys(count).map((stepKey, index) => (
                  <span
                    className={classes(
                      "launch-ui-progress-step",
                      index < completed && "is-complete",
                      resolvedClassNames.track,
                    )}
                    key={stepKey}
                    style={{
                      background: index < completed ? (colors?.[index] ?? lineColor) : railColor,
                      height: stepSize.height,
                      width: stepSize.width,
                      ...resolvedStyles.track,
                    }}
                  />
                ))}
              </div>
              {indicator}
            </div>
          </div>
        );
      }

      return (
        <div {...sharedRootProps}>
          <div
            className={classes(
              "launch-ui-progress-body",
              positionType === "outer" && positionAlign === "center" && "is-info-below",
              resolvedClassNames.body,
            )}
            style={{
              ...(lineSize.width === undefined ? {} : { width: lineSize.width }),
              ...resolvedStyles.body,
            }}
          >
            {positionType === "outer" && positionAlign === "start" ? indicator : null}
            <div
              className={classes("launch-ui-progress-rail", resolvedClassNames.rail)}
              style={{
                background: railColor,
                borderRadius: strokeLinecap === "round" ? 100 : 0,
                height: lineSize.height,
                ...resolvedStyles.rail,
              }}
            >
              <div
                className={classes("launch-ui-progress-track", resolvedClassNames.track)}
                style={{
                  background: lineColor,
                  borderRadius: strokeLinecap === "round" ? 100 : 0,
                  width: `${safePercent}%`,
                  ...resolvedStyles.track,
                }}
              />
              {successPercent !== undefined ? (
                <div
                  className={classes(
                    "launch-ui-progress-track",
                    "is-success-segment",
                    resolvedClassNames.track,
                  )}
                  style={{
                    background: success?.strokeColor ?? "var(--launch-ui-success)",
                    borderRadius: strokeLinecap === "round" ? 100 : 0,
                    width: `${successPercent}%`,
                    ...resolvedStyles.track,
                  }}
                />
              ) : null}
              {positionType === "inner" ? indicator : null}
            </div>
            {positionType === "outer" && positionAlign !== "start" ? indicator : null}
          </div>
        </div>
      );
    }

    const diameter = resolveCircleSize(size);
    const lineWidth = clamp(strokeWidth ?? 6, 0.5, 50);
    const radius = 50 - lineWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const safeGapDegree = type === "dashboard" ? clamp(gapDegree, 0, 295) : 0;
    const arcPercent = ((360 - safeGapDegree) / 360) * 100;
    const rotation = type === "dashboard" ? dashboardRotation(gapPlacement, safeGapDegree) : -90;
    const mainStart = successPercent ?? 0;
    const mainPercent = Math.max(0, safePercent - mainStart);
    const circleColor =
      typeof strokeColor === "string"
        ? strokeColor
        : isStringArray(strokeColor)
          ? (strokeColor[0] ?? defaultColor)
          : strokeColor === undefined
            ? defaultColor
            : `url(#${gradientId})`;
    const count =
      steps === undefined
        ? undefined
        : Math.max(1, Math.floor(typeof steps === "number" ? steps : steps.count));
    const stepGap = typeof steps === "object" ? Math.max(0, steps.gap) : 2;
    const completedSteps =
      count === undefined ? 0 : clamp(rounding(count * (safePercent / 100)), 0, count);
    const successSteps =
      count === undefined || successPercent === undefined
        ? 0
        : clamp(rounding(count * (successPercent / 100)), 0, count);
    const segmentLength = count === undefined ? 0 : arcPercent / count;
    const gapLength = (stepGap * 100 * 100) / Math.max(1, diameter * circumference);
    const visibleSegmentLength = Math.max(0.2, segmentLength - gapLength);
    const indicator =
      showInfo && diameter > 20 ? (
        <ProgressIndicator
          className={resolvedClassNames.indicator}
          node={infoNode}
          status={status}
          statusIcon={format === undefined}
          style={resolvedStyles.indicator}
          type={type}
        />
      ) : null;
    const circle = (
      <div {...sharedRootProps}>
        <div
          className={classes("launch-ui-progress-circle-body", resolvedClassNames.body)}
          style={{
            fontSize: Math.max(12, diameter * 0.16),
            height: diameter,
            width: diameter,
            ...resolvedStyles.body,
          }}
        >
          <svg aria-hidden className="launch-ui-progress-circle-svg" viewBox="0 0 100 100">
            {typeof strokeColor === "object" && !isStringArray(strokeColor) ? (
              <defs>
                <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                  {gradientEntries(strokeColor).map(({ color, offset }) => (
                    <stop key={offset} offset={`${offset}%`} stopColor={color} />
                  ))}
                </linearGradient>
              </defs>
            ) : null}
            {count === undefined ? (
              <>
                <circle
                  className={classes("launch-ui-progress-circle-rail", resolvedClassNames.rail)}
                  cx="50"
                  cy="50"
                  fill="none"
                  pathLength="100"
                  r={radius}
                  stroke={railColor}
                  strokeDasharray={`${arcPercent} ${100 - arcPercent}`}
                  strokeLinecap={strokeLinecap}
                  strokeWidth={lineWidth}
                  style={resolvedStyles.rail}
                  transform={`rotate(${rotation} 50 50)`}
                />
                <circle
                  className={classes("launch-ui-progress-circle-track", resolvedClassNames.track)}
                  cx="50"
                  cy="50"
                  fill="none"
                  pathLength="100"
                  r={radius}
                  stroke={circleColor}
                  strokeDasharray={`${(arcPercent * mainPercent) / 100} 100`}
                  strokeDashoffset={-(arcPercent * mainStart) / 100}
                  strokeLinecap={strokeLinecap}
                  strokeWidth={lineWidth}
                  style={resolvedStyles.track}
                  transform={`rotate(${rotation} 50 50)`}
                />
                {successPercent !== undefined ? (
                  <circle
                    className={classes(
                      "launch-ui-progress-circle-track",
                      "is-success-segment",
                      resolvedClassNames.track,
                    )}
                    cx="50"
                    cy="50"
                    fill="none"
                    pathLength="100"
                    r={radius}
                    stroke={success?.strokeColor ?? "var(--launch-ui-success)"}
                    strokeDasharray={`${(arcPercent * successPercent) / 100} 100`}
                    strokeLinecap={strokeLinecap}
                    strokeWidth={lineWidth}
                    style={resolvedStyles.track}
                    transform={`rotate(${rotation} 50 50)`}
                  />
                ) : null}
              </>
            ) : (
              createStepKeys(count).map((stepKey, index) => (
                <circle
                  className={classes(
                    "launch-ui-progress-circle-track",
                    "is-step",
                    index < completedSteps && "is-complete",
                    resolvedClassNames.track,
                  )}
                  cx="50"
                  cy="50"
                  fill="none"
                  key={stepKey}
                  pathLength="100"
                  r={radius}
                  stroke={
                    index >= completedSteps
                      ? railColor
                      : index < successSteps
                        ? (success?.strokeColor ?? "var(--launch-ui-success)")
                        : circleColor
                  }
                  strokeDasharray={`${visibleSegmentLength} ${100 - visibleSegmentLength}`}
                  strokeDashoffset={-segmentLength * index}
                  strokeLinecap={strokeLinecap}
                  strokeWidth={lineWidth}
                  style={resolvedStyles.track}
                  transform={`rotate(${rotation} 50 50)`}
                />
              ))
            )}
          </svg>
          {indicator}
        </div>
      </div>
    );

    if (showInfo && diameter <= 20) {
      return <Tooltip title={infoNode}>{circle}</Tooltip>;
    }
    return circle;
  },
);
