import * as SelectPrimitive from "@radix-ui/react-select";
import { classes } from "../internal/classes.js";
import { CheckIcon, ChevronDownIcon } from "../internal/icons.js";

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
