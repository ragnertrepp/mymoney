import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

type PlannedPayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "planned" | "paid" | "cancelled";
};

type AppData = {
  transactions?: Transaction[];
};

const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => todayIso().slice(0, 7);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function daysUntil(date: string) {
  const start = new Date(`${todayIso()}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export default function TodayOverview() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;

    const node = document.createElement("div");
    node.className = "today-overview-mount";
    main.prepend(node);
    setMountNode(node);

    const updateVisibility = () => {
      const active = document.querySelector(".navigation .nav-button.active");
      setVisible(active?.textContent?.trim() === "Täna");
      setRevision((value) => value + 1);
    };

    updateVisibility();
    document.addEventListener("click", updateVisibility);
    window.addEventListener("storage", updateVisibility);

    return () => {
      document.removeEventListener("click", updateVisibility);
      window.removeEventListener("storage", updateVisibility);
      node.remove();
    };
  }, []);

  const summary = useMemo(() => {
    const data = readJson<AppData>(STORAGE_KEY, {});
    const planned = readJson<PlannedPayment[]>(PLANNED_KEY, []);
    const month = currentMonth();
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];

    const monthTransactions = transactions.filter((item) => item.date?.slice(0, 7) === month);
    const income = monthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const unpaid = planned
      .filter((item) => item.status === "planned")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const late = unpaid.filter((item) => item.dueDate < todayIso());
    const nextSevenDays = unpaid.filter((item) => {
      const days = daysUntil(item.dueDate);
      return days >= 0 && days <= 7;
    });
    const upcomingTotal = nextSevenDays.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      income,
      expenses,
      result: income - expenses,
      late,
      nextSevenDays,
      upcomingTotal,
      nextPayment: unpaid[0],
    };
  }, [revision]);

  if (!mountNode || !visible) return null;

  return createPortal(
    <section className={`today-overview ${summary.late.length > 0 ? "has-alert" : ""}`}>
      <div className="today-overview-heading">
        <div>
          <p className="eyebrow">Oluline täna</p>
          <h2>{summary.late.length > 0 ? `${summary.late.length} hilinenud makset` : "Maksed on kontrolli all"}</h2>
        </div>
        <span className={`today-status-pill ${summary.late.length > 0 ? "danger" : "good"}`}>
          {summary.late.length > 0 ? "Vajab tähelepanu" : "Korras"}
        </span>
      </div>

      <div className="today-overview-grid">
        <article>
          <span>Kuu tulemus</span>
          <strong className={summary.result >= 0 ? "positive-text" : "negative-text"}>{euro(summary.result)}</strong>
          <small>{euro(summary.income)} tulu · {euro(summary.expenses)} kulu</small>
        </article>
        <article>
          <span>Järgmise 7 päeva maksed</span>
          <strong>{euro(summary.upcomingTotal)}</strong>
          <small>{summary.nextSevenDays.length} planeeritud makset</small>
        </article>
        <article>
          <span>Järgmine tähtaeg</span>
          <strong>{summary.nextPayment ? summary.nextPayment.name : "Puudub"}</strong>
          <small>{summary.nextPayment ? `${summary.nextPayment.dueDate} · ${euro(summary.nextPayment.amount)}` : "Ühtegi tasumata makset pole"}</small>
        </article>
      </div>

      {summary.late.length > 0 && (
        <div className="today-alert-list">
          {summary.late.slice(0, 3).map((item) => (
            <div className="today-alert-row" key={item.id}>
              <div><strong>{item.name}</strong><span>Tähtaeg {item.dueDate}</span></div>
              <strong>{euro(item.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>,
    mountNode,
  );
}
