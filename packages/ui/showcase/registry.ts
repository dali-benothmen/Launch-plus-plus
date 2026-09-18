import { alertShowcase } from "./components/alert.showcase.js";
import { buttonShowcase } from "./components/button.showcase.js";
import { cardShowcase } from "./components/card.showcase.js";
import { dialogShowcase } from "./components/dialog.showcase.js";
import { dividerShowcase } from "./components/divider.showcase.js";
import { dropdownMenuShowcase } from "./components/dropdown-menu.showcase.js";
import { flexShowcase } from "./components/flex.showcase.js";
import { floatButtonShowcase } from "./components/float-button.showcase.js";
import { gridShowcase } from "./components/grid.showcase.js";
import { iconsShowcase } from "./components/icons.showcase.js";
import { inputShowcase } from "./components/input.showcase.js";
import { masonryShowcase } from "./components/masonry.showcase.js";
import { selectShowcase } from "./components/select.showcase.js";
import { spaceShowcase } from "./components/space.showcase.js";
import { switchShowcase } from "./components/switch.showcase.js";
import { tableShowcase } from "./components/table.showcase.js";
import { tabsShowcase } from "./components/tabs.showcase.js";
import { tagShowcase } from "./components/tag.showcase.js";
import { tooltipShowcase } from "./components/tooltip.showcase.js";
import { typographyShowcase } from "./components/typography.showcase.js";
import { defineShowcases } from "./showcase-definition.js";

export {
  type ComponentShowcase,
  type ShowcaseStage,
  showcaseStages,
} from "./showcase-definition.js";

export const componentRegistry = defineShowcases([
  buttonShowcase,
  floatButtonShowcase,
  iconsShowcase,
  typographyShowcase,
  dividerShowcase,
  flexShowcase,
  gridShowcase,
  masonryShowcase,
  spaceShowcase,
  tabsShowcase,
  inputShowcase,
  selectShowcase,
  switchShowcase,
  cardShowcase,
  tableShowcase,
  tagShowcase,
  alertShowcase,
  dialogShowcase,
  dropdownMenuShowcase,
  tooltipShowcase,
]);
