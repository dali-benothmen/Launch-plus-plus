import { Button, Tooltip } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function TooltipPlacements() {
  return (
    <div className="showcase-preview-row">
      <Tooltip placement="top" title="Top tooltip">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip placement="right" title="Right tooltip">
        <Button>Right</Button>
      </Tooltip>
      <Tooltip placement="bottom" title="Bottom tooltip">
        <Button>Bottom</Button>
      </Tooltip>
      <Tooltip placement="left" title="Left tooltip">
        <Button>Left</Button>
      </Tooltip>
    </div>
  );
}

export const tooltipShowcase = defineShowcase({
  id: "tooltip",
  name: "Tooltip",
  category: "Overlays",
  stage: "prod",
  description: "Provides a short explanation for a focused or hovered control.",
  whenToUse: ["Use a tooltip to clarify an unfamiliar icon or concise control."],
  examples: [
    {
      id: "tooltip-placements",
      name: "Placements",
      preview: TooltipPlacements,
      code: `<Tooltip title="Top tooltip" placement="top">\n  <Button>Top</Button>\n</Tooltip>`,
    },
  ],
  accessibility: ["Do not place essential instructions exclusively inside a tooltip."],
});
