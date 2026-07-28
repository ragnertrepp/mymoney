import { useRef, type ChangeEvent } from "react";
import { decryptBackupFile, encryptBackupJson, verifyPin } from "./Security";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";

type BackupShape = {
  format?: string;
  version?: number;
  createdAt?: string;
  data?: unknown;
  recurring?: unknown[];
  plannedPayments?: unknown[];
  categoryBudgets?: Record<string, unknown>;
  receivables?: unknown[];
  transactions?: unknown[];
  debts?: unknown[];
  debtPayments?: unknown[];
  tasks?: unknown[];
  settings?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(key: string, fallback: unknown) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function validateMainData(value: unknown) {
  if (!isObject(value)) return null;
  const candidate = value as BackupShape;
  if (!Array.isArray(candidate.transactions)) return null;
  if (!Array.isArray(candidate.debts)) return null;
  if (!Array.isArray(candidate.debtPayments)) return null;
  if (!Array.isArray(candidate.tasks)) return null;
  if (!isObject(candidate.settings)) return null;
  return value;
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

function parseBackup(value: unknown) {
  if (!isObject(value)) return null;
  const candidate = value as BackupShape;

  if (candidate.format === "mymoney-full-backup" && isObject(candidate.data)) {
    const data = validateMainData(candidate.data);
    if (!data) return null;
    return {
      data,
      recurring: Array.isArray(candidate.recurring) ? candidate.recurring : [],
      plannedPayments: Array.isArray(candidate.plannedPayments) ? candidate.plannedPayments : [],
      categoryBudgets: cleanCategoryBudgets(candidate.categoryBudgets),
      receivables: cleanReceivables(candidate.receivables),
      isFullBackup: true,
    };
  }

  const legacyData = isObject(candidate.data) ? candidate.data : value;
  const data = validateMainData(legacyData);
  if (!data) return null;

  return {
    data,
    recurring: [] as unknown[],
    plannedPayments: [] as unknown[],
    categoryBudgets: {} as Record<string, unknown>,
    receivables: [] as unknown[],
    isFullBackup: false,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null);

  async function exportFullBackup() {
    const pin = prompt("Sisesta MyMoney PIN varukoopia krüpteerimiseks:");
    if (pin === null) return;
    if (!(await verifyPin(pin))) {
      alert("Vale PIN-kood. Varukoopiat ei loodud.");
      return;
    }

    const data = readJson(STORAGE_KEY, null);
    if (!validateMainData(data)) {
      alert("MyMoney põhiandmeid ei leitud või need on vigased.");
      return;
    }

    const backup = {
      format: "mymoney-full-backup",
      version: 4,
      createdAt: new Date().toISOString(),
      data,
      recurring: readJson(RECURRING_KEY, []),
      plannedPayments: readJson(PLANNED_KEY, []),
      categoryBudgets: cleanCategoryBudgets(readJson(CATEGORY_BUDGET_KEY, {})),
      receivables: cleanReceivables(readJson(RECEIVABLES_KEY, [])),
    };

    const blob = await encryptBackupJson(backup, pin);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mymoney-full-backup-${todayIso()}.mymoney`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let parsed: unknown;
      if (file.name.toLowerCase().endsWith(".mymoney")) {
        const pin = prompt("Sisesta selle varukoopia PIN-kood:");
        if (pin === null) return;
        parsed = await decryptBackupFile(file, pin);
      } else {
        const acceptedLegacy = window.confirm(
          "See on vana krüpteerimata JSON-varukoopia. Kas soovid selle ühekordselt importida? Uued varukoopiad salvestatakse ainult krüpteeritult.",
        );
        if (!acceptedLegacy) return;
        parsed = JSON.parse(await file.text());
      }

      const backup = parseBackup(parsed);
      if (!backup) {
        alert("See ei ole sobiv MyMoney varukoopia.");
        return;
      }

      const data = backup.data as BackupShape;
      const accepted = window.confirm(
        `Taastada varukoopia?\n\nTulud ja kulud: ${data.transactions?.length ?? 0}\nVõlad: ${data.debts?.length ?? 0}\nTodo: ${data.tasks?.length ?? 0}\nKorduvad kirjed: ${backup.recurring.length}\nPlaneeritud maksed: ${backup.plannedPayments.length}\nKategooriaeelarved: ${Object.keys(backup.categoryBudgets).length}\nMulle võlgu: ${backup.receivables.length}\n\nPraegused andmed asendatakse.`,
      );
      if (!accepted) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));
      if (backup.isFullBackup) {
        localStorage.setItem(RECURRING_KEY, JSON.stringify(backup.recurring));
        localStorage.setItem(PLANNED_KEY, JSON.stringify(backup.plannedPayments));
        localStorage.setItem(CATEGORY_BUDGET_KEY, JSON.stringify(backup.categoryBudgets));
        localStorage.setItem(RECEIVABLES_KEY, JSON.stringify(backup.receivables));
      }

      alert("Varukoopia taastatud. MyMoney avaneb nüüd uuesti ja küsib PIN-koodi.");
      window.location.reload();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      if (message === "WRONG_PIN_OR_CORRUPT_BACKUP") {
        alert("Vale PIN-kood või varukoopia on kahjustatud.");
      } else {
        alert("Varukoopia faili ei saanud avada.");
      }
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="restore-tools full-backup-tools">
      <button className="primary-button" onClick={() => void exportFullBackup()}>
        Laadi krüpteeritud varukoopia
      </button>
      <button className="secondary-button restore-button" onClick={() => inputRef.current?.click()}>
        Taasta varukoopia
      </button>
      <input
        ref={inputRef}
        className="restore-file-input"
        type="file"
        accept=".mymoney,application/octet-stream,application/json,.json"
        onChange={restore}
      />
      <small>Uued varukoopiad on AES-256-GCM krüpteeritud ja neid saab avada ainult õige PIN-koodiga.</small>
    </div>
  );
}
