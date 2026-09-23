import { randomUUID } from "node:crypto";
import {
  type SqliteDatabase,
  SqliteOutboxRepository,
  SqliteProjectionRepository,
} from "@launchpp/database";
import type { FastifyBaseLogger } from "fastify";
import type { InvalidationHub } from "./invalidation-hub.js";

export interface OutboxDispatcher {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createOutboxDispatcher(
  input: Readonly<{
    database: SqliteDatabase;
    hub: InvalidationHub;
    logger: FastifyBaseLogger;
  }>,
): OutboxDispatcher {
  const outbox = new SqliteOutboxRepository();
  const projections = new SqliteProjectionRepository();
  const leaseOwner = randomUUID();
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => {
      running = drain()
        .catch((error: unknown) => input.logger.error({ err: error }, "outbox dispatch failed"))
        .finally(() => {
          running = undefined;
          schedule();
        });
    }, 250);
    timer.unref();
  };

  const drain = async () => {
    const now = Date.now();
    const messages = await input.database.write((context) =>
      outbox.lease(context, {
        leaseOwner,
        leaseUntil: now + 30_000,
        limit: 50,
        now,
      }),
    );
    for (const message of messages) {
      try {
        const event = await input.database.write((context) => {
          const projected = projections.project(context, message);
          outbox.complete(context, message.id, leaseOwner, Date.now());
          return projected;
        });
        if (event) input.hub.publish(event);
      } catch (error) {
        const delay = Math.min(60_000, 500 * 2 ** Math.min(message.attempts, 7));
        await input.database.write((context) =>
          outbox.retry(context, {
            availableAt: Date.now() + delay,
            leaseOwner,
            messageId: message.id,
          }),
        );
        input.logger.error(
          { attempts: message.attempts, err: error, outboxId: message.id, topic: message.topic },
          "outbox projection failed",
        );
      }
    }
  };

  return {
    async start() {
      stopped = false;
      await input.database.write((context) => projections.rebuildSearch(context));
      await drain();
      schedule();
    },
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running;
    },
  };
}
