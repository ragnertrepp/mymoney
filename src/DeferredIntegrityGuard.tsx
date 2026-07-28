import { useEffect, useState } from "react";

type GuardComponent = React.ComponentType;

export default function DeferredIntegrityGuard() {
  const [Guard, setGuard] = useState<GuardComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const load = async () => {
      const module = await import("./DataIntegrity");
      if (!cancelled) setGuard(() => module.default);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => void load(), { timeout: 3500 });
    } else {
      timeoutId = window.setTimeout(() => void load(), 1800);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, []);

  return Guard ? <Guard /> : null;
}
