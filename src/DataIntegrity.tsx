import { useEffect, useState } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const REPORT_KEY = "rebuildme-mymoney-integrity-report-v1";

type Issue = {
  area: string;
  message: string;
};

type IntegrityReport = {
  checkedAt: string;
  issues: Issue[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseStorage(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return Symbol("invalid-json");
  }
}

function scanData(): IntegrityReport {
  const issues: Issue[] = [];
  const data = parseStorage(STORAGE_KEY);

  if (typeof data === "symbol") {
    issues.push({ area: "Põhiandmed", message: "Andmefail ei ole loetav JSON." });
  } else if (!isObject(data)) {
    issues.push({ area: "Põhiandmed", message: "Põhiandmed puuduvad või on vales formaadis." });
  } else {
    const arrays = ["transactions", "debts", "debtPayments", "tasks"] as const;
    for (const key of arrays) {
      if (!Array.isArray(data[key])) {
        issues.push({ area: "Põhiandmed", message: `${key} ei ole nimekiri.` });
      }
    }

    if (!isObject(data.settings)) {
      issues.push({ area: "Seaded", message: "Seaded puuduvad või on vales formaadis." });
    }

    if (Array.isArray(data.transactions)) {
      data.transactions.forEach((item, index) => {
        if (!isObject(item)) {
          issues.push({ area: "Tulud ja kulud", message: `Kirje ${index + 1} on vigane.` });
          return;
        }
        if (typeof item.name !== "string" || !item.name.trim()) {
          issues.push({ area: "Tulud ja kulud", message: `Kirjel ${index + 1} puudub nimetus.` });
        }
        if (!isPositiveNumber(item.amount)) {
          issues.push({ area: "Tulud ja kulud", message: `Kirjel ${index + 1} on vigane summa.` });
        }
        if (item.type !== "income" && item.type !== "expense") {
          issues.push({ area: "Tulud ja kulud", message: `Kirjel ${index + 1} on vigane tüüp.` });
        }
        if (!isDate(item.date)) {
          issues.push({ area: "Tulud ja kulud", message: `Kirjel ${index + 1} puudub korrektne kuupäev.` });
        }
      });
    }

    if (Array.isArray(data.debts)) {
      data.debts.forEach((item, index) => {
        if (!isObject(item) || typeof item.name !== "string" || !isPositiveNumber(item.balance)) {
          issues.push({ area: "Võlad", message: `Võlakirje ${index + 1} on vigane.` });
        }
      });
    }

    if (Array.isArray(data.tasks)) {
      data.tasks.forEach((item, index) => {
        if (!isObject(item) || typeof item.title !== "string" || !isDate(item.date)) {
          issues.push({ area: "Todo", message: `Ülesanne ${index + 1} on vigane.` });
        }
      });
    }
  }

  const recurring = parseStorage(RECURRING_KEY);
  if (typeof recurring === "symbol") {
    issues.push({ area: "Korduvad kirjed", message: "Andmed ei ole loetavad." });
  } else if (recurring !== null && !Array.isArray(recurring)) {
    issues.push({ area: "Korduvad kirjed", message: "Andmed on vales formaadis." });
  } else if (Array.isArray(recurring)) {
    recurring.forEach((item, index) => {
      if (!isObject(item) || typeof item.name !== "string" || !isPositiveNumber(item.amount)) {
        issues.push({ area: "Korduvad kirjed", message: `Kirje ${index + 1} on vigane.` });
      }
    });
  }

  const planned = parseStorage(PLANNED_KEY);
  if (typeof planned === "symbol") {
    issues.push({ area: "Planeeritud maksed", message: "Andmed ei ole loetavad." });
  } else if (planned !== null && !Array.isArray(planned)) {
    issues.push({ area: "Planeeritud maksed", message: "Andmed on vales formaadis." });
  } else if (Array.isArray(planned)) {
    planned.forEach((item, index) => {
      if (!isObject(item) || typeof item.name !== "string" || !isPositiveNumber(item.amount) || !isDate(item.dueDate)) {
        issues.push({ area: "Planeeritud maksed", message: `Makse ${index + 1} on vigane.` });
      }
    });
  }

  return { checkedAt: new Date().toISOString(), issues };
}

function saveReport(report: IntegrityReport) {
  localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  window.dispatchEvent(new CustomEvent("mymoney-integrity-updated", { detail: report }));
}

function repairData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return false;
    data = parsed;
  } catch {
    return false;
  }

  const transactions = Array.isArray(data.transactions)
    ? data.transactions.filter((item) =>
        isObject(item) &&
        typeof item.name === "string" && item.name.trim() !== "" &&
        isPositiveNumber(item.amount) &&
        (item.type === "income" || item.type === "expense") &&
        isDate(item.date),
      )
    : [];

  const debts = Array.isArray(data.debts)
    ? data.debts.filter((item) => isObject(item) && typeof item.name === "string" && isPositiveNumber(item.balance))
    : [];

  const debtPayments = Array.isArray(data.debtPayments)
    ? data.debtPayments.filter((item) => isObject(item) && isPositiveNumber(item.amount) && isDate(item.date))
    : [];

  const tasks = Array.isArray(data.tasks)
    ? data.tasks.filter((item) => isObject(item) && typeof item.title === "string" && isDate(item.date))
    : [];

  const settings = isObject(data.settings)
    ? {
        startingBalance: typeof data.settings.startingBalance === "number" && Number.isFinite(data.settings.startingBalance)
          ? data.settings.startingBalance
          : 0,
        monthlyReserve: typeof data.settings.monthlyReserve === "number" && Number.isFinite(data.settings.monthlyReserve)
          ? Math.max(0, data.settings.monthlyReserve)
          : 100,
      }
    : { startingBalance: 0, monthlyReserve: 100 };

  localStorage.setItem(`${STORAGE_KEY}-before-repair-${Date.now()}`, raw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, transactions, debts, debtPayments, tasks, settings }));

  const cleanList = (key: string, validator: (item: Record<string, unknown>) => boolean) => {
    const value = parseStorage(key);
    if (!Array.isArray(value)) {
      localStorage.setItem(key, "[]");
      return;
    }
    localStorage.setItem(key, JSON.stringify(value.filter((item) => isObject(item) && validator(item))));
  };

  cleanList(RECURRING_KEY, (item) => typeof item.name === "string" && isPositiveNumber(item.amount));
  cleanList(PLANNED_KEY, (item) => typeof item.name === "string" && isPositiveNumber(item.amount) && isDate(item.dueDate));
  return true;
}

export default function DataIntegrityGuard() {
  useEffect(() => {
    saveReport(scanData());
  }, []);
  return null;
}

export function DataIntegrityTool() {
  const [report, setReport] = useState<IntegrityReport>(() => scanData());

  function runCheck() {
    const next = scanData();
    saveReport(next);
    setReport(next);
  }

  function repair() {
    if (!window.confirm("Parandamisel eemaldatakse vigased kirjed. Enne parandust tehakse brauserisse automaatne koopia. Jätkata?")) return;
    const repaired = repairData();
    if (!repaired) {
      alert("Põhiandmeid ei saanud automaatselt parandada. Taasta viimane varukoopia.");
      return;
    }
    const next = scanData();
    saveReport(next);
    setReport(next);
    alert("Andmed kontrollitud ja parandatud. MyMoney avaneb uuesti.");
    window.location.reload();
  }

  return (
    <div className="integrity-tool">
      <div className={`integrity-status ${report.issues.length > 0 ? "warning" : "good"}`}>
        <strong>{report.issues.length > 0 ? `${report.issues.length} võimalikku viga` : "Andmed korras"}</strong>
        <span>Viimane kontroll: {new Date(report.checkedAt).toLocaleString("et-EE")}</span>
      </div>

      {report.issues.length > 0 && (
        <div className="integrity-issues">
          {report.issues.slice(0, 6).map((issue, index) => (
            <div key={`${issue.area}-${index}`}><strong>{issue.area}</strong><span>{issue.message}</span></div>
          ))}
          {report.issues.length > 6 && <small>Lisaks veel {report.issues.length - 6} viga.</small>}
        </div>
      )}

      <div className="integrity-actions">
        <button className="secondary-button" onClick={runCheck}>Kontrolli uuesti</button>
        {report.issues.length > 0 && <button className="primary-button" onClick={repair}>Paranda andmed</button>}
      </div>
    </div>
  );
}
