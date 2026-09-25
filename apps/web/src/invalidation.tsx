import type { InvalidationEvent } from "@launchpp/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const invalidationEventName = "launchpp:invalidate";
const cursorKey = "launchpp:invalidation-cursor";

export function InvalidationListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const after = window.sessionStorage.getItem(cursorKey);
    const parameters = after ? `?after=${encodeURIComponent(after)}` : "";
    const source = new EventSource(`/api/v1/events${parameters}`);
    const handle = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as InvalidationEvent;
        if (!Number.isSafeInteger(event.sequence) || !event.organizationId) return;
        window.sessionStorage.setItem(cursorKey, String(event.sequence));
        void queryClient.invalidateQueries();
        window.dispatchEvent(
          new CustomEvent<InvalidationEvent>(invalidationEventName, { detail: event }),
        );
      } catch {
        // Ignore malformed events; EventSource will continue with the next event.
      }
    };
    source.addEventListener("invalidate", handle as EventListener);
    return () => source.close();
  }, [queryClient]);

  return null;
}
