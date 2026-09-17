import { Typography } from "@launchpp/ui";
import type { PluginContext } from "@launchpp/plugin-protocol";
import { useEffect, useRef, useState } from "react";

import {
  BrowserBridgeHost,
  type BrowserBridgeStatus,
  type BrowserCapabilityHandler,
  resolvePluginAssetOrigin,
} from "./browser-bridge.js";

export interface PluginSurfaceProps {
  readonly capabilities?: Readonly<Record<string, BrowserCapabilityHandler>>;
  readonly context: PluginContext;
  readonly source: string;
  readonly title: string;
}

export function PluginSurface({ capabilities, context, source, title }: PluginSurfaceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<BrowserBridgeHost | null>(null);
  const [status, setStatus] = useState<BrowserBridgeStatus>("created");
  const [failure, setFailure] = useState<string>();

  useEffect(() => {
    const frame = frameRef.current;
    if (frame?.contentWindow === null || frame?.contentWindow === undefined) return;

    let targetOrigin: string;
    try {
      targetOrigin = resolvePluginAssetOrigin(source, window.location.origin);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The plugin URL is invalid.");
      return;
    }

    const bridge = new BrowserBridgeHost({
      ...(capabilities === undefined ? {} : { capabilities }),
      context,
      hostWindow: window,
      onSecurityEvent: ({ reason }) => setFailure(`Plugin message rejected: ${reason}.`),
      onStatusChange: setStatus,
      pluginWindow: frame.contentWindow,
      targetOrigin,
    });
    bridgeRef.current = bridge;
    bridge.start();

    return () => {
      bridge.stop();
      bridgeRef.current = null;
    };
  }, [capabilities, context, source]);

  if (failure !== undefined) {
    return (
      <section aria-label={title} className="plugin-surface-failure" role="alert">
        <Typography.Text strong>{title} unavailable</Typography.Text>
        <Typography.Paragraph>{failure}</Typography.Paragraph>
      </section>
    );
  }

  return (
    <section aria-label={title} className="plugin-surface-frame">
      <header>
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text aria-live="polite" type="secondary">
          {status}
        </Typography.Text>
      </header>
      <iframe
        allow=""
        onError={() => setFailure("The isolated surface failed to load.")}
        onLoad={() => bridgeRef.current?.handshake()}
        ref={frameRef}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        src={source}
        title={title}
      />
    </section>
  );
}
