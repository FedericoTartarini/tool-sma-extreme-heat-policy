import { act, useLayoutEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

/** Mounts real React hooks and exposes results after each committed render. */
export function renderHook<T>(
  useHook: () => T,
  wrap: (children: ReactNode) => ReactNode = (children) => children,
) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let current: T;
  function Harness() {
    const value = useHook();
    useLayoutEffect(() => {
      current = value;
    });
    return null;
  }
  act(() => root.render(wrap(<Harness />)));
  return {
    get current() {
      return current;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}
