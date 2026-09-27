import type { ExtensionRegistry } from "@launchpp/api-client";
import { Alert, Card, Form, Input, InputNumber, Select, Switch, Typography } from "@launchpp/ui";
import { createContext, type ReactNode, useContext } from "react";
import { useLocation } from "react-router-dom";

export const extensionRegistryChangedEvent = "launchpp:extension-registry-changed";

const pluginSafeStartStorageKey = "launchpp:plugin-safe-start";

export function initializePluginSafeStart(search: string): boolean {
  const requested = new URLSearchParams(search).get("safe-start") === "plugins";
  try {
    if (requested) sessionStorage.setItem(pluginSafeStartStorageKey, "1");
    return requested || sessionStorage.getItem(pluginSafeStartStorageKey) === "1";
  } catch {
    return requested;
  }
}

export function setPluginSafeStart(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(pluginSafeStartStorageKey, "1");
    else sessionStorage.removeItem(pluginSafeStartStorageKey);
  } catch {
    // The URL query remains a one-load fallback when session storage is unavailable.
  }
}

export function emptyExtensionRegistry(): ExtensionRegistry {
  return {
    actions: [],
    diagnostics: [],
    fields: [],
    navigation: [],
    packages: [],
    pages: [],
    panels: [],
    routes: [],
    scope: { organizationId: "" },
    settings: [],
  };
}

export interface ExtensionRegistries {
  readonly organization: ExtensionRegistry;
  readonly project: ExtensionRegistry;
  readonly safeStart: boolean;
}

const ExtensionRegistryContext = createContext<ExtensionRegistries>({
  organization: emptyExtensionRegistry(),
  project: emptyExtensionRegistry(),
  safeStart: false,
});

export function ExtensionRegistryProvider({
  children,
  value,
}: Readonly<{ children: ReactNode; value: ExtensionRegistries }>) {
  return (
    <ExtensionRegistryContext.Provider value={value}>{children}</ExtensionRegistryContext.Provider>
  );
}

export function useExtensionRegistries(): ExtensionRegistries {
  return useContext(ExtensionRegistryContext);
}

export function ExtensionContributionPage() {
  const location = useLocation();
  const registries = useExtensionRegistries();
  const registry = location.pathname.includes("/projects/")
    ? registries.project
    : registries.organization;
  const route = registry.routes.find((item) => item.path === location.pathname);
  const page = route ? registry.pages.find((item) => item.id === route.pageId) : undefined;

  if (!route || !page) {
    return (
      <section className="page-stack">
        <Alert
          showIcon
          title="Extension page unavailable"
          description="This contribution is not enabled for the current organization or project."
          type="warning"
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="extension-page-title" className="page-stack">
      <Typography.Text type="secondary">Extension</Typography.Text>
      <Typography.Title id="extension-page-title" level={1}>
        {page.title}
      </Typography.Title>
      <Alert
        showIcon
        title={`${page.title} is registered`}
        description="Launch++ resolved this page and its navigation placement from the installed package. Sandboxed custom-surface loading is delivered with the public plugin UI runtime."
        type="info"
      />
    </section>
  );
}

export type ExtensionSettingsContribution = ExtensionRegistry["settings"][number];

export function ExtensionSettingsPreview({
  contribution,
}: Readonly<{ contribution: ExtensionSettingsContribution }>) {
  if (!contribution.fields) {
    return (
      <Alert
        showIcon
        title={`${contribution.title} uses a custom settings surface`}
        description="The contribution is registered; its sandboxed surface will load through the public plugin UI runtime."
        type="info"
      />
    );
  }

  return (
    <Card size="small" title={contribution.title}>
      <Form layout="vertical">
        {contribution.fields.map((field) => (
          <Form.Item
            {...(field.description === undefined ? {} : { extra: field.description })}
            {...(field.required === undefined ? {} : { required: field.required })}
            key={field.id}
            label={field.label}
          >
            {field.type === "text" ? (
              <Input
                {...(field.default === undefined ? {} : { defaultValue: field.default })}
                {...(field.maxLength === undefined ? {} : { maxLength: field.maxLength })}
              />
            ) : field.type === "number" ? (
              <InputNumber
                {...(field.default === undefined ? {} : { defaultValue: field.default })}
                {...(field.maximum === undefined ? {} : { max: field.maximum })}
                {...(field.minimum === undefined ? {} : { min: field.minimum })}
              />
            ) : field.type === "boolean" ? (
              <Switch {...(field.default === undefined ? {} : { defaultChecked: field.default })} />
            ) : (
              <Select
                {...(field.default === undefined ? {} : { defaultValue: field.default })}
                options={field.options}
                placeholder={`Select ${field.label.toLocaleLowerCase()}`}
              />
            )}
          </Form.Item>
        ))}
      </Form>
    </Card>
  );
}
