import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Fragment, type ReactElement, type ReactNode } from "react";
import { classes } from "../internal/classes.js";

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
