import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: string;
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

type BudgetAlert = {
  category: string;
  limit: number;
  spent: number;
  percent: number;
  level: "warning" | "danger";
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
    const categoryBudgets = readJson<Record<string, number>>(CATEGORY_BUDGET_KEY, {});
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

    const categorySpending = new Map<string, number>();
    monthTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const category = item.category?.trim() || "Muu";
        categorySpending.set(category, (categorySpending.get(category) ?? 0) + Number(item.amount || 0));
      });

    const budgetAlerts: BudgetAlert[] = Object.entries(categoryBudgets)
      .map(([category, limit]) => {
        const spent = categorySpending.get(category) ?? 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        return {
          category,
          limit,
          spent,
          percent,
          level: percent >= 100 ? "danger" : "warning",
        } as BudgetAlert;
      })
      .filter((item) => item.percent >= 80)
      .sort((a, b) => b.percent - a.percent);

    const hasCriticalAlert = late.length > 0 || budgetAlerts.some((item) => item.level === "danger");
    const attentionCount = late.length + budgetAlerts.length;

    return {
      income,
      expenses,
      result: income - expenses,
      late,
      nextSevenDays,
      upcomingTotal,
      nextPayment: unpaid[0],
      budgetAlerts,
      hasCriticalAlert,
      attentionCount,
    };
  }, [revision]);

  if (!mountNode || !visible) return null;

  return createPortal(
    <section className={`today-overview ${summary.attentionCount > 0 ? "has-alert" : ""}`}>
      <div className="today-overview-heading">
        <div>
          <p className="eyebrow">Oluline täna</p>
          <h2>
            {summary.attentionCount > 0
              ? `${summary.attentionCount} asja vajab tähelepanu`
              : "Maksed ja eelarved on kontrolli all"}
          </h2>
        </div>
        <span className={`today-status-pill ${summary.hasCriticalAlert ? "danger" : summary.attentionCount > 0 ? "warning" : "good"}`}>
          {summary.hasCriticalAlert ? "Vajab tähelepanu" : summary.attentionCount > 0 ? "Piiri lähedal" : "Korras"}
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
          <span>Eelarvehoiatused</span>
          <strong>{summary.budgetAlerts.length}</strong>
          <small>{summary.budgetAlerts.filter((item) => item.level === "danger").length} kategooriat üle piiri</small>
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

      {summary.budgetAlerts.length > 0 && (
        <div className="today-budget-alerts">
          {summary.budgetAlerts.slice(0, 4).map((item) => (
            <article className={`today-budget-alert ${item.level}`} key={item.category}>
              <div className="today-budget-alert-heading">
                <div>
                  <strong>{item.category}</strong>
                  <span>{item.level === "danger" ? `Üle piiri ${euro(item.spent - item.limit)}` : `Kasutatud ${item.percent.toFixed(0)}%`}</span>
                </div>
                <strong>{euro(item.spent)} / {euro(item.limit)}</strong>
              </div>
              <div className="today-budget-track">
                <div style={{ width: `${Math.min(100, item.percent)}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>,
    mountNode,
  );
}
