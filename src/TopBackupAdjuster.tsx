import { useEffect } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";

function readJson(key: string, fallback: unknown) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanCategoryBudgets(value: unknown) {
  if (!isObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, limit]) => typeof limit === "number" && Number.isFinite(limit) && limit > 0),
  );
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
    version: 2,
    createdAt: new Date().toISOString(),
    data,
    recurring: readJson(RECURRING_KEY, []),
    plannedPayments: readJson(PLANNED_KEY, []),
    categoryBudgets: cleanCategoryBudgets(readJson(CATEGORY_BUDGET_KEY, {})),
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
        .find((item) => item.textContent?.trim() === "Varukoopia" || item.textContent?.trim() === "Täielik varukoopia");

      if (!candidate || candidate === button) return;
      button?.removeEventListener("click", handler, true);
      button = candidate;
      button.textContent = "Täielik varukoopia";
      button.title = "Laadi alla põhiandmed, korduvad kirjed, planeeritud maksed ja kategooriaeelarved";
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
