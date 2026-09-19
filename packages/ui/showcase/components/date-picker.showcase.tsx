import { SmileOutlined } from "../../src/icons.js";
import { DatePicker, type DatePickerMode, Flex, Space, Typography } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

const sampleDates = [new Date(2026, 8, 1), new Date(2026, 8, 3), new Date(2026, 8, 5)];

function BasicDatePickers() {
  const modes: ReadonlyArray<DatePickerMode> = ["date", "week", "month", "quarter", "year"];
  return (
    <Flex align="start" gap="small" vertical>
      {modes.map((mode) => (
        <DatePicker key={mode} picker={mode} placeholder={`Select ${mode}`} />
      ))}
    </Flex>
  );
}

function MultipleDatePickers() {
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker defaultValue={sampleDates} multiple size="small" />
      <DatePicker defaultValue={sampleDates} multiple />
      <DatePicker defaultValue={sampleDates} multiple size="large" />
    </Flex>
  );
}

function RangePickers() {
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker.RangePicker />
      <DatePicker.RangePicker picker="week" />
      <DatePicker.RangePicker picker="month" />
      <DatePicker.RangePicker picker="quarter" />
      <DatePicker.RangePicker picker="year" />
    </Flex>
  );
}

function ConfirmDatePicker() {
  return <DatePicker needConfirm placeholder="Choose then confirm" />;
}

function StatusDatePickers() {
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker status="error" />
      <DatePicker status="warning" />
      <DatePicker.RangePicker status="error" />
      <DatePicker.RangePicker status="warning" />
    </Flex>
  );
}

function PrefixSuffixDatePickers() {
  const smile = <SmileOutlined />;
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker suffixIcon={smile} />
      <DatePicker prefix={smile} suffixIcon={smile} />
      <DatePicker.RangePicker prefix="Event period" suffixIcon={smile} />
    </Flex>
  );
}

function DisabledDatePickers() {
  const minimum = new Date(2026, 8, 5);
  const maximum = new Date(2026, 8, 25);
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker defaultValue={new Date(2026, 8, 18)} disabled />
      <DatePicker.RangePicker
        defaultValue={[new Date(2026, 8, 10), new Date(2026, 8, 18)]}
        disabled
      />
      <DatePicker.RangePicker
        defaultValue={[new Date(2026, 8, 10), new Date(2026, 8, 18)]}
        disabled={[false, true]}
      />
      <DatePicker
        defaultPickerValue={new Date(2026, 8, 18)}
        maxDate={maximum}
        minDate={minimum}
        placeholder="September 5–25"
      />
    </Flex>
  );
}

function SizedDatePickers() {
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker placeholder="Large" size="large" />
      <DatePicker placeholder="Medium" />
      <DatePicker placeholder="Small" size="small" />
      <DatePicker.RangePicker size="large" />
      <DatePicker.RangePicker size="small" />
    </Flex>
  );
}

function VariantDatePickers() {
  return (
    <Flex align="start" gap="small" vertical>
      <DatePicker placeholder="Outlined" />
      <DatePicker placeholder="Filled" variant="filled" />
      <DatePicker placeholder="Borderless" variant="borderless" />
      <DatePicker placeholder="Underlined" variant="underlined" />
    </Flex>
  );
}

function PresetDatePickers() {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  return (
    <Space size="medium" vertical>
      <DatePicker
        presets={[
          { label: "Today", value: () => new Date() },
          { label: "Project launch", value: new Date(2026, 8, 18) },
        ]}
      />
      <DatePicker.RangePicker
        presets={[
          { label: "Last 7 days", value: [sevenDaysAgo, today] },
          { label: "Last 30 days", value: [thirtyDaysAgo, today] },
        ]}
      />
    </Space>
  );
}

function CustomizedDatePicker() {
  return (
    <DatePicker
      cellRender={(date, { originNode }) => (
        <span className="showcase-date-picker-event-cell">
          {originNode}
          {date.getDate() === 8 || date.getDate() === 18 ? <i /> : null}
        </span>
      )}
      classNames={{ popup: "showcase-date-picker-popup" }}
      defaultPickerValue={new Date(2026, 8, 18)}
      renderExtraFooter={() => <Typography.Text type="secondary">Team calendar</Typography.Text>}
      styles={{ popup: { border: "1px solid var(--launch-ui-primary-border)" } }}
    />
  );
}

export const datePickerShowcase = defineShowcase({
  id: "date-picker",
  name: "DatePicker",
  category: "Data entry",
  stage: "prod",
  description: "Lets people type or select dates, multiple dates, and date ranges.",
  usage: `import { DatePicker } from "@launchpp/ui";

const { RangePicker } = DatePicker;`,
  whenToUse: [
    "Use DatePicker when a date is easier to select from a calendar than enter manually.",
    "Use RangePicker when the start and end dates form one meaningful value.",
  ],
  examples: [
    {
      id: "date-picker-basic",
      name: "Basic",
      description: "Select a date, week, month, quarter, or year from the corresponding panel.",
      preview: BasicDatePickers,
      code: `<DatePicker />
<DatePicker picker="week" />
<DatePicker picker="month" />
<DatePicker picker="quarter" />
<DatePicker picker="year" />`,
    },
    {
      id: "date-picker-multiple",
      name: "Multiple",
      description: "Select and remove multiple dates in one field.",
      preview: MultipleDatePickers,
      code: `<DatePicker multiple defaultValue={dates} size="small" />
<DatePicker multiple defaultValue={dates} />
<DatePicker multiple defaultValue={dates} size="large" />`,
    },
    {
      id: "date-picker-range",
      name: "Range picker",
      description: "Choose a start and end date from two adjacent calendar panels.",
      preview: RangePickers,
      code: `<DatePicker.RangePicker />
<DatePicker.RangePicker picker="week" />
<DatePicker.RangePicker picker="month" />
<DatePicker.RangePicker picker="quarter" />
<DatePicker.RangePicker picker="year" />`,
    },
    {
      id: "date-picker-confirm",
      name: "Need confirm",
      description: "Keep a pending selection until the user confirms it explicitly.",
      preview: ConfirmDatePicker,
      code: `<DatePicker needConfirm onOk={(date) => save(date)} />`,
    },
    {
      id: "date-picker-status",
      name: "Status",
      description: "Communicate error and warning validation states.",
      preview: StatusDatePickers,
      code: `<DatePicker status="error" />
<DatePicker status="warning" />
<DatePicker.RangePicker status="error" />`,
    },
    {
      id: "date-picker-prefix-suffix",
      name: "Prefix and suffix",
      description: "Add context or replace the default calendar suffix icon.",
      preview: PrefixSuffixDatePickers,
      code: `<DatePicker suffixIcon={<SmileOutlined />} />
<DatePicker prefix={<SmileOutlined />} suffixIcon={<SmileOutlined />} />
<DatePicker.RangePicker prefix="Event period" />`,
    },
    {
      id: "date-picker-disabled",
      name: "Disabled and limited dates",
      description: "Disable the picker, one range input, or dates outside an allowed interval.",
      preview: DisabledDatePickers,
      code: `<DatePicker value={date} disabled />
<DatePicker.RangePicker disabled={[false, true]} />
<DatePicker minDate={minimum} maxDate={maximum} />`,
    },
    {
      id: "date-picker-sizes",
      name: "Three sizes",
      description: "Match the picker height to surrounding controls.",
      preview: SizedDatePickers,
      code: `<DatePicker size="large" />
<DatePicker size="medium" />
<DatePicker size="small" />`,
    },
    {
      id: "date-picker-variants",
      name: "Variants",
      description: "Use outlined, filled, borderless, or underlined field treatments.",
      preview: VariantDatePickers,
      code: `<DatePicker variant="outlined" />
<DatePicker variant="filled" />
<DatePicker variant="borderless" />
<DatePicker variant="underlined" />`,
    },
    {
      id: "date-picker-presets",
      name: "Presets",
      description: "Offer common single dates or date ranges as shortcuts.",
      preview: PresetDatePickers,
      code: `<DatePicker presets={[{ label: "Today", value: () => new Date() }]} />
<DatePicker.RangePicker presets={rangePresets} />`,
    },
    {
      id: "date-picker-customized",
      name: "Customized cells and semantics",
      description: "Render date metadata, footer content, and public semantic styles.",
      preview: CustomizedDatePicker,
      code: `<DatePicker
  cellRender={(date, { originNode }) => <EventCell date={date}>{originNode}</EventCell>}
  renderExtraFooter={() => "Team calendar"}
  classNames={{ popup: "calendar-popup" }}
  styles={{ popup: { borderColor: "blue" } }}
/>`,
    },
  ],
  api: [
    {
      name: "value / defaultValue",
      description: "Controls or initializes the selected Date value, values, or range.",
      type: "Date | Date[] | [Date | null, Date | null] | null",
    },
    {
      name: "picker",
      description: "Sets the unit selected by the panel.",
      type: '"date" | "week" | "month" | "quarter" | "year"',
      defaultValue: '"date"',
    },
    {
      name: "multiple",
      description: "Enables multiple selection in DatePicker.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "minDate / maxDate",
      description: "Limits the selectable interval.",
      type: "Date",
    },
    {
      name: "disabledDate",
      description: "Disables dates according to application rules.",
      type: "(date, info) => boolean",
    },
    {
      name: "needConfirm",
      description: "Requires an explicit OK action before committing a selection.",
      type: "boolean",
      defaultValue: "false",
    },
    {
      name: "format",
      description: "Formats the displayed date using tokens or a function.",
      type: "string | (date: Date) => string",
    },
    {
      name: "onChange",
      description: "Runs with the selected value and its formatted representation.",
      type: "(value, dateString) => void",
    },
  ],
  accessibility: [
    "Inputs remain keyboard-focusable and support typed dates unless inputReadOnly is enabled.",
    "Calendar cells expose descriptive labels and selected state.",
    "Escape closes the popup, and clicking outside dismisses it.",
  ],
});
