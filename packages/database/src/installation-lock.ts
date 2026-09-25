import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

interface LockRecord {
  readonly createdAt: string;
  readonly owner: string;
  readonly pid: number;
}

export interface InstallationLock {
  readonly path: string;
  release(): Promise<void>;
}

export class InstallationLockedError extends Error {
  override readonly name = "InstallationLockedError";

  constructor(
    readonly lockPath: string,
    readonly ownerPid?: number,
  ) {
    super(
      ownerPid
        ? `The Launch++ database is already in use by process ${ownerPid}. Stop that process and try again.`
        : `The Launch++ database is already in use. Stop the running server and try again. Lock: ${lockPath}`,
    );
  }
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function lockOwnerIsRunning(record: LockRecord): boolean {
  if (record.pid !== process.pid) return processIsRunning(record.pid);
  const lockCreatedAt = Date.parse(record.createdAt);
  const currentProcessStartedAt = Date.now() - process.uptime() * 1_000;
  return Number.isFinite(lockCreatedAt) && lockCreatedAt >= currentProcessStartedAt - 1_000;
}

async function readLockRecord(lockPath: string): Promise<LockRecord | undefined> {
  try {
    const value = JSON.parse(await readFile(lockPath, "utf8")) as Partial<LockRecord>;
    if (
      typeof value.createdAt === "string" &&
      typeof value.owner === "string" &&
      Number.isSafeInteger(value.pid) &&
      (value.pid ?? 0) > 0
    ) {
      return value as LockRecord;
    }
  } catch {
    // An unreadable lock is treated as active rather than removed unsafely.
  }
  return undefined;
}

export function installationLockPath(databasePath: string): string {
  return `${path.resolve(databasePath)}.lock`;
}

export async function acquireInstallationLock(databasePath: string): Promise<InstallationLock> {
  const lockPath = installationLockPath(databasePath);
  await mkdir(path.dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const owner = randomUUID();
    try {
      const handle = await open(lockPath, "wx", 0o600);
      const record: LockRecord = {
        createdAt: new Date().toISOString(),
        owner,
        pid: process.pid,
      };
      try {
        await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
      } catch (error) {
        await handle.close().catch(() => undefined);
        await unlink(lockPath).catch(() => undefined);
        throw error;
      }
      let released = false;

      return Object.freeze({
        path: lockPath,
        async release() {
          if (released) return;
          released = true;
          await handle.close();
          const current = await readLockRecord(lockPath);
          if (current?.owner === owner) await unlink(lockPath).catch(() => undefined);
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const record = await readLockRecord(lockPath);
      if (attempt === 0 && record && !lockOwnerIsRunning(record)) {
        const current = await readLockRecord(lockPath);
        if (current?.owner === record.owner) await unlink(lockPath).catch(() => undefined);
        continue;
      }
      throw new InstallationLockedError(lockPath, record?.pid);
    }
  }

  throw new InstallationLockedError(lockPath);
}
