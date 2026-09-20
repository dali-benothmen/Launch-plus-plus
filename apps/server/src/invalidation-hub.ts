import type { InvalidationEvent } from "@launchpp/database";

type InvalidationListener = (event: InvalidationEvent) => void;

export class InvalidationHub {
  private readonly listeners = new Set<InvalidationListener>();

  publish(event: InvalidationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A disconnected stream must not interrupt durable dispatch for other listeners.
      }
    }
  }

  subscribe(listener: InvalidationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
