import { useEffect, useState } from "react";

export default function PrivacyShield() {
  const [hidden, setHidden] = useState(() => document.visibilityState === "hidden");

  useEffect(() => {
    const updateVisibility = () => {
      setHidden(document.visibilityState === "hidden");
    };

    const restoreVisibleState = () => {
      if (document.visibilityState === "visible") setHidden(false);
    };

    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("focus", restoreVisibleState);
    window.addEventListener("pageshow", restoreVisibleState);

    restoreVisibleState();

    return () => {
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
