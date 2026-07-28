import { useEffect, useState } from "react";

const HISTORY_KEY = "rebuildme-mymoney-undo-v1";
const TRACKED_KEYS = [
  "rebuildme-mymoney-v2",
  "rebuildme-mymoney-recurring-v1",
  "rebuildme-mymoney-planned-v1",
];

type UndoEntry = {
  id: string;
  createdAt: string;
  key: string;
  previousValue: string | null;
  nextValue: string | null;
};

function readHistory(): UndoEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(history: UndoEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-30)));
  window.dispatchEvent(new CustomEvent("mymoney-undo-updated"));
}

export default function UndoManagerGuard() {
  useEffect(() => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    let restoring = false;

    localStorage.setItem = (key: string, value: string) => {
      if (!restoring && TRACKED_KEYS.includes(key)) {
        const previousValue = localStorage.getItem(key);
        if (previousValue !== value) {
          const history = readHistory();
          history.push({ id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), key, previousValue, nextValue: value });
          originalSetItem(HISTORY_KEY, JSON.stringify(history.slice(-30)));
          window.dispatchEvent(new CustomEvent("mymoney-undo-updated"));
        }
      }
      originalSetItem(key, value);
    };

    localStorage.removeItem = (key: string) => {
      if (!restoring && TRACKED_KEYS.includes(key)) {
        const previousValue = localStorage.getItem(key);
        if (previousValue !== null) {
          const history = readHistory();
          history.push({ id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), key, previousValue, nextValue: null });
          originalSetItem(HISTORY_KEY, JSON.stringify(history.slice(-30)));
          window.dispatchEvent(new CustomEvent("mymoney-undo-updated"));
        }
      }
      originalRemoveItem(key);
    };

    const restore = (entry: UndoEntry) => {
      restoring = true;
      if (entry.previousValue === null) originalRemoveItem(entry.key);
      else originalSetItem(entry.key, entry.previousValue);
      restoring = false;
    };

    (window as Window & { __mymoneyUndoRestore?: (entry: UndoEntry) => void }).__mymoneyUndoRestore = restore;

    return () => {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      delete (window as Window & { __mymoneyUndoRestore?: (entry: UndoEntry) => void }).__mymoneyUndoRestore;
    };
  }, []);

  return null;
}

export function UndoManagerTool() {
  const [history, setHistory] = useState<UndoEntry[]>(() => readHistory());

  useEffect(() => {
    const update = () => setHistory(readHistory());
    window.addEventListener("mymoney-undo-updated", update);
    return () => window.removeEventListener("mymoney-undo-updated", update);
  }, []);

  const latest = history.at(-1);

  function undo() {
    if (!latest) return;
    const restore = (window as Window & { __mymoneyUndoRestore?: (entry: UndoEntry) => void }).__mymoneyUndoRestore;
    if (!restore) return;
    restore(latest);
    writeHistory(history.slice(0, -1));
    alert("Viimane muudatus taastati. MyMoney avaneb uuesti.");
    window.location.reload();
  }

  function clearHistory() {
    if (!window.confirm("Kustutada tagasivõtmise ajalugu?")) return;
    writeHistory([]);
    setHistory([]);
  }

  return (
    <div className="undo-tool">
      <div className="integrity-status good">
        <strong>{latest ? "Viimase muudatuse saab tagasi võtta" : "Tagasivõetavaid muudatusi pole"}</strong>
        <span>{latest ? new Date(latest.createdAt).toLocaleString("et-EE") : "Ajalugu on tühi"}</span>
      </div>
      <div className="integrity-actions">
        <button className="primary-button" disabled={!latest} onClick={undo}>Võta viimane muudatus tagasi</button>
        {history.length > 0 && <button className="secondary-button" onClick={clearHistory}>Tühjenda ajalugu</button>}
      </div>
    </div>
  );
}
