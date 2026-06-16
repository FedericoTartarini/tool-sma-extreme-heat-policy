export interface AbortableRequestHandle {
  signal: AbortSignal;
  isCurrent: () => boolean;
  finish: () => void;
}

export interface LatestAbortableRequestController {
  start: () => AbortableRequestHandle;
  cancel: () => void;
}

/**
 * Creates a small controller that keeps only the newest abortable request current.
 */
export function createLatestAbortableRequestController(): LatestAbortableRequestController {
  let nextId = 0;
  let current: { id: number; controller: AbortController } | null = null;

  return {
    start: () => {
      current?.controller.abort();

      const id = nextId + 1;
      nextId = id;
      const controller = new AbortController();
      current = { id, controller };

      return {
        signal: controller.signal,
        isCurrent: () => current?.id === id && !controller.signal.aborted,
        finish: () => {
          if (current?.id === id) {
            current = null;
          }
        },
      };
    },
    cancel: () => {
      current?.controller.abort();
      current = null;
      nextId += 1;
    },
  };
}
