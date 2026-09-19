import { alertShowcase } from "./components/alert.showcase.js";
import { anchorShowcase } from "./components/anchor.showcase.js";
import { autoCompleteShowcase } from "./components/auto-complete.showcase.js";
import { avatarShowcase } from "./components/avatar.showcase.js";
import { badgeShowcase } from "./components/badge.showcase.js";
import { breadcrumbShowcase } from "./components/breadcrumb.showcase.js";
import { buttonShowcase } from "./components/button.showcase.js";
import { cardShowcase } from "./components/card.showcase.js";
import { checkboxShowcase } from "./components/checkbox.showcase.js";
import { datePickerShowcase } from "./components/date-picker.showcase.js";
import { dividerShowcase } from "./components/divider.showcase.js";
import { drawerShowcase } from "./components/drawer.showcase.js";
import { dropdownShowcase } from "./components/dropdown.showcase.js";
import { dropdownMenuShowcase } from "./components/dropdown-menu.showcase.js";
import { flexShowcase } from "./components/flex.showcase.js";
import { floatButtonShowcase } from "./components/float-button.showcase.js";
import { formShowcase } from "./components/form.showcase.js";
import { gridShowcase } from "./components/grid.showcase.js";
import { iconsShowcase } from "./components/icons.showcase.js";
import { inputShowcase } from "./components/input.showcase.js";
import { inputNumberShowcase } from "./components/input-number.showcase.js";
import { listShowcase } from "./components/list.showcase.js";
import { masonryShowcase } from "./components/masonry.showcase.js";
import { mentionsShowcase } from "./components/mentions.showcase.js";
import { menuShowcase } from "./components/menu.showcase.js";
import { messageShowcase } from "./components/message.showcase.js";
import { modalShowcase } from "./components/modal.showcase.js";
import { notificationShowcase } from "./components/notification.showcase.js";
import { paginationShowcase } from "./components/pagination.showcase.js";
import { popoverShowcase } from "./components/popover.showcase.js";
import { popconfirmShowcase } from "./components/popconfirm.showcase.js";
import { progressShowcase } from "./components/progress.showcase.js";
import { radioShowcase } from "./components/radio.showcase.js";
import { segmentedShowcase } from "./components/segmented.showcase.js";
import { selectShowcase } from "./components/select.showcase.js";
import { skeletonShowcase } from "./components/skeleton.showcase.js";
import { spaceShowcase } from "./components/space.showcase.js";
import { spinShowcase } from "./components/spin.showcase.js";
import { switchShowcase } from "./components/switch.showcase.js";
import { tableShowcase } from "./components/table.showcase.js";
import { tabsShowcase } from "./components/tabs.showcase.js";
import { tagShowcase } from "./components/tag.showcase.js";
import { timelineShowcase } from "./components/timeline.showcase.js";
import { tooltipShowcase } from "./components/tooltip.showcase.js";
import { treeShowcase } from "./components/tree.showcase.js";
import { typographyShowcase } from "./components/typography.showcase.js";
import { uploadShowcase } from "./components/upload.showcase.js";
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
  anchorShowcase,
  breadcrumbShowcase,
  dropdownShowcase,
  menuShowcase,
  paginationShowcase,
  tabsShowcase,
  autoCompleteShowcase,
  checkboxShowcase,
  datePickerShowcase,
  formShowcase,
  inputShowcase,
  inputNumberShowcase,
  mentionsShowcase,
  radioShowcase,
  selectShowcase,
  switchShowcase,
  uploadShowcase,
  avatarShowcase,
  badgeShowcase,
  listShowcase,
  popoverShowcase,
  segmentedShowcase,
  cardShowcase,
  tableShowcase,
  tagShowcase,
  timelineShowcase,
  treeShowcase,
  alertShowcase,
  drawerShowcase,
  messageShowcase,
  modalShowcase,
  notificationShowcase,
  popconfirmShowcase,
  progressShowcase,
  skeletonShowcase,
  spinShowcase,
  dropdownMenuShowcase,
  tooltipShowcase,
]);
