import type { WriteContext } from "./transactions.js";

export interface OutboxMessage {
  readonly availableAt: number;
  readonly correlationId: string;
  readonly id: string;
  readonly installationId: string;
  readonly occurredAt: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly topic: string;
}

export interface OutboxWriter {
  append(context: WriteContext, message: OutboxMessage): void;
}
