import type { PluginContext } from "@launchpp/plugin-protocol";
import { Button, Descriptions, Result, Space, Spin, Typography } from "@launchpp/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BrowserBridgeHost,
  type BrowserBridgeStatus,
  type BrowserCapabilityHandler,
  resolvePluginAssetOrigin,
} from "./browser-bridge.js";

const defaultSlowThresholdMs = 4_000;
const defaultHandshakeTimeoutMs = 12_000;

export interface PluginSurfaceDiagnostic {
  readonly code: "bridge-security" | "handshake-timeout" | "invalid-source" | "surface-load";
  readonly occurredAt: number;
  readonly pluginId: string;
  readonly reference: string;
  readonly surfaceId: string;
}

export interface PluginSurfaceProps {
  readonly capabilities?: Readonly<Record<string, BrowserCapabilityHandler>>;
  readonly context: PluginContext;
  readonly handshakeTimeoutMs?: number;
  readonly onDiagnostic?: (diagnostic: PluginSurfaceDiagnostic) => void;
  readonly slowThresholdMs?: number;
  readonly source: string;
  readonly title: string;
}

function failureDescription(code: PluginSurfaceDiagnostic["code"]): string {
  if (code === "handshake-timeout") {
    return "The plugin did not become ready in time. Core Launch++ features remain available.";
  }
  if (code === "surface-load") {
    return "The isolated plugin page could not be loaded. Core Launch++ features remain available.";
  }
  if (code === "bridge-security") {
    return "Launch++ stopped this surface after rejecting an unsafe or invalid message.";
  }
  return "The plugin surface address is not valid for isolated loading.";
}

function statusLabel(
  failure: PluginSurfaceDiagnostic | undefined,
  slow: boolean,
  status: BrowserBridgeStatus,
): string {
  if (failure) return "Unavailable";
  if (status === "ready") return "Ready";
  if (slow) return "Taking longer than expected";
  return "Loading";
}

export function PluginSurface({
  capabilities,
  context,
  handshakeTimeoutMs = defaultHandshakeTimeoutMs,
  onDiagnostic,
  slowThresholdMs = defaultSlowThresholdMs,
  source,
  title,
}: PluginSurfaceProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<BrowserBridgeHost | null>(null);
  const failureRef = useRef<PluginSurfaceDiagnostic | undefined>(undefined);
  const [status, setStatus] = useState<BrowserBridgeStatus>("created");
  const [failure, setFailure] = useState<PluginSurfaceDiagnostic>();
  const [slow, setSlow] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  const fail = useCallback(
    (code: PluginSurfaceDiagnostic["code"]) => {
      if (failureRef.current) return;
      const diagnostic: PluginSurfaceDiagnostic = {
        code,
        occurredAt: Date.now(),
        pluginId: context.pluginId,
        reference: crypto.randomUUID(),
        surfaceId: context.surfaceId,
      };
      failureRef.current = diagnostic;
      setFailure(diagnostic);
      setSlow(false);
      onDiagnostic?.(diagnostic);
    },
    [context.pluginId, context.surfaceId, onDiagnostic],
  );

  useEffect(() => {
    const frame = frameRef.current;
    frame?.setAttribute("data-launchpp-revision", String(revision));
    if (frame?.contentWindow === null || frame?.contentWindow === undefined) {
      fail("surface-load");
      return;
    }

    let targetOrigin: string;
    try {
      targetOrigin = resolvePluginAssetOrigin(source, window.location.origin);
    } catch {
      fail("invalid-source");
      return;
    }

    const bridge = new BrowserBridgeHost({
      ...(capabilities === undefined ? {} : { capabilities }),
      context,
      hostWindow: window,
      onSecurityEvent: () => fail("bridge-security"),
      onStatusChange: (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus === "ready") setSlow(false);
      },
      pluginWindow: frame.contentWindow,
      targetOrigin,
    });
    bridgeRef.current = bridge;
    bridge.start();

    return () => {
      bridge.stop();
      bridgeRef.current = null;
    };
  }, [capabilities, context, fail, revision, source]);

  useEffect(() => {
    if (status !== "handshaking" || failure) return;
    const slowTimer = window.setTimeout(() => setSlow(true), slowThresholdMs);
    const failureTimer = window.setTimeout(() => fail("handshake-timeout"), handshakeTimeoutMs);
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(failureTimer);
    };
  }, [fail, failure, handshakeTimeoutMs, slowThresholdMs, status]);

  const retry = () => {
    failureRef.current = undefined;
    setFailure(undefined);
    setSlow(false);
    setDiagnosticsOpen(false);
    setStatus("created");
    setRevision((current) => current + 1);
  };

  const label = statusLabel(failure, slow, status);

  return (
    <section aria-label={title} className="plugin-surface-frame">
      <header>
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text aria-live="polite" type="secondary">
          {label}
        </Typography.Text>
      </header>

      {failure ? (
        <div className="plugin-surface-state" role="alert">
          <Result
            extra={
              <Space wrap>
                <Button onClick={retry} variant="primary">
                  Try again
                </Button>
                <Button onClick={() => setDiagnosticsOpen((current) => !current)}>
                  {diagnosticsOpen ? "Hide diagnostics" : "View diagnostics"}
                </Button>
              </Space>
            }
            status="error"
            subTitle={failureDescription(failure.code)}
            title={`${title} unavailable`}
          />
          {diagnosticsOpen ? (
            <Descriptions bordered column={1} size="small" title="Failure diagnostics">
              <Descriptions.Item label="Plugin">{failure.pluginId}</Descriptions.Item>
              <Descriptions.Item label="Surface">{failure.surfaceId}</Descriptions.Item>
              <Descriptions.Item label="Failure code">{failure.code}</Descriptions.Item>
              <Descriptions.Item label="Reference">
                <Typography.Text code copyable>
                  {failure.reference}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Occurred">
                {new Date(failure.occurredAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </div>
      ) : status !== "ready" ? (
        <div className="plugin-surface-state" aria-live="polite">
          {slow ? (
            <Result
              extra={<Button onClick={retry}>Reload plugin</Button>}
              status="warning"
              subTitle="Launch++ is still waiting for the isolated plugin surface. You can keep waiting or reload only this plugin."
              title="This plugin is taking longer than expected"
            />
          ) : (
            <Spin description={`Loading ${title}`} />
          )}
        </div>
      ) : null}

      <iframe
        allow=""
        hidden={status !== "ready" || failure !== undefined}
        key={revision}
        onError={() => fail("surface-load")}
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
