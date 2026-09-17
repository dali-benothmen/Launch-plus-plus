import { Button, Empty, Typography } from "@launchpp/ui";

export function MyWorkPage() {
  return (
    <section aria-labelledby="my-work-title" className="page-stack">
      <header className="page-header">
        <div>
          <Typography.Text className="eyebrow">Workspace</Typography.Text>
          <Typography.Title id="my-work-title" level={1}>
            My Work
          </Typography.Title>
          <Typography.Text type="secondary">
            Your projects and assigned work will appear here.
          </Typography.Text>
        </div>
        <Button type="primary">Create project</Button>
      </header>
      <div className="empty-surface">
        <Empty description="Create your first project to get started">
          <Button type="primary">Create project</Button>
        </Empty>
      </div>
    </section>
  );
}

export function MembersPage() {
  return (
    <section aria-labelledby="members-title" className="page-stack">
      <Typography.Title id="members-title" level={1}>
        Members
      </Typography.Title>
      <Typography.Text type="secondary">
        Workspace membership will be available with the collaboration slice.
      </Typography.Text>
    </section>
  );
}

export function SettingsPage() {
  return (
    <section aria-labelledby="settings-title" className="page-stack">
      <Typography.Title id="settings-title" level={1}>
        Settings
      </Typography.Title>
      <Typography.Text type="secondary">
        Account, workspace, appearance, and plugin settings will live here.
      </Typography.Text>
    </section>
  );
}
