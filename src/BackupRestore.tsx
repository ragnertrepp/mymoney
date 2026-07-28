import { useRef, type ChangeEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";

type BackupShape = {
  data?: unknown;
  transactions?: unknown[];
  debts?: unknown[];
  debtPayments?: unknown[];
  tasks?: unknown[];
  settings?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateBackup(value: unknown) {
  if (!isObject(value)) return null;

  const wrapped = value as BackupShape;
  const raw = isObject(wrapped.data) ? wrapped.data : value;
  if (!isObject(raw)) return null;

  const candidate = raw as BackupShape;
  if (!Array.isArray(candidate.transactions)) return null;
  if (!Array.isArray(candidate.debts)) return null;
  if (!Array.isArray(candidate.debtPayments)) return null;
  if (!Array.isArray(candidate.tasks)) return null;
  if (!isObject(candidate.settings)) return null;

  return raw;
}

export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null);

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const backup = validateBackup(parsed);

      if (!backup) {
        alert("See ei ole sobiv MyMoney varukoopia.");
        return;
      }

      const data = backup as BackupShape;
      const accepted = window.confirm(
        `Taastada varukoopia?\n\nTulud ja kulud: ${data.transactions?.length ?? 0}\nVõlad: ${data.debts?.length ?? 0}\nTodo: ${data.tasks?.length ?? 0}\n\nPraegused andmed asendatakse.`,
      );

      if (!accepted) return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
      alert("Varukoopia taastatud. MyMoney avaneb nüüd uuesti.");
      window.location.reload();
    } catch {
      alert("Varukoopia faili ei saanud avada.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="restore-tools">
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
