import type { InvalidationEvent } from "@launchpp/database";

type InvalidationListener = (event: InvalidationEvent) => void;
type CloseListener = () => void;

export class InvalidationHub {
  private readonly closeListeners = new Set<CloseListener>();
  private closed = false;
  private readonly listeners = new Set<InvalidationListener>();

  publish(event: InvalidationEvent): void {
    if (this.closed) return;
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A disconnected stream must not interrupt durable dispatch for other listeners.
      }
    }
  }

  subscribe(listener: InvalidationListener, onClose?: CloseListener): () => void {
    if (this.closed) {
      onClose?.();
      return () => undefined;
    }
    this.listeners.add(listener);
    if (onClose) this.closeListeners.add(onClose);
    return () => {
      this.listeners.delete(listener);
      if (onClose) this.closeListeners.delete(onClose);
    };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const listener of this.closeListeners) {
      try {
        listener();
      } catch {
        // Shutdown continues even if a client disconnected before receiving the notice.
      }
    }
    this.closeListeners.clear();
    this.listeners.clear();
  }
}
