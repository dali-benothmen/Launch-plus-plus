import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactElement, ReactNode } from "react";
import { Button } from "../button/index.js";
import { CloseIcon } from "../internal/icons.js";

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
