import BaseEmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
  type PickerProps,
} from "emoji-picker-react";
import { classes } from "../internal/classes.js";

export type EmojiPickerMode = "picker" | "reactions";

export interface EmojiPickerProps extends PickerProps {
  readonly mode?: EmojiPickerMode;
  readonly onSelect?: (emoji: string, detail: EmojiClickData) => void;
}

export function EmojiPicker({
  className,
  emojiStyle = EmojiStyle.NATIVE,
  mode,
  onEmojiClick,
  onReactionClick,
  onSelect,
  reactionsDefaultOpen,
  theme = Theme.LIGHT,
  ...props
}: EmojiPickerProps) {
  const resolvedReactionsDefaultOpen =
    mode === undefined ? reactionsDefaultOpen : mode === "reactions";

  return (
    <BaseEmojiPicker
      {...props}
      className={classes("launch-ui-emoji-picker", className)}
      emojiStyle={emojiStyle}
      onEmojiClick={(detail, event, api) => {
        onEmojiClick?.(detail, event, api);
        onSelect?.(detail.emoji, detail);
      }}
      onReactionClick={(detail, event, api) => {
        onReactionClick?.(detail, event, api);
        onSelect?.(detail.emoji, detail);
      }}
      {...(resolvedReactionsDefaultOpen === undefined
        ? {}
        : { reactionsDefaultOpen: resolvedReactionsDefaultOpen })}
      theme={theme}
    />
  );
}

export {
  EmojiStyle as EmojiPickerStyle,
  Theme as EmojiPickerTheme,
  type EmojiClickData as EmojiPickerData,
};
