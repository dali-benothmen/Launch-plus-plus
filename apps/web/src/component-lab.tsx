import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";

import "./component-lab.css";

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m3.5 8.2 2.7 2.7 6.3-6.3" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="3" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="13" cy="8" r="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg aria-hidden="true" className="lab-loading-icon" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  );
}

function StatusIcon({ variant }: { readonly variant: "error" | "info" | "success" | "warning" }) {
  const symbols = { error: "×", info: "i", success: "✓", warning: "!" } as const;
  return (
    <span aria-hidden="true" className={`lab-alert-icon is-${variant}`}>
      {symbols[variant]}
    </span>
  );
}

function LabCard({
  children,
  description,
  title,
}: {
  readonly children: React.ReactNode;
  readonly description?: string;
  readonly title: string;
}) {
  return (
    <section className="lab-card">
      <header className="lab-card-header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

interface SelectExampleProps {
  readonly ariaLabel?: string;
  readonly defaultValue?: string;
  readonly options?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
}

const teamOptions = [
  { label: "Design team", value: "design" },
  { label: "Engineering", value: "engineering" },
  { label: "Marketing", value: "marketing" },
] as const;

const roleOptions = [
  { label: "Member", value: "member" },
  { label: "Administrator", value: "admin" },
] as const;

function SelectExample({
  ariaLabel = "Team",
  defaultValue = "design",
  options = teamOptions,
}: SelectExampleProps = {}) {
  return (
    <Select.Root defaultValue={defaultValue}>
      <Select.Trigger aria-label={ariaLabel} className="lab-select-trigger">
        <Select.Value />
        <Select.Icon className="lab-select-icon">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="lab-select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item className="lab-select-item" key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="lab-item-indicator">
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function DropdownExample() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button aria-label="Open actions" className="lab-icon-button" type="button">
          <MoreIcon />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="lab-menu-content" sideOffset={6}>
          <DropdownMenu.Item className="lab-menu-item">Edit details</DropdownMenu.Item>
          <DropdownMenu.Item className="lab-menu-item">Make a copy</DropdownMenu.Item>
          <DropdownMenu.Separator className="lab-menu-separator" />
          <DropdownMenu.Item className="lab-menu-item is-danger">Archive item</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ModalExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="lab-button is-primary" type="button">
          Open modal
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lab-dialog-overlay" />
        <Dialog.Content className="lab-dialog-content">
          <div className="lab-dialog-heading">
            <div>
              <Dialog.Title>Invite a teammate</Dialog.Title>
              <Dialog.Description>
                They’ll receive access to the selected workspace.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Close" className="lab-icon-button is-quiet" type="button">
                <CloseIcon />
              </button>
            </Dialog.Close>
          </div>

          <div className="lab-field-stack">
            <label className="lab-field">
              <span>Email address</span>
              <input placeholder="name@company.com" type="email" />
            </label>
            <div className="lab-field">
              <span>Role</span>
              <SelectExample ariaLabel="Role" defaultValue="member" options={roleOptions} />
            </div>
          </div>

          <div className="lab-dialog-actions">
            <Dialog.Close asChild>
              <button className="lab-button" type="button">
                Cancel
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button className="lab-button is-primary" type="button">
                Send invitation
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ComponentLabPage() {
  const [notifications, setNotifications] = useState(true);

  return (
    <Tooltip.Provider delayDuration={300}>
      <main className="component-lab">
        <header className="lab-hero">
          <div>
            <span className="lab-kicker">Launch++ design system · Radix + CSS</span>
            <h1>Component study</h1>
            <p>
              A focused component language with a clear blue primary, semantic variants, compact
              controls, and a four-pixel rhythm.
            </p>
          </div>
          <div aria-label="Color palette" className="lab-palette">
            <span className="is-primary" title="Primary" />
            <span className="is-success" title="Success" />
            <span className="is-warning" title="Warning" />
            <span className="is-error" title="Error" />
          </div>
        </header>

        <div className="lab-grid">
          <LabCard description="Color and variant are independent in the v6 model." title="Actions">
            <div className="lab-row">
              <button className="lab-button is-primary" type="button">
                Primary action
              </button>
              <button className="lab-button" type="button">
                Default
              </button>
              <button className="lab-button is-dashed" type="button">
                Dashed
              </button>
              <button className="lab-button is-filled" type="button">
                Filled
              </button>
              <button className="lab-button is-text" type="button">
                Text
              </button>
              <button className="lab-button is-link" type="button">
                Link
              </button>
            </div>
            <div className="lab-row is-state-row">
              <button className="lab-button is-danger" type="button">
                Danger
              </button>
              <button className="lab-button is-primary" disabled type="button">
                Disabled
              </button>
              <button aria-busy="true" className="lab-button is-primary" type="button">
                <LoadingIcon />
                Loading
              </button>
            </div>
            <div className="lab-row is-secondary">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button aria-label="More information" className="lab-icon-button" type="button">
                    ?
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="lab-tooltip" sideOffset={6}>
                    Helpful context appears here
                    <Tooltip.Arrow className="lab-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <DropdownExample />
              <ModalExample />
            </div>
          </LabCard>

          <LabCard
            description="Outlined and filled fields share one interaction contract."
            title="Form controls"
          >
            <div className="lab-field-stack">
              <label className="lab-field">
                <span>Project name</span>
                <input defaultValue="Launch website" />
                <small>Use a short, recognizable name.</small>
              </label>
              <div className="lab-field-grid">
                <label className="lab-field">
                  <span>Team</span>
                  <SelectExample />
                </label>
                <label className="lab-field is-error">
                  <span>Project key</span>
                  <input aria-invalid="true" defaultValue="LP!" />
                  <small>Use letters and numbers only.</small>
                </label>
              </div>
              <div className="lab-field-grid">
                <label className="lab-field">
                  <span>Filled variant</span>
                  <input className="is-filled" defaultValue="launch-plus-plus" spellCheck="false" />
                </label>
                <label className="lab-field">
                  <span>Underlined variant</span>
                  <input className="is-underlined" defaultValue="Maya Chen" />
                </label>
              </div>
              <div className="lab-switch-row">
                <div>
                  <strong>Activity notifications</strong>
                  <span>Receive updates when work changes.</span>
                </div>
                <Switch.Root
                  aria-label="Activity notifications"
                  checked={notifications}
                  className="lab-switch"
                  onCheckedChange={setNotifications}
                >
                  <Switch.Thumb className="lab-switch-thumb" />
                </Switch.Root>
              </div>
            </div>
          </LabCard>

          <LabCard
            description="Selection is communicated with color, fill, or a precise ink bar."
            title="Tabs and tags"
          >
            <Tabs.Root className="lab-tabs" defaultValue="overview">
              <Tabs.List aria-label="Item information" className="lab-tabs-list">
                <Tabs.Trigger className="lab-tab" value="overview">
                  Overview
                </Tabs.Trigger>
                <Tabs.Trigger className="lab-tab" value="activity">
                  Activity
                </Tabs.Trigger>
                <Tabs.Trigger className="lab-tab" value="files">
                  Files <span className="lab-count">3</span>
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content className="lab-tab-content" value="overview">
                <p>
                  Use tabs for neighboring views of the same object. The active state stays quiet
                  but unmistakable.
                </p>
                <div className="lab-tags">
                  <span className="lab-tag is-blue is-filled">In progress</span>
                  <span className="lab-tag is-purple">Design</span>
                  <span className="lab-tag is-green is-solid">Approved</span>
                  <span className="lab-tag">Neutral</span>
                </div>
              </Tabs.Content>
              <Tabs.Content className="lab-tab-content" value="activity">
                <p>Recent changes would appear here in a compact chronological list.</p>
              </Tabs.Content>
              <Tabs.Content className="lab-tab-content" value="files">
                <p>Three files are attached to this example item.</p>
              </Tabs.Content>
            </Tabs.Root>
          </LabCard>

          <LabCard
            description="Semantic color supports the message without replacing it."
            title="Feedback"
          >
            <div className="lab-alert-stack">
              <div className="lab-alert is-success">
                <StatusIcon variant="success" />
                <div>
                  <strong>Changes saved</strong>
                  <span>Your updates are now available to the team.</span>
                </div>
              </div>
              <div className="lab-alert is-info">
                <StatusIcon variant="info" />
                <div>
                  <strong>New version available</strong>
                  <span>Refresh when you’re ready to see the latest changes.</span>
                </div>
              </div>
              <div className="lab-alert is-warning">
                <StatusIcon variant="warning" />
                <div>
                  <strong>Review needed</strong>
                  <span>Two required fields still need your attention.</span>
                </div>
              </div>
              <div className="lab-alert is-error">
                <StatusIcon variant="error" />
                <div>
                  <strong>Couldn’t save changes</strong>
                  <span>Check your connection and try again.</span>
                </div>
              </div>
            </div>
          </LabCard>

          <section className="lab-card is-wide">
            <header className="lab-card-header is-inline">
              <div>
                <h2>Data table</h2>
                <p>Default density, with hierarchy carried by borders and typography.</p>
              </div>
              <button className="lab-button" type="button">
                Export
              </button>
            </header>
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Website refresh</strong>
                    </td>
                    <td>
                      <span className="lab-status">
                        <i className="is-blue" />
                        In progress
                      </span>
                    </td>
                    <td>Maya Chen</td>
                    <td>12 minutes ago</td>
                    <td>
                      <DropdownExample />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Mobile onboarding</strong>
                    </td>
                    <td>
                      <span className="lab-status">
                        <i className="is-green" />
                        Completed
                      </span>
                    </td>
                    <td>Alex Smith</td>
                    <td>Yesterday</td>
                    <td>
                      <DropdownExample />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Research synthesis</strong>
                    </td>
                    <td>
                      <span className="lab-status">
                        <i className="is-gold" />
                        In review
                      </span>
                    </td>
                    <td>Sam Rivera</td>
                    <td>Sep 16</td>
                    <td>
                      <DropdownExample />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </Tooltip.Provider>
  );
}
