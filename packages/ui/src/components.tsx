import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Fragment,
  createElement,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="m3.5 8.2 2.7 2.7 6.3-6.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg aria-hidden="true" className="launch-ui-loading-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  );
}

export type ButtonVariant = "dashed" | "default" | "filled" | "link" | "primary" | "text";
export type ComponentSize = "large" | "medium" | "small";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly danger?: boolean;
  readonly icon?: ReactNode;
  readonly iconOnly?: boolean;
  readonly loading?: boolean;
  readonly size?: ComponentSize;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    danger = false,
    disabled,
    icon,
    iconOnly = false,
    loading = false,
    size = "medium",
    type = "button",
    variant = "default",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes(
        "launch-ui-button",
        `is-${variant}`,
        `is-${size}`,
        danger && "is-danger",
        iconOnly && "is-icon-only",
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      type={type}
    >
      {loading ? <LoadingIcon /> : icon}
      {iconOnly ? null : children}
    </button>
  );
});

export interface CardProps extends HTMLAttributes<HTMLElement> {}

export const Card = forwardRef<HTMLElement, CardProps>(function Card({ className, ...props }, ref) {
  return <section {...props} className={classes("launch-ui-card", className)} ref={ref} />;
});

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

export interface TooltipProps {
  readonly children: ReactElement;
  readonly placement?: "bottom" | "left" | "right" | "top";
  readonly title: ReactNode;
}

export function Tooltip({ children, placement = "top", title }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="launch-ui-tooltip" side={placement} sideOffset={6}>
          {title}
          <TooltipPrimitive.Arrow className="launch-ui-tooltip-arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export type InputVariant = "borderless" | "filled" | "outlined" | "underlined";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly status?: "error" | "warning";
  readonly variant?: InputVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, status, variant = "outlined", ...props },
  ref,
) {
  return (
    <input
      {...props}
      aria-invalid={status === "error" || props["aria-invalid"]}
      className={classes("launch-ui-input", `is-${variant}`, status && `is-${status}`, className)}
      ref={ref}
    />
  );
});

export interface SelectOption {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface SelectProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly defaultValue?: string;
  readonly disabled?: boolean;
  readonly onValueChange?: (value: string) => void;
  readonly options: ReadonlyArray<SelectOption>;
  readonly placeholder?: string;
  readonly value?: string;
}

export function Select({
  ariaLabel,
  className,
  defaultValue,
  disabled,
  onValueChange,
  options,
  placeholder,
  value,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(disabled === undefined ? {} : { disabled })}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      {...(value === undefined ? {} : { value })}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={classes("launch-ui-select-trigger", className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="launch-ui-select-icon">
          <ChevronDownIcon />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="launch-ui-select-content"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="launch-ui-select-item"
                key={option.value}
                value={option.value}
                {...(option.disabled === undefined ? {} : { disabled: option.disabled })}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="launch-ui-item-indicator">
                  <CheckIcon />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export interface SwitchProps {
  readonly ariaLabel: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly disabled?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly size?: "small" | "medium";
}

export function Switch({
  ariaLabel,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  size = "medium",
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      aria-label={ariaLabel}
      className={classes("launch-ui-switch", size === "small" && "is-small")}
      {...(checked === undefined ? {} : { checked })}
      {...(defaultChecked === undefined ? {} : { defaultChecked })}
      {...(disabled === undefined ? {} : { disabled })}
      {...(onCheckedChange === undefined ? {} : { onCheckedChange })}
    >
      <SwitchPrimitive.Thumb className="launch-ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}

export interface TabItem {
  readonly content: ReactNode;
  readonly label: ReactNode;
  readonly value: string;
}

export interface TabsProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly defaultValue: string;
  readonly items: ReadonlyArray<TabItem>;
  readonly onValueChange?: (value: string) => void;
  readonly value?: string;
}

export function Tabs({
  ariaLabel,
  className,
  defaultValue,
  items,
  onValueChange,
  value,
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      className={classes("launch-ui-tabs", className)}
      defaultValue={defaultValue}
      {...(onValueChange === undefined ? {} : { onValueChange })}
      {...(value === undefined ? {} : { value })}
    >
      <TabsPrimitive.List aria-label={ariaLabel} className="launch-ui-tabs-list">
        {items.map((item) => (
          <TabsPrimitive.Trigger className="launch-ui-tab" key={item.value} value={item.value}>
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className="launch-ui-tab-content"
          key={item.value}
          value={item.value}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export interface DialogProps {
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly description?: ReactNode;
  readonly footer?: ReactNode;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly title: ReactNode;
  readonly trigger: ReactElement;
}

export function Dialog({
  children,
  defaultOpen,
  description,
  footer,
  onOpenChange,
  open,
  title,
  trigger,
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange === undefined ? {} : { onOpenChange })}
      {...(open === undefined ? {} : { open })}
    >
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="launch-ui-dialog-overlay" />
        <DialogPrimitive.Content className="launch-ui-dialog-content">
          <header className="launch-ui-dialog-header">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button aria-label="Close" icon={<CloseIcon />} iconOnly variant="text" />
            </DialogPrimitive.Close>
          </header>
          <div className="launch-ui-dialog-body">{children}</div>
          {footer ? <footer className="launch-ui-dialog-footer">{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogClose = DialogPrimitive.Close;

export interface DropdownItem {
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly id: string;
  readonly label: ReactNode;
  readonly onSelect?: () => void;
  readonly separatorBefore?: boolean;
}

export interface DropdownMenuProps {
  readonly align?: "center" | "end" | "start";
  readonly items: ReadonlyArray<DropdownItem>;
  readonly trigger: ReactElement;
}

export function DropdownMenu({ align = "end", items, trigger }: DropdownMenuProps) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align={align} className="launch-ui-menu-content" sideOffset={6}>
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separatorBefore ? (
                <DropdownPrimitive.Separator className="launch-ui-menu-separator" />
              ) : null}
              <DropdownPrimitive.Item
                className={classes("launch-ui-menu-item", item.danger && "is-danger")}
                {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
                {...(item.onSelect === undefined ? {} : { onSelect: item.onSelect })}
              >
                {item.label}
              </DropdownPrimitive.Item>
            </Fragment>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  readonly color?: "blue" | "green" | "neutral" | "purple";
  readonly variant?: "filled" | "outlined" | "solid";
}

export function Tag({ className, color = "neutral", variant = "outlined", ...props }: TagProps) {
  return (
    <span
      {...props}
      className={classes("launch-ui-tag", `is-${color}`, `is-${variant}`, className)}
    />
  );
}

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
