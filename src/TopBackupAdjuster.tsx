import { useEffect } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";

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

function cleanReceivables(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => {
    if (!isObject(item)) return false;
    return typeof item.id === "string" && typeof item.name === "string" && item.name.trim() !== "" &&
      typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) &&
      (item.status === "open" || item.status === "paid");
  });
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
    version: 3,
    createdAt: new Date().toISOString(),
    data,
    recurring: readJson(RECURRING_KEY, []),
    plannedPayments: readJson(PLANNED_KEY, []),
    categoryBudgets: cleanCategoryBudgets(readJson(CATEGORY_BUDGET_KEY, {})),
    receivables: cleanReceivables(readJson(RECEIVABLES_KEY, [])),
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
    const attach = () => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>(".topbar button"))
        .find((item) => item.textContent?.trim() === "Varukoopia" || item.textContent?.trim() === "Täielik varukoopia");

      if (!button || button.dataset.mymoneyBackupAttached === "1") return;

      button.dataset.mymoneyBackupAttached = "1";
      button.textContent = "Täielik varukoopia";
      button.title = "Laadi alla põhiandmed, korduvad kirjed, planeeritud maksed, kategooriaeelarved ja mulle võlgu kirjed";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        downloadFullBackup();
      }, true);
    };

    attach();
    const timer = window.setTimeout(attach, 300);
    const handleNavigation = () => window.requestAnimationFrame(attach);
    document.querySelector(".navigation")?.addEventListener("click", handleNavigation);

    return () => {
      window.clearTimeout(timer);
      document.querySelector(".navigation")?.removeEventListener("click", handleNavigation);
    };
  }, []);

  return null;
}
