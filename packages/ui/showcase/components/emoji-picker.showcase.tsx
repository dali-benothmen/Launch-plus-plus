import { useState } from "react";
import { EmojiPicker, Space, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicEmojiPicker() {
  const [selected, setSelected] = useState("No emoji selected");
  return (
    <Space size="medium" vertical>
      <EmojiPicker
        height={360}
        onSelect={(emoji, detail) => setSelected(`${emoji} ${detail.names[0] ?? "Emoji"}`)}
        previewConfig={{ showPreview: false }}
        width={320}
      />
      <Typography.Text type="secondary">{selected}</Typography.Text>
    </Space>
  );
}

function ReactionsEmojiPicker() {
  const [selected, setSelected] = useState("Choose a reaction");
  return (
    <Space size="medium" vertical>
      <EmojiPicker mode="reactions" onSelect={(emoji) => setSelected(`Reacted with ${emoji}`)} />
      <Typography.Text type="secondary">{selected}</Typography.Text>
    </Space>
  );
}

export const emojiPickerShowcase = defineShowcase({
  id: "emoji-picker",
  name: "Emoji Picker",
  category: "Data entry",
  stage: "prod",
  description: "Lets users search and select an emoji from a complete, keyboard-accessible picker.",
  usage: `import { EmojiPicker } from "@launchpp/ui";`,
  whenToUse: [
    "Use EmojiPicker when users need to add expressive content to comments, messages, or descriptions.",
    "Place the picker in a Popover when it is opened from a compact action inside another control.",
  ],
  examples: [
    {
      id: "emoji-picker-basic",
      name: "Basic",
      description: "Search, browse categories, and receive the selected Unicode emoji.",
      preview: BasicEmojiPicker,
      code: `<EmojiPicker
  height={360}
  width={320}
  previewConfig={{ showPreview: false }}
  onSelect={(emoji, detail) => console.log(emoji, detail)}
/>`,
    },
    {
      id: "emoji-picker-reactions",
      name: "Reactions mode",
      description: "Offer a compact reaction row that can optionally expand into the full picker.",
      preview: ReactionsEmojiPicker,
      code: `<EmojiPicker
  mode="reactions"
  onSelect={(emoji) => addReaction(emoji)}
/>`,
    },
  ],
  api: [
    {
      name: "mode",
      type: '"picker" | "reactions"',
      defaultValue: '"picker"',
      description: "Shows the full picker or a compact single-row reactions picker.",
    },
    {
      name: "onSelect",
      type: "(emoji: string, detail: EmojiPickerData) => void",
      description: "Runs after an emoji is selected with its Unicode value and complete metadata.",
    },
    {
      name: "onEmojiClick / onReactionClick",
      type: "PickerProps callbacks",
      description: "Expose the underlying callbacks when the native event is also needed.",
    },
    {
      name: "reactions",
      type: "string[]",
      description: "Provides the unified emoji IDs shown in reactions mode.",
    },
    {
      name: "allowExpandReactions",
      type: "boolean",
      defaultValue: "true",
      description: "Shows an action that expands reactions mode into the full picker.",
    },
    {
      name: "emojiStyle",
      type: "EmojiPickerStyle",
      defaultValue: '"native"',
      description: "Controls how emoji artwork is rendered.",
    },
    {
      name: "theme",
      type: "EmojiPickerTheme",
      defaultValue: '"light"',
      description: "Controls the picker color theme.",
    },
    {
      name: "width / height",
      type: "number | string",
      description: "Controls the picker dimensions.",
    },
  ],
  accessibility: [
    "Search and category navigation are keyboard accessible.",
    "The selected emoji is returned as text so consumers can preserve it in accessible content.",
  ],
});
