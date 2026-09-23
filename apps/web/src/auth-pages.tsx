import { Alert, Button, Input, Spin, Typography } from "@launchpp/ui";
import { type FormEvent, type PropsWithChildren, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

function AuthLayout({ children, title }: PropsWithChildren<{ readonly title: string }>) {
  return (
    <main className="auth-layout">
      <section className="auth-form-panel">
        <div className="auth-form-content">
          <Link className="auth-brand" to="/">
            <span>L+</span>
            Launch++
          </Link>
          <Typography.Title level={1}>{title}</Typography.Title>
          {children}
        </div>
      </section>
      <aside className="auth-presentation" aria-hidden="true">
        <div className="auth-principle">
          <Typography.Title level={2}>Plan clearly. Extend freely.</Typography.Title>
          <Typography.Text>
            A calm project workspace with a plugin platform designed to grow with your team.
          </Typography.Text>
        </div>
      </aside>
    </main>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: PropsWithChildren<{ readonly htmlFor: string; readonly label: string }>) {
  return (
    <label className="auth-field" htmlFor={htmlFor}>
      <Typography.Text>{label}</Typography.Text>
      {children}
    </label>
  );
}

function ErrorMessage({ error }: { readonly error: unknown }) {
  return error instanceof Error ? <Alert title={error.message} type="error" /> : null;
}

export function InstallationBoundary({
  children,
  requiresSetup,
}: PropsWithChildren<{ readonly requiresSetup: boolean }>) {
  const api = useApiClient();
  const [currentState, setCurrentState] = useState<boolean>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void api.setup
      .status()
      .then((status) => {
        if (active) setCurrentState(status.requiresSetup);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (error) {
    return (
      <AuthLayout title="Unable to load Launch++">
        <ErrorMessage error={error} />
      </AuthLayout>
    );
  }
  if (currentState === undefined) return <Spin fullscreen description="Loading Launch++" />;
  if (currentState !== requiresSetup) return <Navigate replace to="/" />;
  return children;
}

export function EntryRedirect() {
  const api = useApiClient();
  const [destination, setDestination] = useState<string>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void api.setup
      .status()
      .then(async (setup) => {
        if (setup.requiresSetup) return "/setup";
        return (await api.auth.session()) ? "/app" : "/sign-in";
      })
      .then((nextDestination) => {
        if (active) setDestination(nextDestination);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (error) {
    return (
      <AuthLayout title="Unable to open Launch++">
        <ErrorMessage error={error} />
      </AuthLayout>
    );
  }
  return destination ? (
    <Navigate replace to={destination} />
  ) : (
    <Spin fullscreen description="Opening Launch++" />
  );
}

export function AuthenticatedRoute({ children }: PropsWithChildren) {
  const api = useApiClient();
  const location = useLocation();
  const [access, setAccess] = useState<"anonymous" | "authenticated" | "loading" | "setup">(
    "loading",
  );
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void (async () => {
      const status = await api.setup.status();
      if (!active) return;
      if (status.requiresSetup) {
        setAccess("setup");
        return;
      }
      const session = await api.auth.session();
      if (active) setAccess(session ? "authenticated" : "anonymous");
    })().catch((reason: unknown) => {
      if (active) setError(reason);
    });
    return () => {
      active = false;
    };
  }, [api]);

  if (error) {
    return (
      <AuthLayout title="Unable to load your session">
        <ErrorMessage error={error} />
      </AuthLayout>
    );
  }
  if (access === "loading") return <Spin fullscreen description="Loading session" />;
  if (access === "setup") return <Navigate replace to="/setup" />;
  if (access === "anonymous") {
    return <Navigate replace state={{ from: location.pathname }} to="/sign-in" />;
  }
  return children;
}

export function WorkspaceRequiredRoute({ children }: PropsWithChildren) {
  const api = useApiClient();
  const [hasWorkspace, setHasWorkspace] = useState<boolean>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void api.workspaces
      .list()
      .then((context) => {
        if (active) setHasWorkspace(Boolean(context.currentWorkspaceId));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (error) {
    return (
      <AuthLayout title="Unable to open your workspace">
        <ErrorMessage error={error} />
      </AuthLayout>
    );
  }
  if (hasWorkspace === undefined) return <Spin fullscreen description="Loading workspace" />;
  if (!hasWorkspace) return <Navigate replace to="/workspace-setup" />;
  return children;
}

export function SetupPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const token = fragment.get("token");
      if (token) {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        await api.setup.claim(token);
        if (active) setAuthorized(true);
        return;
      }
      const status = await api.setup.status();
      if (typeof status.setupAuthorized !== "boolean") {
        throw new Error("The Launch++ server is out of date. Rebuild and restart it to continue.");
      }
      if (active) setAuthorized(status.setupAuthorized);
    })().catch((reason: unknown) => {
      if (!active) return;
      setError(reason);
      setAuthorized(false);
    });
    return () => {
      active = false;
    };
  }, [api]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(undefined);
    setLoading(true);
    try {
      await api.setup.createOwner({
        email: String(data.get("email") ?? ""),
        name: String(data.get("name") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      navigate("/workspace-setup", { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  };

  if (authorized === undefined) {
    return <Spin fullscreen description="Preparing secure setup" />;
  }

  if (!authorized) {
    return (
      <AuthLayout title="Authorize setup">
        <ErrorMessage error={error} />
        <Alert
          description="Open the one-time setup URL printed by the server. Local installations authorize this browser automatically."
          showIcon
          title="Authorized setup link required"
          type="info"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set up Launch++">
      <Typography.Paragraph type="secondary">
        Create the first owner account for this installation.
      </Typography.Paragraph>
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="setup-name" label="Your name">
          <Input autoComplete="name" id="setup-name" name="name" required />
        </Field>
        <Field htmlFor="setup-email" label="Email">
          <Input autoComplete="email" id="setup-email" name="email" required type="email" />
        </Field>
        <Field htmlFor="setup-password" label="Password">
          <Input.Password
            autoComplete="new-password"
            id="setup-password"
            minLength={12}
            name="password"
            required
          />
        </Field>
        <Button block loading={loading} type="submit" variant="primary">
          Create owner account
        </Button>
      </form>
    </AuthLayout>
  );
}

export function WorkspaceSetupPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void api.workspaces
      .list()
      .then((context) => {
        if (!active) return;
        if (context.currentWorkspaceId) {
          navigate("/app", { replace: true });
          return;
        }
        setChecking(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason);
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [api, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("workspaceName") ?? "").trim();
    if (!name) return;
    setError(undefined);
    setLoading(true);
    try {
      await api.workspaces.create(name);
      navigate("/app", { replace: true });
    } catch (reason) {
      setError(reason);
      setLoading(false);
    }
  };

  if (checking) return <Spin fullscreen description="Preparing your workspace" />;

  return (
    <AuthLayout title="Create your workspace">
      <Typography.Paragraph type="secondary">
        Give the place where your projects live a clear name. You can change it later.
      </Typography.Paragraph>
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="workspace-name" label="Workspace name">
          <Input
            autoFocus
            id="workspace-name"
            maxLength={80}
            name="workspaceName"
            placeholder="Acme"
            required
          />
        </Field>
        <Button block loading={loading} type="submit" variant="primary">
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}

export function SignInPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(undefined);
    setLoading(true);
    try {
      await api.auth.signIn({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      const from = (location.state as { from?: string } | null)?.from ?? "/app";
      navigate(from, { replace: true });
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back">
      <Typography.Paragraph type="secondary">
        Sign in to continue to your workspace.
      </Typography.Paragraph>
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="sign-in-email" label="Email">
          <Input autoComplete="email" id="sign-in-email" name="email" required type="email" />
        </Field>
        <Field htmlFor="sign-in-password" label="Password">
          <Input.Password
            autoComplete="current-password"
            id="sign-in-password"
            name="password"
            required
          />
        </Field>
        <div className="auth-form-meta">
          <Link to="/recover">Forgot password?</Link>
        </div>
        <Button block loading={loading} type="submit" variant="primary">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

export function RecoveryPage() {
  const api = useApiClient();
  const [capabilities, setCapabilities] = useState<{
    readonly email: boolean;
    readonly operatorRecovery: boolean;
  }>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void api.auth
      .recoveryCapabilities()
      .then((result) => {
        if (active) setCapabilities(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [api]);

  return (
    <AuthLayout title="Recover access">
      <ErrorMessage error={error} />
      {!error && !capabilities ? <Spin description="Checking recovery options" /> : null}
      {capabilities && !capabilities.email && capabilities.operatorRecovery ? (
        <Alert
          description="Email recovery is not configured yet. Ask the installation operator to restore access locally."
          showIcon
          title="Operator recovery required"
          type="info"
        />
      ) : null}
      <div className="auth-recovery-action">
        <Link to="/sign-in">Return to sign in</Link>
      </div>
    </AuthLayout>
  );
}
