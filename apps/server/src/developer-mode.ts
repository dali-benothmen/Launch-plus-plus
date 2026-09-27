import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import type {
  PluginPackageManifest,
  PluginSourceManifest,
  PreviewPermission,
} from "@launchpp/plugin-protocol";

const pairingTtlMs = 5 * 60_000;
const sessionTtlMs = 30 * 60_000;

export type DeveloperSessionState = "active" | "awaiting_permission_review" | "expired" | "revoked";

export interface DeveloperSessionSummary {
  readonly actorUserId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly grantedPermissions: readonly PreviewPermission[];
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly pluginId: string;
  readonly projectId?: string;
  readonly requestedPermissions: readonly PreviewPermission[];
  readonly state: DeveloperSessionState;
}

export interface PairingReview {
  readonly expiresAt: number;
  readonly id: string;
  readonly name: string;
  readonly pluginId: string;
  readonly requestedPermissions: readonly PreviewPermission[];
  readonly version: string;
}

interface PairingRecord {
  readonly codeHash: Buffer;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly id: string;
  manifest: PluginSourceManifest;
  readonly pollTokenHash: Buffer;
  state: "approved" | "expired" | "pending" | "rejected";
  handoff?: Readonly<{
    expiresAt: number;
    organizationId: string;
    projectId?: string;
    sessionId: string;
    token: string;
  }>;
}

interface DeveloperSessionRecord {
  readonly actorUserId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly id: string;
  grantedPermissions: readonly PreviewPermission[];
  lastSeenAt: number;
  manifest: PluginSourceManifest;
  readonly organizationId: string;
  readonly projectId?: string;
  revokedAt?: number;
  state: DeveloperSessionState;
  readonly tokenHash: Buffer;
}

export interface ConnectedExtensionPackage {
  readonly acceptedPermissions: readonly PreviewPermission[];
  readonly manifest: PluginPackageManifest;
  readonly packageId: string;
  readonly projectEnabled: boolean;
}

function secret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function matches(stored: Buffer, supplied: string): boolean {
  const candidate = digest(supplied);
  return stored.byteLength === candidate.byteLength && timingSafeEqual(stored, candidate);
}

function permissionsEqual(
  left: readonly PreviewPermission[],
  right: readonly PreviewPermission[],
): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((permission, index) => permission === [...right].sort()[index])
  );
}

function packageManifest(manifest: PluginSourceManifest): PluginPackageManifest {
  const { $schema: _schema, authoring: _authoring, browser, server, ...identity } = manifest;
  return {
    ...identity,
    ...(browser === undefined
      ? {}
      : {
          browser: {
            surfaces: Object.fromEntries(
              Object.keys(browser.surfaces).map((surfaceId) => [
                surfaceId,
                { document: `./browser/surfaces/${surfaceId}/index.html` },
              ]),
            ),
          },
        }),
    ...(server === undefined
      ? {}
      : {
          server: {
            handlers: Object.fromEntries(
              Object.entries(server.handlers).map(([handlerId, handler]) => [
                handlerId,
                {
                  export: handler.export,
                  module: `./server/${handlerId}.js`,
                },
              ]),
            ),
          },
        }),
  };
}

function summary(record: DeveloperSessionRecord, now: number): DeveloperSessionSummary {
  const state = record.revokedAt ? "revoked" : record.expiresAt <= now ? "expired" : record.state;
  return Object.freeze({
    actorUserId: record.actorUserId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    grantedPermissions: record.grantedPermissions,
    id: record.id,
    name: record.manifest.name,
    organizationId: record.organizationId,
    pluginId: record.manifest.id,
    ...(record.projectId ? { projectId: record.projectId } : {}),
    requestedPermissions: record.manifest.permissions,
    state,
  });
}

export class DeveloperModeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DeveloperModeError";
  }
}

export class DeveloperModeCoordinator {
  #enabled: boolean;
  readonly #pairings = new Map<string, PairingRecord>();
  readonly #sessions = new Map<string, DeveloperSessionRecord>();
  readonly #clock: () => number;

  constructor(input: Readonly<{ enabled: boolean; clock?: () => number }>) {
    this.#enabled = input.enabled;
    this.#clock = input.clock ?? Date.now;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  setEnabled(enabled: boolean): void {
    if (this.#enabled === enabled) return;
    this.#enabled = enabled;
    if (enabled) return;
    const now = this.#clock();
    for (const pairing of this.#pairings.values()) {
      if (pairing.state === "pending" || pairing.state === "approved") {
        pairing.state = "expired";
        delete pairing.handoff;
      }
    }
    for (const session of this.#sessions.values()) {
      if (session.revokedAt === undefined && session.expiresAt > now) {
        session.revokedAt = now;
        session.state = "revoked";
      }
    }
  }

  get pairingTtlSeconds(): number {
    return pairingTtlMs / 1_000;
  }

  get sessionTtlSeconds(): number {
    return sessionTtlMs / 1_000;
  }

  createPairing(manifest: PluginSourceManifest): Readonly<{
    code: string;
    expiresAt: number;
    id: string;
    pollingToken: string;
  }> {
    this.#requireEnabled();
    const now = this.#clock();
    const id = randomUUID();
    const code = String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
    const pollingToken = secret();
    this.#pairings.set(id, {
      codeHash: digest(code),
      createdAt: now,
      expiresAt: now + pairingTtlMs,
      id,
      manifest,
      pollTokenHash: digest(pollingToken),
      state: "pending",
    });
    return { code, expiresAt: now + pairingTtlMs, id, pollingToken };
  }

  reviewPairing(id: string, code: string): PairingReview {
    const pairing = this.#pairing(id);
    if (!matches(pairing.codeHash, code)) {
      throw new DeveloperModeError("pairing_code_invalid", "The pairing code is invalid.");
    }
    if (pairing.state !== "pending") {
      throw new DeveloperModeError(
        "pairing_unavailable",
        "The pairing request is no longer pending.",
      );
    }
    return Object.freeze({
      expiresAt: pairing.expiresAt,
      id,
      name: pairing.manifest.name,
      pluginId: pairing.manifest.id,
      requestedPermissions: pairing.manifest.permissions,
      version: pairing.manifest.version,
    });
  }

  approvePairing(
    input: Readonly<{
      actorUserId: string;
      code: string;
      id: string;
      organizationId: string;
      projectId?: string;
    }>,
  ): DeveloperSessionSummary {
    const pairing = this.#pairing(input.id);
    if (!matches(pairing.codeHash, input.code)) {
      throw new DeveloperModeError("pairing_code_invalid", "The pairing code is invalid.");
    }
    if (pairing.state !== "pending") {
      throw new DeveloperModeError(
        "pairing_unavailable",
        "The pairing request is no longer pending.",
      );
    }
    const now = this.#clock();
    const id = randomUUID();
    const token = secret();
    const session: DeveloperSessionRecord = {
      actorUserId: input.actorUserId,
      createdAt: now,
      expiresAt: now + sessionTtlMs,
      grantedPermissions: pairing.manifest.permissions,
      id,
      lastSeenAt: now,
      manifest: pairing.manifest,
      organizationId: input.organizationId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      state: "active",
      tokenHash: digest(token),
    };
    for (const existing of this.#sessions.values()) {
      if (
        existing.actorUserId === input.actorUserId &&
        existing.organizationId === input.organizationId &&
        existing.manifest.id === pairing.manifest.id &&
        existing.revokedAt === undefined
      ) {
        existing.revokedAt = now;
        existing.state = "revoked";
      }
    }
    this.#sessions.set(id, session);
    pairing.state = "approved";
    pairing.handoff = {
      expiresAt: session.expiresAt,
      organizationId: session.organizationId,
      ...(session.projectId ? { projectId: session.projectId } : {}),
      sessionId: id,
      token,
    };
    return summary(session, now);
  }

  rejectPairing(id: string, code: string): void {
    const pairing = this.#pairing(id);
    if (!matches(pairing.codeHash, code)) {
      throw new DeveloperModeError("pairing_code_invalid", "The pairing code is invalid.");
    }
    pairing.state = "rejected";
    delete pairing.handoff;
  }

  pollPairing(
    id: string,
    token: string,
  ): Readonly<{
    expiresAt: number;
    session?: PairingRecord["handoff"];
    state: PairingRecord["state"];
  }> {
    const pairing = this.#pairing(id, true);
    if (!matches(pairing.pollTokenHash, token)) {
      throw new DeveloperModeError("pairing_unauthorized", "The pairing credential is invalid.");
    }
    const handoff = pairing.handoff;
    return {
      expiresAt: pairing.expiresAt,
      ...(handoff ? { session: handoff } : {}),
      state: pairing.state,
    };
  }

  updateManifest(
    id: string,
    token: string,
    manifest: PluginSourceManifest,
  ): DeveloperSessionSummary {
    const session = this.#sessionByToken(id, token);
    if (manifest.id !== session.manifest.id) {
      throw new DeveloperModeError(
        "plugin_identity_changed",
        "A connected session cannot change its plugin ID.",
      );
    }
    session.manifest = manifest;
    session.lastSeenAt = this.#clock();
    session.state = permissionsEqual(session.grantedPermissions, manifest.permissions)
      ? "active"
      : "awaiting_permission_review";
    return summary(session, this.#clock());
  }

  heartbeat(id: string, token: string): DeveloperSessionSummary {
    const session = this.#sessionByToken(id, token);
    session.lastSeenAt = this.#clock();
    return summary(session, this.#clock());
  }

  approvePermissions(id: string, actorUserId: string): DeveloperSessionSummary {
    const session = this.#activeSession(id);
    if (session.actorUserId !== actorUserId) {
      throw new DeveloperModeError(
        "session_author_mismatch",
        "Only the paired author can approve this development session.",
      );
    }
    session.grantedPermissions = session.manifest.permissions;
    session.state = "active";
    return summary(session, this.#clock());
  }

  revoke(id: string): void {
    const session = this.#sessions.get(id);
    if (!session || session.revokedAt) return;
    session.revokedAt = this.#clock();
    session.state = "revoked";
  }

  revokeWithToken(id: string, token: string): void {
    this.#sessionByToken(id, token);
    this.revoke(id);
  }

  session(id: string): DeveloperSessionSummary | undefined {
    const record = this.#sessions.get(id);
    return record ? summary(record, this.#clock()) : undefined;
  }

  list(organizationId?: string): readonly DeveloperSessionSummary[] {
    const now = this.#clock();
    return [...this.#sessions.values()]
      .filter((record) => organizationId === undefined || record.organizationId === organizationId)
      .map((record) => summary(record, now))
      .toSorted((left, right) => right.createdAt - left.createdAt);
  }

  packagesFor(
    actorUserId: string,
    organizationId: string,
    projectId?: string,
  ): readonly ConnectedExtensionPackage[] {
    const now = this.#clock();
    return [...this.#sessions.values()]
      .filter(
        (record) =>
          record.actorUserId === actorUserId &&
          record.organizationId === organizationId &&
          record.expiresAt > now &&
          record.revokedAt === undefined &&
          record.state === "active",
      )
      .map((record) => ({
        acceptedPermissions: record.grantedPermissions,
        manifest: packageManifest(record.manifest),
        packageId: `dev:${record.id}`,
        projectEnabled:
          projectId !== undefined &&
          (record.projectId === undefined || record.projectId === projectId),
      }));
  }

  grantFor(
    input: Readonly<{
      actorUserId: string;
      organizationId: string;
      packageId: string;
      projectId?: string;
    }>,
  ):
    | Readonly<{
        grantedPermissions: readonly PreviewPermission[];
        pluginId: string;
        projectEnabled: boolean;
      }>
    | undefined {
    if (!input.packageId.startsWith("dev:")) return undefined;
    const session = this.#sessions.get(input.packageId.slice(4));
    const now = this.#clock();
    if (
      !session ||
      session.actorUserId !== input.actorUserId ||
      session.organizationId !== input.organizationId ||
      session.expiresAt <= now ||
      session.revokedAt !== undefined ||
      session.state !== "active"
    ) {
      throw new DeveloperModeError(
        "development_session_unavailable",
        "The connected development session is unavailable.",
      );
    }
    return {
      grantedPermissions: session.grantedPermissions,
      pluginId: session.manifest.id,
      projectEnabled:
        input.projectId !== undefined &&
        (session.projectId === undefined || session.projectId === input.projectId),
    };
  }

  #requireEnabled(): void {
    if (!this.#enabled) {
      throw new DeveloperModeError(
        "developer_mode_disabled",
        "Connected Developer Mode is disabled by the installation operator.",
      );
    }
  }

  #pairing(id: string, allowCompleted = false): PairingRecord {
    this.#requireEnabled();
    const pairing = this.#pairings.get(id);
    if (!pairing) throw new DeveloperModeError("pairing_not_found", "Pairing request not found.");
    if (
      pairing.expiresAt <= this.#clock() &&
      (pairing.state === "pending" || pairing.state === "approved")
    ) {
      if (pairing.handoff) this.revoke(pairing.handoff.sessionId);
      pairing.state = "expired";
      delete pairing.handoff;
    }
    if (!allowCompleted && pairing.state === "expired") {
      throw new DeveloperModeError("pairing_expired", "The pairing request has expired.");
    }
    return pairing;
  }

  #activeSession(id: string): DeveloperSessionRecord {
    this.#requireEnabled();
    const session = this.#sessions.get(id);
    if (!session) throw new DeveloperModeError("session_not_found", "Session not found.");
    if (session.expiresAt <= this.#clock()) {
      session.state = "expired";
      throw new DeveloperModeError("session_expired", "The development session has expired.");
    }
    if (session.revokedAt !== undefined) {
      throw new DeveloperModeError("session_revoked", "The development session was revoked.");
    }
    return session;
  }

  #sessionByToken(id: string, token: string): DeveloperSessionRecord {
    const session = this.#activeSession(id);
    if (!matches(session.tokenHash, token)) {
      throw new DeveloperModeError("session_unauthorized", "The session credential is invalid.");
    }
    return session;
  }
}
