import BaseEmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
  type PickerProps,
} from "emoji-picker-react";
import { classes } from "../internal/classes.js";

export interface EmojiPickerProps extends PickerProps {
  readonly onSelect?: (emoji: string, detail: EmojiClickData) => void;
}

export function EmojiPicker({
  className,
  emojiStyle = EmojiStyle.NATIVE,
  onEmojiClick,
  onSelect,
  theme = Theme.LIGHT,
  ...props
}: EmojiPickerProps) {
  return (
    <BaseEmojiPicker
      {...props}
      className={classes("launch-ui-emoji-picker", className)}
      emojiStyle={emojiStyle}
      onEmojiClick={(detail, event, api) => {
        onEmojiClick?.(detail, event, api);
        onSelect?.(detail.emoji, detail);
      }}
      theme={theme}
    />
  );
}

export {
  EmojiStyle as EmojiPickerStyle,
  Theme as EmojiPickerTheme,
  type EmojiClickData as EmojiPickerData,
};
