import { ApiError } from "@launchpp/api-client";
import { Alert, Button, Checkbox, GoogleIcon, Input, Spin, Typography } from "@launchpp/ui";
import {
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_ORGANIZATION_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "plugins",
  "settings",
  "setup",
  "support",
  "www",
]);

type OrganizationNavigationState = {
  readonly organizationSlug?: string;
};

function normalizeLocatorSlug(value: string) {
  return value.trim().toLowerCase();
}

function organizationSlugError(slug: string) {
  if (!slug) return "Enter your organization URL.";
  if (slug.length < 3 || slug.length > 48 || !ORGANIZATION_SLUG_PATTERN.test(slug)) {
    return "Use 3 to 48 lowercase letters, numbers, or single hyphens.";
  }
  if (RESERVED_ORGANIZATION_SLUGS.has(slug)) {
    return `The organization URL “${slug}” is reserved. Choose another address.`;
  }
  return "";
}

type RegistrationFieldErrors = {
  email: string;
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  password: string;
};

function emptyRegistrationFieldErrors(): RegistrationFieldErrors {
  return {
    email: "",
    organizationName: "",
    organizationSlug: "",
    ownerName: "",
    password: "",
  };
}

function organizationNameFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OrganizationLocatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const organizationInput = useRef<HTMLInputElement>(null);
  const attemptedSlug = normalizeLocatorSlug(
    (location.state as OrganizationNavigationState | null)?.organizationSlug ?? "",
  );
  const [slug, setSlug] = useState(attemptedSlug);
  const [fieldError, setFieldError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSlug = normalizeLocatorSlug(slug);
    const nextError = organizationSlugError(normalizedSlug);
    setSlug(normalizedSlug);
    setFieldError(nextError);
    if (nextError) {
      organizationInput.current?.focus();
      return;
    }
    navigate(`/o/${encodeURIComponent(normalizedSlug)}`);
  };

  return (
    <AuthLayout title="Open your organization">
      <Typography.Paragraph className="auth-locator-subtitle" type="secondary">
        Enter the organization URL used by your team.
      </Typography.Paragraph>
      <form className="auth-form" noValidate onSubmit={submit}>
        <Field htmlFor="organization-slug" label="Organization">
          <Input
            aria-invalid={Boolean(fieldError)}
            autoCapitalize="none"
            autoFocus
            autoComplete="organization"
            autoCorrect="off"
            id="organization-slug"
            maxLength={48}
            name="organizationSlug"
            onChange={(event) => {
              setSlug(normalizeLocatorSlug(event.currentTarget.value));
              setFieldError("");
            }}
            placeholder="acme"
            ref={organizationInput}
            size="large"
            spellCheck={false}
            suffix={<span className="auth-organization-suffix">.launchpp.app</span>}
            value={slug}
            {...(fieldError ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldError} />
        </Field>
        <Button block className="auth-submit" size="large" type="submit" variant="primary">
          Continue
        </Button>
        <Button onClick={() => navigate("/organizations/new")} type="button" variant="link">
          Create a new organization
        </Button>
      </form>
    </AuthLayout>
  );
}

export function OrganizationEntryPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const { organizationSlug = "" } = useParams();
  const normalizedSlug = normalizeLocatorSlug(organizationSlug);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setMissing(false);
    setError(undefined);
    void api.organizationDirectory
      .resolve(normalizedSlug)
      .then((organization) => {
        if (!active) return;
        if (!organization.exists) {
          setMissing(true);
          return;
        }
        navigate(`/o/${organization.slug}/sign-in`, {
          replace: true,
          state: { organization },
        });
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      });
    return () => {
      active = false;
    };
  }, [api, navigate, normalizedSlug]);

  if (error) {
    return (
      <AuthLayout title="Unable to open your organization">
        <ErrorMessage error={error} />
        <div className="auth-locator-back">
          <Button onClick={() => navigate("/")} type="button">
            Try another organization
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (missing) {
    const organizationState: OrganizationNavigationState = {
      organizationSlug: normalizedSlug,
    };

    return (
      <AuthLayout title={`We couldn't find “${normalizedSlug}”`}>
        <Typography.Paragraph className="auth-not-found-copy" type="secondary">
          Check the organization address, or deliberately create a new organization using this
          address.
        </Typography.Paragraph>
        <div className="auth-not-found-actions">
          <Button onClick={() => navigate("/", { state: organizationState })} type="button">
            Back
          </Button>
          <Button
            onClick={() =>
              navigate(`/organizations/new?slug=${encodeURIComponent(normalizedSlug)}`, {
                state: organizationState,
              })
            }
            type="button"
            variant="primary"
          >
            Create “{normalizedSlug}”
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return <Spin fullscreen description="Opening organization" />;
}

export function OrganizationRegistrationPage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParameters] = useSearchParams();
  const navigationSlug = (location.state as OrganizationNavigationState | null)?.organizationSlug;
  const initialSlug = normalizeLocatorSlug(navigationSlug ?? searchParameters.get("slug") ?? "");
  const slugInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const registrationKey = useRef<string | undefined>(undefined);
  const [slug, setSlug] = useState(initialSlug);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>(
    emptyRegistrationFieldErrors,
  );
  const [error, setError] = useState<unknown>();
  const [signInNotice, setSignInNotice] = useState<
    { description: string; title: string } | undefined
  >();
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: keyof RegistrationFieldErrors) => {
    registrationKey.current = globalThis.crypto.randomUUID();
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setError(undefined);
    setSignInNotice(undefined);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const organizationName = String(data.get("organizationName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const organizationSlug = normalizeLocatorSlug(slug);
    const ownerName = String(data.get("ownerName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const passwordValue = String(data.get("password") ?? "");
    const nextFieldErrors: RegistrationFieldErrors = {
      email:
        email.length === 0
          ? "Work email is required."
          : email.length > 320 || !isValidEmail(email)
            ? "Enter a valid email address."
            : "",
      organizationName:
        organizationName.length === 0
          ? "Organization name is required."
          : organizationName.length > 80
            ? "Organization name cannot exceed 80 characters."
            : "",
      organizationSlug: organizationSlugError(organizationSlug),
      ownerName:
        ownerName.length === 0
          ? "Your name is required."
          : ownerName.length > 100
            ? "Your name cannot exceed 100 characters."
            : "",
      password:
        passwordValue.length === 0
          ? "Password is required."
          : passwordValue.length < 12 || passwordValue.length > 128
            ? "Password must contain between 12 and 128 characters."
            : "",
    };

    setSlug(organizationSlug);
    setFieldErrors(nextFieldErrors);
    setError(undefined);
    setSignInNotice(undefined);

    const firstInvalidField = (
      ["organizationName", "organizationSlug", "ownerName", "email", "password"] as const
    ).find((field) => nextFieldErrors[field]);
    if (firstInvalidField) {
      (form.elements.namedItem(firstInvalidField) as HTMLElement | null)?.focus();
      return;
    }

    const input = {
      email,
      organizationName,
      organizationSlug,
      ownerName,
      password: passwordValue,
    };
    const idempotencyKey = registrationKey.current ?? globalThis.crypto.randomUUID();
    registrationKey.current = idempotencyKey;

    submitting.current = true;
    setLoading(true);
    try {
      const result = await api.organizationRegistrations.create(input, {
        idempotencyKey,
      });
      navigate(result.destination, { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError) {
        if (
          reason.code === "organization_slug_invalid" ||
          reason.code === "organization_slug_unavailable"
        ) {
          setFieldErrors((current) => ({
            ...current,
            organizationSlug: reason.message,
          }));
          slugInput.current?.focus();
          return;
        }
        if (reason.code === "account_already_exists") {
          setFieldErrors((current) => ({
            ...current,
            email: reason.message,
          }));
          setSignInNotice({
            description: "Use the existing account, or register with a different work email.",
            title: "This email already has an account",
          });
          emailInput.current?.focus();
          return;
        }
        if (
          reason.code === "organization_registration_disabled" ||
          reason.code === "organization_access_denied"
        ) {
          setSignInNotice({
            description: reason.message,
            title: "Sign in to continue",
          });
          return;
        }
        if (reason.code === "registration_failed" && reason.correlationId) {
          setError(new Error(`${reason.message} Reference: ${reason.correlationId}.`));
          return;
        }
      }
      setError(reason);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const passwordStrength = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /[^A-Za-z0-9]/.test(password) || /[0-9]/.test(password),
  ].filter(Boolean).length;

  return (
    <AuthLayout presentation="plugins" title="Create your organization">
      <Typography.Paragraph className="auth-locator-subtitle" type="secondary">
        Create the organization and owner account you will use to enter Launch++.
      </Typography.Paragraph>
      <form className="auth-form" noValidate onSubmit={submit}>
        <ErrorMessage error={error} />
        {signInNotice ? (
          <Alert
            action={
              <Button onClick={() => navigate("/sign-in")} type="button" variant="link">
                Sign in
              </Button>
            }
            description={signInNotice.description}
            showIcon
            title={signInNotice.title}
            type="info"
          />
        ) : null}
        <Field htmlFor="registration-organization-name" label="Organization name">
          <Input
            aria-invalid={Boolean(fieldErrors.organizationName)}
            autoComplete="organization"
            defaultValue={organizationNameFromSlug(initialSlug)}
            disabled={loading}
            id="registration-organization-name"
            maxLength={80}
            name="organizationName"
            onChange={() => clearFieldError("organizationName")}
            placeholder="Acme Inc."
            size="large"
            {...(fieldErrors.organizationName ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.organizationName} />
        </Field>
        <Field htmlFor="registration-organization-slug" label="Organization URL">
          <Input
            aria-invalid={Boolean(fieldErrors.organizationSlug)}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            disabled={loading}
            id="registration-organization-slug"
            maxLength={48}
            name="organizationSlug"
            onChange={(event) => {
              setSlug(normalizeLocatorSlug(event.currentTarget.value));
              clearFieldError("organizationSlug");
            }}
            placeholder="acme"
            ref={slugInput}
            size="large"
            spellCheck={false}
            suffix={<span className="auth-organization-suffix">.launchpp.app</span>}
            value={slug}
            {...(fieldErrors.organizationSlug ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.organizationSlug} />
        </Field>
        <Field htmlFor="registration-owner-name" label="Your name">
          <Input
            aria-invalid={Boolean(fieldErrors.ownerName)}
            autoComplete="name"
            disabled={loading}
            id="registration-owner-name"
            maxLength={100}
            name="ownerName"
            onChange={() => clearFieldError("ownerName")}
            placeholder="Maya Okafor"
            size="large"
            {...(fieldErrors.ownerName ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.ownerName} />
        </Field>
        <Field htmlFor="registration-email" label="Work email">
          <Input
            aria-invalid={Boolean(fieldErrors.email)}
            autoComplete="email"
            disabled={loading}
            id="registration-email"
            maxLength={320}
            name="email"
            onChange={() => clearFieldError("email")}
            placeholder="maya@acme.example"
            ref={emailInput}
            size="large"
            type="email"
            {...(fieldErrors.email ? { status: "error" as const } : {})}
          />
          <FieldError message={fieldErrors.email} />
        </Field>
        <Field htmlFor="registration-password" label="Password">
          <Input.Password
            aria-invalid={Boolean(fieldErrors.password)}
            autoComplete="new-password"
            disabled={loading}
            id="registration-password"
            maxLength={128}
            minLength={12}
            name="password"
            onChange={(event) => {
              setPassword(event.currentTarget.value);
              clearFieldError("password");
            }}
            placeholder="Create a password"
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
          disabled={loading}
          loading={loading}
          size="large"
          type="submit"
          variant="primary"
        >
          Create organization
        </Button>
        <p className="auth-account-prompt">
          Already have an organization?{" "}
          <Typography.Link
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigate("/");
            }}
          >
            Find it
          </Typography.Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function EntryRedirect() {
  const api = useApiClient();
  const [destination, setDestination] = useState<null | string>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    void (async () => {
      const setup = await api.setup.status();
      if (setup.requiresSetup) return "/setup";
      const session = await api.auth.session();
      if (!session) return null;
      const organizations = await api.organizations.list();
      return organizations.currentOrganizationId ? "/app" : "/organization-setup";
    })()
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
  if (destination === undefined) return <Spin fullscreen description="Opening Launch++" />;
  if (destination === null) return <OrganizationLocatorPage />;
  return <Navigate replace to={destination} />;
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
