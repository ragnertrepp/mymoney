import { useEffect } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

function readJson(key: string, fallback: unknown) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function downloadFullBackup() {
  const data = readJson(STORAGE_KEY, null);
  if (!data || typeof data !== "object") {
    alert("MyMoney andmeid ei leitud.");
    return;
  }

  const backup = {
    format: "mymoney-full-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    data,
    recurring: readJson(RECURRING_KEY, []),
    plannedPayments: readJson(PLANNED_KEY, []),
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mymoney-full-backup-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TopBackupAdjuster() {
  useEffect(() => {
    let button: HTMLButtonElement | null = null;

    const handler = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      downloadFullBackup();
    };

    const attach = () => {
      const candidate = Array.from(document.querySelectorAll<HTMLButtonElement>(".topbar button"))
        .find((item) => item.textContent?.trim() === "Varukoopia");

      if (!candidate || candidate === button) return;
      button?.removeEventListener("click", handler, true);
      button = candidate;
      button.textContent = "Täielik varukoopia";
      button.title = "Laadi alla põhiandmed, korduvad kirjed ja planeeritud maksed";
      button.addEventListener("click", handler, true);
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      button?.removeEventListener("click", handler, true);
    };
  }, []);

  return null;
}
