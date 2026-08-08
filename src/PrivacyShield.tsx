import { useEffect, useRef, useState } from "react";

export default function PrivacyShield() {
  const [hidden, setHidden] = useState(false);
  const mountedVisible = useRef(false);

  useEffect(() => {
    const restoreVisibleState = () => {
      if (document.visibilityState === "visible") {
        mountedVisible.current = true;
        setHidden(false);
      }
    };

    const updateVisibility = () => {
      if (document.visibilityState === "visible") {
        restoreVisibleState();
        return;
      }

      // Never cover the app during the initial PIN -> app transition.
      // Only show the shield after the page has definitely been visible once.
      if (mountedVisible.current) setHidden(true);
    };

    restoreVisibleState();
    const clearInitialShield = window.setTimeout(restoreVisibleState, 250);

    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("focus", restoreVisibleState);
    window.addEventListener("pageshow", restoreVisibleState);

    return () => {
      window.clearTimeout(clearInitialShield);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("focus", restoreVisibleState);
      window.removeEventListener("pageshow", restoreVisibleState);
    };
  }, []);

  if (!hidden) return null;

  return (
    <div className="privacy-shield" aria-hidden="true">
      <div>
        <strong>MyMoney locked</strong>
        <span>Return to the app to view your data.</span>
      </div>
    </div>
  );
}
