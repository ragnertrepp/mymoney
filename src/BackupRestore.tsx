import { useRef, type ChangeEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

type BackupShape = {
  format?: string;
  version?: number;
  createdAt?: string;
  data?: unknown;
  recurring?: unknown[];
  plannedPayments?: unknown[];
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
    isFullBackup: false,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null);

  function exportFullBackup() {
    const data = readJson(STORAGE_KEY, null);
    if (!validateMainData(data)) {
      alert("MyMoney põhiandmeid ei leitud või need on vigased.");
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

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const backup = parseBackup(parsed);

      if (!backup) {
        alert("See ei ole sobiv MyMoney varukoopia.");
        return;
      }

      const data = backup.data as BackupShape;
      const accepted = window.confirm(
        `Taastada varukoopia?\n\nTulud ja kulud: ${data.transactions?.length ?? 0}\nVõlad: ${data.debts?.length ?? 0}\nTodo: ${data.tasks?.length ?? 0}\nKorduvad kirjed: ${backup.recurring.length}\nPlaneeritud maksed: ${backup.plannedPayments.length}\n\nPraegused andmed asendatakse.`,
      );

      if (!accepted) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));

      if (backup.isFullBackup) {
        localStorage.setItem(RECURRING_KEY, JSON.stringify(backup.recurring));
        localStorage.setItem(PLANNED_KEY, JSON.stringify(backup.plannedPayments));
      }

      alert(
        backup.isFullBackup
          ? "Täielik varukoopia taastatud. MyMoney avaneb nüüd uuesti."
          : "Vana tüüpi varukoopia taastatud. Korduvaid ja planeeritud kirjeid see fail ei sisaldanud.",
      );
      window.location.reload();
    } catch {
      alert("Varukoopia faili ei saanud avada.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="restore-tools full-backup-tools">
      <button className="primary-button" onClick={exportFullBackup}>
        Laadi täielik varukoopia
      </button>
      <button className="secondary-button restore-button" onClick={() => inputRef.current?.click()}>
        Taasta varukoopia
      </button>
      <input
        ref={inputRef}
        className="restore-file-input"
        type="file"
        accept="application/json,.json"
        onChange={restore}
      />
    </div>
  );
}
