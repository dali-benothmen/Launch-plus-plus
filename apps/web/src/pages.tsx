import { Button, Card, Typography } from "@launchpp/ui";

export function MyWorkPage() {
  return (
    <section aria-labelledby="my-work-title" className="page-stack">
      <header className="page-header">
        <div>
          <Typography.Text type="secondary">Workspace</Typography.Text>
          <Typography.Title id="my-work-title" level={1}>
            My Work
          </Typography.Title>
          <Typography.Text type="secondary">
            Your projects and assigned work will appear here.
          </Typography.Text>
        </div>
        <Button variant="primary">Create project</Button>
      </header>
      <Card className="home-empty-card">
        <div className="home-empty-state">
          <Typography.Title level={3}>No projects yet</Typography.Title>
          <Typography.Text type="secondary">
            Create your first project to get started.
          </Typography.Text>
          <Button className="home-empty-action" variant="primary">
            Create project
          </Button>
        </div>
      </Card>
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
