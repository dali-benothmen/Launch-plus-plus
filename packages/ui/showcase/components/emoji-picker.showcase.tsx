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
  ],
  api: [
    {
      name: "onSelect",
      type: "(emoji: string, detail: EmojiPickerData) => void",
      description: "Runs after an emoji is selected with its Unicode value and complete metadata.",
    },
    {
      name: "onEmojiClick",
      type: "PickerProps['onEmojiClick']",
      description: "Exposes the underlying picker callback when the native event is also needed.",
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
