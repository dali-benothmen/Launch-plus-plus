import { Alert, Button, Card, Typography } from "@launchpp/ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

export function MyWorkPage() {
  const navigate = useNavigate();
  const openProjectCreation = () => navigate("/app/projects/new");

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
        <Button onClick={openProjectCreation} variant="primary">
          Create project
        </Button>
      </header>
      <Card className="home-empty-card">
        <div className="home-empty-state">
          <Typography.Title level={3}>No projects yet</Typography.Title>
          <Typography.Text type="secondary">
            Create your first project to get started.
          </Typography.Text>
          <Button className="home-empty-action" onClick={openProjectCreation} variant="primary">
            Create project
          </Button>
        </div>
      </Card>
    </section>
  );
}

export function ProjectCreationEntryPage() {
  return (
    <section aria-labelledby="project-creation-title" className="page-stack">
      <Typography.Text type="secondary">First project</Typography.Text>
      <Typography.Title id="project-creation-title" level={1}>
        Create your first project
      </Typography.Title>
      <Alert
        description="Your owner account is ready. Workspace-backed project creation is the next product task."
        showIcon
        title="Setup complete"
        type="success"
      />
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
  const api = useApiClient();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setError(undefined);
    setSigningOut(true);
    try {
      await api.auth.signOut();
      navigate("/sign-in", { replace: true });
    } catch (reason) {
      setError(reason);
      setSigningOut(false);
    }
  };

  return (
    <section aria-labelledby="settings-title" className="page-stack">
      <Typography.Title id="settings-title" level={1}>
        Settings
      </Typography.Title>
      <Typography.Text type="secondary">
        Account, workspace, appearance, and plugin settings will live here.
      </Typography.Text>
      {error instanceof Error ? <Alert title={error.message} type="error" /> : null}
      <div className="settings-actions">
        <Button loading={signingOut} onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
