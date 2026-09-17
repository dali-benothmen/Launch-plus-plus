export interface Readiness {
  isReady(): boolean;
  markNotReady(): void;
  markReady(): void;
}

export function createReadiness(): Readiness {
  let ready = false;
  return Object.freeze({
    isReady: () => ready,
    markNotReady: () => {
      ready = false;
    },
    markReady: () => {
      ready = true;
    },
  });
}
