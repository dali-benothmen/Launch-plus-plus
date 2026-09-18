import { buttonShowcase } from "./components/button.showcase.js";
import { cardShowcase } from "./components/card.showcase.js";
import { typographyShowcase } from "./components/typography.showcase.js";
import { defineShowcases } from "./showcase-definition.js";

export {
  showcaseStages,
  type ComponentShowcase,
  type ShowcaseStage,
} from "./showcase-definition.js";

export const componentRegistry = defineShowcases([
  buttonShowcase,
  cardShowcase,
  typographyShowcase,
]);
