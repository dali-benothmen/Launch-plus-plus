import { Alert, Button, Checkbox, GoogleIcon, Input, Spin, Typography } from "@launchpp/ui";
import { type FormEvent, type PropsWithChildren, type ReactNode, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useApiClient } from "./api-client-context.js";

type AuthPresentation = "board" | "plugins";

function BoardPresentation() {
  return (
    <>
      <span className="auth-presentation-kicker">The Launch++ philosophy</span>
      <div className="auth-board-preview">
        <div className="auth-board-column">
          <span>To do</span>
          <i className="is-card is-bright" />
          <i className="is-card is-muted" />
          <i className="is-card is-faint" />
        </div>
        <div className="auth-board-column is-lower">
          <span>In progress</span>
          <i className="is-card is-orange" />
          <i className="is-card is-muted" />
        </div>
        <div className="auth-board-column is-offset">
          <span>Completed</span>
          <i className="is-card is-green" />
          <i className="is-card is-muted" />
        </div>
        <div className="auth-board-add">+</div>
      </div>
      <div className="auth-presentation-message">
        <p>
          Most tools ask your team to change. Launch++ changes instead &mdash; columns, fields and
          plugins bend to how you already work.
        </p>
        <div className="auth-presentation-points">
          <span>Kanban or list</span>
          <span>Custom columns</span>
          <span>Plugin system</span>
        </div>
      </div>
    </>
  );
}

function PluginPresentation() {
  return (
    <>
      <span className="auth-presentation-kicker">Built to be reshaped</span>
      <div className="auth-plugin-preview">
        <div className="auth-plugin-row">
          <i className="auth-plugin-icon is-blue" />
          <div>
            <strong>Time tracking</strong>
            <span>Plugin &middot; installed</span>
          </div>
          <i className="auth-plugin-toggle" />
        </div>
        <div className="auth-plugin-row">
          <i className="auth-plugin-icon is-violet" />
          <div>
            <strong>Client updates</strong>
            <span>Plugin &middot; installed</span>
          </div>
          <i className="auth-plugin-toggle" />
        </div>
        <div className="auth-plugin-row is-placeholder">
          <i className="auth-plugin-add">+</i>
          <span>Upload your own</span>
        </div>
      </div>
      <div className="auth-presentation-message">
        <p>
          A task tool is only simple when it holds exactly what you need &mdash; and nothing a
          plugin could have added later.
        </p>
        <span className="auth-presentation-attribution">Built for focused, adaptable work.</span>
      </div>
    </>
  );
}

function AuthLayout({
  children,
  presentation = "board",
  title,
}: PropsWithChildren<{
  readonly presentation?: AuthPresentation;
  readonly title: string;
}>) {
  return (
    <main className={"auth-layout is-" + presentation}>
      <section className="auth-form-panel">
        <div className="auth-form-content">
          <Link className="auth-brand" to="/">
            <span>L</span>
            Launch++
          </Link>
          <div className="auth-heading">
            <Typography.Title level={1}>{title}</Typography.Title>
          </div>
          {children}
        </div>
      </section>
      <aside className="auth-presentation" aria-hidden="true">
        {presentation === "plugins" ? <PluginPresentation /> : <BoardPresentation />}
      </aside>
    </main>
  );
}

function Field({
  action,
  children,
  htmlFor,
  label,
}: PropsWithChildren<{
  readonly action?: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
}>) {
  return (
    <div className="auth-field">
      <div className="auth-field-heading">
        <label htmlFor={htmlFor}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ErrorMessage({ error }: { readonly error: unknown }) {
  return error instanceof Error ? <Alert title={error.message} type="error" /> : null;
}

function FieldError({ message }: { readonly message: string }) {
  return message ? (
    <Typography.Text style={{ fontSize: 12 }} type="danger">
      {message}
    </Typography.Text>
  ) : null;
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

export function OrganizationRequiredRoute({ children }: PropsWithChildren) {
  const api = useApiClient();
  const [hasOrganization, setHasOrganization] = useState<boolean>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void api.organizations
      .list()
      .then((context) => {
        if (active) setHasOrganization(Boolean(context.currentOrganizationId));
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
      <AuthLayout title="Unable to open your organization">
        <ErrorMessage error={error} />
      </AuthLayout>
    );
  }
  if (hasOrganization === undefined) return <Spin fullscreen description="Loading organization" />;
  if (!hasOrganization) return <Navigate replace to="/organization-setup" />;
  return children;
}

export function SetupPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean>();
  const [error, setError] = useState<unknown>();
  const [fieldErrors, setFieldErrors] = useState({ email: "", name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

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
    const email = String(data.get("email") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    const passwordValue = String(data.get("password") ?? "");
    const nextFieldErrors = {
      email:
        email.length === 0
          ? "Email is required."
          : isValidEmail(email)
            ? ""
            : "Enter a valid email address.",
      name: name.length === 0 ? "Full name is required." : "",
      password:
        passwordValue.length === 0
          ? "Password is required."
          : passwordValue.length < 12
            ? "Password must contain at least 12 characters."
            : "",
    };

    setError(undefined);
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await api.setup.createOwner({
        email,
        name,
        password: passwordValue,
      });
      navigate("/organization-setup", { replace: true });
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

  const passwordStrength = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /[^A-Za-z0-9]/.test(password) || /[0-9]/.test(password),
  ].filter(Boolean).length;

  return (
    <AuthLayout presentation="plugins" title="Create your account">
      <Typography.Paragraph
        className="auth-subtitle"
        style={{ color: "#667085", fontSize: 14, margin: "8px 0 32px" }}
        type="secondary"
      >
        Start with your account. Your organization comes next.
      </Typography.Paragraph>
      <form className="auth-form" noValidate onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="setup-name" label="Full name">
          <Input
            aria-invalid={Boolean(fieldErrors.name)}
            autoComplete="name"
            id="setup-name"
            name="name"
            onChange={() => setFieldErrors((current) => ({ ...current, name: "" }))}
            required
            size="large"
            {...(fieldErrors.name ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.name} />
        </Field>
        <Field htmlFor="setup-email" label="Work email">
          <Input
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            id="setup-email"
            name="email"
            onChange={() => setFieldErrors((current) => ({ ...current, email: "" }))}
            placeholder="Enter your email"
            required
            size="large"
            {...(fieldErrors.email ? { status: "error" as const } : {})}
            type="email"
          />
          <FieldError message={fieldErrors.email} />
        </Field>
        <Field htmlFor="setup-password" label="Password">
          <Input.Password
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="new-password"
            id="setup-password"
            minLength={12}
            name="password"
            onChange={(event) => {
              setPassword(event.currentTarget.value);
              setFieldErrors((current) => ({ ...current, password: "" }));
            }}
            placeholder="Enter your password"
            required
            size="large"
            {...(fieldErrors.password ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.password} />
          <div className="auth-password-strength" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <i className={step <= passwordStrength ? "is-active" : undefined} key={step} />
            ))}
          </div>
          <span className="auth-password-help">
            {password.length === 0
              ? "Use at least 12 characters"
              : password.length < 12
                ? password.length + " of 12 characters"
                : passwordStrength >= 4
                  ? "Strong password"
                  : "12 characters - add a mix of letters, numbers, or symbols"}
          </span>
        </Field>
        <Button
          block
          className="auth-submit"
          loading={loading}
          size="large"
          type="submit"
          variant="primary"
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

export function OrganizationSetupPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void api.organizations
      .list()
      .then((context) => {
        if (!active) return;
        if (context.currentOrganizationId) {
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
    const name = String(data.get("organizationName") ?? "").trim();
    if (!name) return;
    setError(undefined);
    setLoading(true);
    try {
      await api.organizations.create(name);
      navigate("/app", { replace: true });
    } catch (reason) {
      setError(reason);
      setLoading(false);
    }
  };

  if (checking) return <Spin fullscreen description="Preparing your organization" />;

  return (
    <AuthLayout title="Create your organization">
      <Typography.Paragraph type="secondary">
        Give the place where your projects live a clear name. You can change it later.
      </Typography.Paragraph>
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="organization-name" label="Organization name">
          <Input
            autoFocus
            id="organization-name"
            maxLength={80}
            name="organizationName"
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
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const nextFieldErrors = {
      email:
        email.length === 0
          ? "Email is required."
          : isValidEmail(email)
            ? ""
            : "Enter a valid email address.",
      password: password.length === 0 ? "Password is required." : "",
    };

    setError(undefined);
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await api.auth.signIn({
        email,
        password,
        rememberMe: data.get("rememberMe") === "on",
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
      <Typography.Paragraph
        className="auth-subtitle"
        style={{ color: "#667085", fontSize: 14, margin: "8px 0 36px" }}
        type="secondary"
      >
        Pick up where your work left off.
      </Typography.Paragraph>
      <form className="auth-form" noValidate onSubmit={submit}>
        <ErrorMessage error={error} />
        <Field htmlFor="sign-in-email" label="Email">
          <Input
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            id="sign-in-email"
            name="email"
            onChange={() => setFieldErrors((current) => ({ ...current, email: "" }))}
            placeholder="Enter your email"
            required
            size="large"
            {...(fieldErrors.email ? { status: "error" as const } : {})}
            type="email"
          />
          <FieldError message={fieldErrors.email} />
        </Field>
        <Field
          action={
            <Typography.Link
              href="/recover"
              onClick={(event) => {
                event.preventDefault();
                navigate("/recover");
              }}
            >
              Forgot?
            </Typography.Link>
          }
          htmlFor="sign-in-password"
          label="Password"
        >
          <Input.Password
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="current-password"
            id="sign-in-password"
            name="password"
            onChange={() => setFieldErrors((current) => ({ ...current, password: "" }))}
            placeholder="Enter your password"
            required
            size="large"
            {...(fieldErrors.password ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.password} />
        </Field>
        <Checkbox className="auth-remember" defaultChecked name="rememberMe">
          Keep me signed in
        </Checkbox>
        <Button
          block
          className="auth-submit"
          loading={loading}
          size="large"
          type="submit"
          variant="primary"
        >
          Sign in
        </Button>
        <div className="auth-divider">
          <span>or</span>
        </div>
        <Button
          block
          className="auth-provider-action"
          icon={<GoogleIcon />}
          onClick={() =>
            setError(new Error("Google sign-in is not configured for this installation."))
          }
          size="large"
          type="button"
        >
          Continue with Google
        </Button>
        <p className="auth-account-prompt">
          New here?{" "}
          <button
            className="auth-inline-action"
            onClick={() =>
              setError(new Error("New accounts can only be created through an invitation."))
            }
            type="button"
          >
            Create an account
          </button>
        </p>
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
