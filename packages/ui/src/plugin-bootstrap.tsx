import {
  type CreateClientOptions,
  createClient,
  type LaunchppClient,
  toLaunchppError,
} from "@launchpp/sdk";
import { type ComponentType, type ReactNode, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { LaunchProvider } from "./launch-provider.js";
import { PluginProvider } from "./plugin-provider.js";
import { PluginErrorBoundary, PluginErrorState } from "./plugin-states.js";

export interface MountPluginSurfaceOptions {
  readonly clientOptions?: CreateClientOptions;
  readonly component: ComponentType;
  readonly element?: Element | string;
  readonly errorFallback?: ReactNode;
  readonly strictMode?: boolean;
}

export interface MountedPluginSurface {
  readonly client: LaunchppClient;
  unmount(): void;
}

function resolveElement(target: Element | string | undefined): Element {
  if (target instanceof Element) return target;
  const selector = target ?? "#root";
  const element = document.querySelector(selector);
  if (element === null) throw new TypeError(`Plugin surface root '${selector}' was not found.`);
  return element;
}

function render(root: Root, node: ReactNode, strictMode: boolean): void {
  root.render(strictMode ? <StrictMode>{node}</StrictMode> : node);
}

/** Connect to Launch++, apply providers, and mount one generated plugin entry component. */
export async function mountPluginSurface({
  clientOptions,
  component: Surface,
  element,
  errorFallback,
  strictMode = false,
}: MountPluginSurfaceOptions): Promise<MountedPluginSurface> {
  const root = createRoot(resolveElement(element));
  let client: LaunchppClient;
  try {
    client = await createClient(clientOptions);
  } catch (error) {
    const resolvedError = toLaunchppError(error);
    render(
      root,
      <LaunchProvider>
        {errorFallback ?? <PluginErrorState error={resolvedError} />}
      </LaunchProvider>,
      strictMode,
    );
    throw resolvedError;
  }

  render(
    root,
    <PluginProvider client={client}>
      <PluginErrorBoundary fallback={errorFallback}>
        <Surface />
      </PluginErrorBoundary>
    </PluginProvider>,
    strictMode,
  );

  return Object.freeze({
    client,
    unmount: () => {
      root.unmount();
      client.close();
    },
  });
}
