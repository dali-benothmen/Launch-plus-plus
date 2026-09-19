import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import * as icons from "../../src/icons.js";
import { Button, Input } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

type IconComponent = ComponentType<{
  readonly "aria-hidden"?: boolean;
  readonly className?: string;
}>;

interface IconEntry {
  readonly Icon: IconComponent;
  readonly name: string;
}

type IconTheme = "all" | "Filled" | "Outlined" | "TwoTone";

const iconNamePattern = /(Filled|Outlined|TwoTone)$/;

const iconEntries = Object.entries(icons)
  .filter(([name]) => iconNamePattern.test(name))
  .map(([name, Icon]) => ({ Icon: Icon as IconComponent, name }))
  .sort((first, second) => first.name.localeCompare(second.name));

const iconsByName = new Map(iconEntries.map((entry) => [entry.name, entry]));

function names(value: string) {
  return value.trim().split(/\s+/);
}

const directionalIconNames = names(`
  StepBackwardOutlined StepBackwardFilled StepForwardOutlined StepForwardFilled
  FastBackwardOutlined FastBackwardFilled FastForwardOutlined FastForwardFilled
  ShrinkOutlined ArrowsAltOutlined DownOutlined UpOutlined LeftOutlined RightOutlined
  CaretUpOutlined CaretUpFilled CaretDownOutlined CaretDownFilled CaretLeftOutlined
  CaretLeftFilled CaretRightOutlined CaretRightFilled UpCircleOutlined UpCircleFilled
  UpCircleTwoTone DownCircleOutlined DownCircleFilled DownCircleTwoTone LeftCircleOutlined
  LeftCircleFilled LeftCircleTwoTone RightCircleOutlined RightCircleFilled RightCircleTwoTone
  DoubleRightOutlined DoubleLeftOutlined VerticalLeftOutlined VerticalRightOutlined
  VerticalAlignTopOutlined VerticalAlignMiddleOutlined VerticalAlignBottomOutlined
  ForwardOutlined ForwardFilled BackwardOutlined BackwardFilled RollbackOutlined EnterOutlined
  RetweetOutlined SwapOutlined SwapLeftOutlined SwapRightOutlined ArrowUpOutlined ArrowDownOutlined
  ArrowLeftOutlined ArrowRightOutlined PlayCircleOutlined PlayCircleFilled PlayCircleTwoTone
  UpSquareOutlined UpSquareFilled UpSquareTwoTone DownSquareOutlined DownSquareFilled
  DownSquareTwoTone LeftSquareOutlined LeftSquareFilled LeftSquareTwoTone RightSquareOutlined
  RightSquareFilled RightSquareTwoTone LoginOutlined LogoutOutlined MenuFoldOutlined
  MenuUnfoldOutlined BorderBottomOutlined BorderHorizontalOutlined BorderInnerOutlined
  BorderOuterOutlined BorderLeftOutlined BorderRightOutlined BorderTopOutlined
  BorderVerticleOutlined PicCenterOutlined PicLeftOutlined PicRightOutlined
  RadiusBottomleftOutlined RadiusBottomrightOutlined RadiusUpleftOutlined RadiusUprightOutlined
  FullscreenOutlined FullscreenExitOutlined
`);

const suggestedIconNames = names(`
  QuestionOutlined QuestionCircleOutlined QuestionCircleFilled QuestionCircleTwoTone PlusOutlined
  PlusCircleOutlined PlusCircleFilled PlusCircleTwoTone PauseOutlined PauseCircleOutlined
  PauseCircleFilled PauseCircleTwoTone MinusOutlined MinusCircleOutlined MinusCircleFilled
  MinusCircleTwoTone PlusSquareOutlined PlusSquareFilled PlusSquareTwoTone MinusSquareOutlined
  MinusSquareFilled MinusSquareTwoTone InfoOutlined InfoCircleOutlined InfoCircleFilled
  InfoCircleTwoTone ExclamationOutlined ExclamationCircleOutlined ExclamationCircleFilled
  ExclamationCircleTwoTone CloseOutlined CloseCircleOutlined CloseCircleFilled CloseCircleTwoTone
  CloseSquareOutlined CloseSquareFilled CloseSquareTwoTone CheckOutlined CheckCircleOutlined
  CheckCircleFilled CheckCircleTwoTone CheckSquareOutlined CheckSquareFilled CheckSquareTwoTone
  ClockCircleOutlined ClockCircleFilled ClockCircleTwoTone WarningOutlined WarningFilled
  WarningTwoTone IssuesCloseOutlined StopOutlined StopFilled StopTwoTone
`);

const editorIconNames = names(`
  EditOutlined EditFilled EditTwoTone FormOutlined CopyOutlined CopyFilled CopyTwoTone
  ScissorOutlined DeleteOutlined DeleteFilled DeleteTwoTone SnippetsOutlined SnippetsFilled
  SnippetsTwoTone DiffOutlined DiffFilled DiffTwoTone HighlightOutlined HighlightFilled
  HighlightTwoTone AlignCenterOutlined AlignLeftOutlined AlignRightOutlined BgColorsOutlined
  BoldOutlined ItalicOutlined UnderlineOutlined StrikethroughOutlined RedoOutlined UndoOutlined
  ZoomInOutlined ZoomOutOutlined FontColorsOutlined FontSizeOutlined LineHeightOutlined
  DashOutlined SmallDashOutlined SortAscendingOutlined SortDescendingOutlined DragOutlined
  OrderedListOutlined UnorderedListOutlined RadiusSettingOutlined ColumnWidthOutlined
  ColumnHeightOutlined
`);

const dataIconNames = names(`
  AreaChartOutlined PieChartOutlined PieChartFilled PieChartTwoTone BarChartOutlined
  DotChartOutlined LineChartOutlined RadarChartOutlined HeatMapOutlined FallOutlined RiseOutlined
  StockOutlined BoxPlotOutlined BoxPlotFilled BoxPlotTwoTone FundOutlined FundFilled FundTwoTone
  SlidersOutlined SlidersFilled SlidersTwoTone
`);

const brandIconNames = names(`
  AndroidOutlined AndroidFilled AppleOutlined AppleFilled WindowsOutlined WindowsFilled IeOutlined
  IeCircleFilled IeSquareFilled ChromeOutlined ChromeFilled GithubOutlined GithubFilled
  AliwangwangOutlined AliwangwangFilled DingdingOutlined WeiboSquareOutlined WeiboSquareFilled
  WeiboCircleOutlined WeiboCircleFilled TaobaoCircleOutlined TaobaoCircleFilled Html5Outlined
  Html5Filled Html5TwoTone WeiboOutlined TwitterOutlined TwitterCircleFilled TwitterSquareFilled
  WechatOutlined WechatFilled WhatsAppOutlined YoutubeOutlined YoutubeFilled AlipayCircleOutlined
  AlipayCircleFilled TaobaoOutlined TaobaoSquareFilled DingtalkOutlined DingtalkCircleFilled
  DingtalkSquareFilled SkypeOutlined SkypeFilled QqOutlined QqCircleFilled QqSquareFilled
  MediumWorkmarkOutlined GitlabOutlined GitlabFilled MediumOutlined MediumCircleFilled
  MediumSquareFilled LinkedinOutlined LinkedinFilled GooglePlusOutlined GooglePlusCircleFilled
  GooglePlusSquareFilled DropboxOutlined DropboxCircleFilled DropboxSquareFilled FacebookOutlined
  FacebookFilled CodepenOutlined CodepenSquareFilled CodeSandboxOutlined CodeSandboxSquareFilled
  CodeSandboxCircleFilled AmazonOutlined AmazonCircleFilled AmazonSquareFilled GoogleOutlined
  GoogleCircleFilled GoogleSquareFilled CodepenCircleOutlined CodepenCircleFilled AlipayOutlined
  AlipaySquareFilled AntDesignOutlined AntCloudOutlined AliyunOutlined ZhihuOutlined
  ZhihuCircleFilled ZhihuSquareFilled SlackOutlined SlackCircleFilled SlackSquareOutlined
  SlackSquareFilled BehanceOutlined BehanceCircleFilled BehanceSquareOutlined BehanceSquareFilled
  DribbbleOutlined DribbbleCircleFilled DribbbleSquareOutlined DribbbleSquareFilled
  InstagramOutlined InstagramFilled YuqueOutlined YuqueFilled AlibabaOutlined YahooOutlined
  YahooFilled RedditOutlined RedditCircleFilled RedditSquareFilled SketchOutlined
  SketchCircleFilled SketchSquareFilled WechatWorkOutlined WechatWorkFilled OpenAIOutlined
  OpenAIFilled AnthropicFilled ClaudeFilled GeminiFilled MistralFilled DeepSeekFilled QwenFilled
  PerplexityFilled HuggingFaceFilled OllamaFilled ReplicateFilled ElevenLabsFilled TelegramFilled
  MastodonFilled ThreadsFilled SnapchatFilled DiscordOutlined DiscordFilled XOutlined XFilled
  BilibiliOutlined BilibiliFilled PinterestOutlined PinterestFilled TikTokOutlined TikTokFilled
  SpotifyOutlined SpotifyFilled TwitchOutlined TwitchFilled LinuxOutlined JavaOutlined
  JavaScriptOutlined PythonOutlined RubyOutlined DotNetOutlined KubernetesOutlined DockerOutlined
  BaiduOutlined HarmonyOSOutlined
`);

function resolveIcons(iconNames: ReadonlyArray<string>): IconEntry[] {
  return iconNames.flatMap((name) => {
    const entry = iconsByName.get(name);
    return entry ? [entry] : [];
  });
}

const explicitlyCategorizedNames = new Set([
  ...directionalIconNames,
  ...suggestedIconNames,
  ...editorIconNames,
  ...dataIconNames,
  ...brandIconNames,
]);

const iconCategories = [
  { entries: resolveIcons(directionalIconNames), name: "Directional Icons" },
  { entries: resolveIcons(suggestedIconNames), name: "Suggested Icons" },
  { entries: resolveIcons(editorIconNames), name: "Editor Icons" },
  { entries: resolveIcons(dataIconNames), name: "Data Icons" },
  { entries: resolveIcons(brandIconNames), name: "Brand and Logos" },
  {
    entries: iconEntries.filter(({ name }) => !explicitlyCategorizedNames.has(name)),
    name: "Application Icons",
  },
] as const;

const themeOptions: ReadonlyArray<{ readonly label: string; readonly value: IconTheme }> = [
  { label: "All", value: "all" },
  { label: "Outlined", value: "Outlined" },
  { label: "Filled", value: "Filled" },
  { label: "Two Tone", value: "TwoTone" },
];

function IconGallery() {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<IconTheme>("all");
  const [copiedIcon, setCopiedIcon] = useState<string>();

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return iconCategories
      .map((category) => ({
        ...category,
        entries: category.entries.filter(({ name }) => {
          const matchesQuery =
            !normalizedQuery || name.toLocaleLowerCase().includes(normalizedQuery);
          const matchesTheme = theme === "all" || name.endsWith(theme);
          return matchesQuery && matchesTheme;
        }),
      }))
      .filter(({ entries }) => entries.length > 0);
  }, [query, theme]);

  const visibleIconCount = visibleCategories.reduce(
    (total, category) => total + category.entries.length,
    0,
  );

  async function copyImport(name: string) {
    await navigator.clipboard.writeText(`import { ${name} } from "@launchpp/ui/icons";`);
    setCopiedIcon(name);
    window.setTimeout(() => setCopiedIcon(undefined), 1_500);
  }

  return (
    <div className="showcase-icon-browser">
      <div className="showcase-icon-controls">
        <fieldset className="showcase-icon-filters">
          <legend className="showcase-visually-hidden">Filter icons by style</legend>
          {themeOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => setTheme(option.value)}
              size="small"
              variant={theme === option.value ? "primary" : "default"}
            >
              {option.label}
            </Button>
          ))}
        </fieldset>

        <div className="showcase-icon-search">
          <label htmlFor="icon-search">
            <span className="showcase-visually-hidden">Search icons</span>
            <Input
              id="icon-search"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search icons"
              shape="round"
              type="search"
              value={query}
            />
          </label>
          <span aria-live="polite" className="showcase-icon-count">
            {visibleIconCount} {visibleIconCount === 1 ? "icon" : "icons"}
          </span>
        </div>
      </div>

      {visibleCategories.length > 0 ? (
        <div className="showcase-icon-categories">
          {visibleCategories.map((category) => (
            <section className="showcase-icon-category" key={category.name}>
              <h4>{category.name}</h4>
              <div className="showcase-icon-grid">
                {category.entries.map(({ Icon, name }) => (
                  <button
                    aria-label={`Copy import for ${name}`}
                    className="showcase-icon-tile"
                    key={name}
                    onClick={() => void copyImport(name)}
                    title={`Copy import for ${name}`}
                    type="button"
                  >
                    <Icon aria-hidden={true} className="showcase-icon-preview" />
                    <span className="showcase-icon-name">
                      {copiedIcon === name ? "Copied" : name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="showcase-icon-empty">No icons match the current filters.</p>
      )}
    </div>
  );
}

export const iconsShowcase = defineShowcase({
  id: "icons",
  name: "Icons",
  category: "General",
  stage: "prod",
  description: "A consistent collection of interface icons for Launch++ and its plugins.",
  usage: `import { PlusOutlined, SettingOutlined } from "@launchpp/ui/icons";
import { Button } from "@launchpp/ui";

<PlusOutlined aria-hidden />

<Button
  aria-label="Add project"
  icon={<PlusOutlined />}
  iconOnly
/>`,
  whenToUse: [
    "Use icons to clarify actions, navigation, and status without replacing necessary labels.",
    "Select icons from this public entry point so core features and plugins use the same visual language.",
  ],
  examples: [
    {
      id: "icon-gallery",
      name: "List of icons",
      description:
        "Filter or search the collection, then select an icon to copy its import statement.",
      preview: IconGallery,
      presentation: "plain",
    },
  ],
  accessibility: [
    "Hide decorative icons from assistive technology with aria-hidden.",
    "Give icon-only controls a concise accessible label on the control itself.",
    "Do not communicate status or meaning through an icon alone when a text label is needed.",
  ],
});
