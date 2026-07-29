import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: string;
};

type Debt = {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  dueDate: string;
};

type DebtPayment = {
  id: string;
  debtId: string;
  amount: number;
  date: string;
};

type PlannedPayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "planned" | "paid" | "cancelled";
};

type UpcomingPayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  source: "planned" | "debt";
};

type Receivable = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  note?: string;
  status: "open" | "paid";
};

type AppData = {
  transactions?: Transaction[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
};

type BudgetAlert = {
  category: string;
  limit: number;
  spent: number;
  percent: number;
  level: "warning" | "danger";
};

const euro = (value: number) =>
  new Intl.NumberFormat("et-FI", { style: "currency", currency: "EUR" }).format(value);

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const todayIso = () => localIsoDate();
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
  const [startYear, startMonth, startDay] = todayIso().split("-").map(Number);
  const [endYear, endMonth, endDay] = date.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86_400_000);
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
    };

    const refreshData = () => setRevision((value) => value + 1);
    const navigation = document.querySelector(".navigation");
    const handleNavigationClick = () => {
      window.requestAnimationFrame(() => {
        updateVisibility();
        refreshData();
      });
    };

    updateVisibility();
    navigation?.addEventListener("click", handleNavigationClick);
    window.addEventListener("mymoney-data-changed", refreshData);
    window.addEventListener("storage", refreshData);

    return () => {
      navigation?.removeEventListener("click", handleNavigationClick);
      window.removeEventListener("mymoney-data-changed", refreshData);
      window.removeEventListener("storage", refreshData);
      node.remove();
    };
  }, []);

  const summary = useMemo(() => {
    const data = readJson<AppData>(STORAGE_KEY, {});
    const planned = readJson<PlannedPayment[]>(PLANNED_KEY, []);
    const categoryBudgets = readJson<Record<string, number>>(CATEGORY_BUDGET_KEY, {});
    const receivables = readJson<Receivable[]>(RECEIVABLES_KEY, []);
    const month = currentMonth();
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const debts = Array.isArray(data.debts) ? data.debts : [];
    const debtPayments = Array.isArray(data.debtPayments) ? data.debtPayments : [];

    let income = 0;
    let expenses = 0;
    const categorySpending = new Map<string, number>();

    for (const item of transactions) {
      if (item.date?.slice(0, 7) !== month) continue;
      const amount = Number(item.amount || 0);
      if (item.type === "income") {
        income += amount;
      } else if (item.type === "expense") {
        expenses += amount;
        const category = item.category?.trim() || "Muu";
        categorySpending.set(category, (categorySpending.get(category) ?? 0) + amount);
      }
    }

    const unpaidPlanned: UpcomingPayment[] = planned
      .filter((item) => item.status === "planned")
      .map((item) => ({
        id: `planned-${item.id}`,
        name: item.name,
        amount: Number(item.amount || 0),
        dueDate: item.dueDate,
        source: "planned" as const,
      }));

    const unpaidDebts: UpcomingPayment[] = debts.flatMap((debt) => {
      if (!debt.dueDate) return [];

      const balance = Math.max(0, Number(debt.balance || 0));
      const minimumPayment = Math.max(0, Number(debt.minimumPayment || 0));
      const paidThisMonth = debtPayments
        .filter((payment) => payment.debtId === debt.id && payment.date?.slice(0, 7) === month)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const amountDue = minimumPayment > 0
        ? Math.max(0, Math.min(balance, minimumPayment - paidThisMonth))
        : balance;

      if (amountDue <= 0) return [];

      return [{
        id: `debt-${debt.id}`,
        name: debt.name,
        amount: amountDue,
        dueDate: debt.dueDate,
        source: "debt" as const,
      }];
    });

    const unpaid = [...unpaidPlanned, ...unpaidDebts]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const late: UpcomingPayment[] = [];
    const nextSevenDays: UpcomingPayment[] = [];
    let upcomingTotal = 0;

    for (const item of unpaid) {
      const days = daysUntil(item.dueDate);
      if (days < 0) late.push(item);
      if (days >= 0 && days <= 7) {
        nextSevenDays.push(item);
        upcomingTotal += item.amount;
      }
    }

    const openReceivables = (Array.isArray(receivables) ? receivables : [])
      .filter((item) => item.status === "open")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const overdueReceivables = openReceivables.filter((item) => daysUntil(item.dueDate) < 0);
    const incomingSevenDays = openReceivables.filter((item) => {
      const days = daysUntil(item.dueDate);
      return days >= 0 && days <= 7;
    });
    const incomingSevenDaysTotal = incomingSevenDays.reduce((sum, item) => sum + Number(item.amount || 0), 0);

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

    const hasCriticalAlert = late.length > 0 || overdueReceivables.length > 0 || budgetAlerts.some((item) => item.level === "danger");
    const attentionCount = late.length + overdueReceivables.length + budgetAlerts.length;

    return {
      income,
      expenses,
      result: income - expenses,
      late,
      nextSevenDays,
      upcomingTotal,
      nextPayment: unpaid[0],
      budgetAlerts,
      openReceivables,
      overdueReceivables,
      incomingSevenDays,
      incomingSevenDaysTotal,
      nextReceivable: openReceivables[0],
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
              : "Maksed, laekumised ja eelarved on kontrolli all"}
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
          <small>{summary.nextSevenDays.length} makset, sh võlad</small>
        </article>
        <article>
          <span>Järgmise 7 päeva laekumised</span>
          <strong className="positive-text">{euro(summary.incomingSevenDaysTotal)}</strong>
          <small>{summary.incomingSevenDays.length} oodatavat makset</small>
        </article>
        <article>
          <span>Eelarvehoiatused</span>
          <strong>{summary.budgetAlerts.length}</strong>
          <small>{summary.budgetAlerts.filter((item) => item.level === "danger").length} kategooriat üle piiri</small>
        </article>
        <article>
          <span>Järgmine väljaminek</span>
          <strong>{summary.nextPayment ? summary.nextPayment.name : "Puudub"}</strong>
          <small>{summary.nextPayment ? `${summary.nextPayment.dueDate} · ${euro(summary.nextPayment.amount)}${summary.nextPayment.source === "debt" ? " · võlg" : ""}` : "Ühtegi tasumata makset pole"}</small>
        </article>
        <article>
          <span>Järgmine laekumine</span>
          <strong>{summary.nextReceivable ? summary.nextReceivable.name : "Puudub"}</strong>
          <small>{summary.nextReceivable ? `${summary.nextReceivable.dueDate} · ${euro(summary.nextReceivable.amount)}` : "Ühtegi oodatavat laekumist pole"}</small>
        </article>
      </div>

      {summary.late.length > 0 && (
        <div className="today-alert-list">
          {summary.late.slice(0, 3).map((item) => (
            <div className="today-alert-row" key={item.id}>
              <div><strong>{item.name}</strong><span>{item.source === "debt" ? "Võlamakse hilinenud" : "Makse hilinenud"} · tähtaeg {item.dueDate}</span></div>
              <strong>{euro(item.amount)}</strong>
            </div>
          ))}
        </div>
      )}

      {summary.overdueReceivables.length > 0 && (
        <div className="today-alert-list">
          {summary.overdueReceivables.slice(0, 3).map((item) => (
            <div className="today-alert-row" key={item.id}>
              <div><strong>{item.name}</strong><span>Sulle võlgnetav makse hilinenud · {item.dueDate}{item.note ? ` · ${item.note}` : ""}</span></div>
              <strong className="positive-text">{euro(item.amount)}</strong>
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
