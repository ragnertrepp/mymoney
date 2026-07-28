import { useEffect } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

type Transaction = { amount: number; type: "income" | "expense"; date: string };
type Debt = { id: string; minimumPayment: number };
type DebtPayment = { debtId: string; amount: number; date: string };
type PlannedPayment = { amount: number; dueDate: string; status: "planned" | "paid" | "cancelled" };
type AppData = {
  transactions?: Transaction[];
  debts?: Debt[];
  debtPayments?: DebtPayment[];
  settings?: { startingBalance?: number; monthlyReserve?: number };
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => todayIso().slice(0, 7);
const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function calculate() {
  const data = readJson<AppData>(STORAGE_KEY, {});
  const planned = readJson<PlannedPayment[]>(PLANNED_KEY, []);
  const month = currentMonth();

  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const debts = Array.isArray(data.debts) ? data.debts : [];
  const debtPayments = Array.isArray(data.debtPayments) ? data.debtPayments : [];

  const monthTransactions = transactions.filter((item) => item.date?.slice(0, 7) === month);
  const income = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const currentBalance = Number(data.settings?.startingBalance || 0) + income - expenses;
  const reserve = Math.max(0, Number(data.settings?.monthlyReserve || 0));

  const paidByDebt = new Map<string, number>();
  for (const payment of debtPayments) {
    if (payment.date?.slice(0, 7) !== month) continue;
    paidByDebt.set(payment.debtId, (paidByDebt.get(payment.debtId) ?? 0) + Number(payment.amount || 0));
  }

  const debtRemaining = debts.reduce(
    (sum, debt) => sum + Math.max(0, Number(debt.minimumPayment || 0) - (paidByDebt.get(debt.id) ?? 0)),
    0,
  );

  const plannedRemaining = (Array.isArray(planned) ? planned : [])
    .filter((item) => item.status === "planned" && item.dueDate?.slice(0, 7) === month)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const safeToSpend = currentBalance - debtRemaining - plannedRemaining - reserve;
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDay - now.getDate() + 1);

  return {
    safeToSpend,
    plannedRemaining,
    dailyBudget: Math.max(0, safeToSpend / remainingDays),
  };
}

function replaceSummaryValue(label: string, value: string, detail?: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".summary-card"));
  const card = cards.find((item) => item.querySelector("span")?.textContent?.trim() === label);
  if (!card) return;
  const strong = card.querySelector("strong");
  const small = card.querySelector("small");
  if (strong && strong.textContent !== value) strong.textContent = value;
  if (small && detail && small.textContent !== detail) small.textContent = detail;
}

export default function SafeBudgetAdjuster() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const values = calculate();
        replaceSummaryValue(
          "Turvaliselt kasutada",
          euro(Math.max(0, values.safeToSpend)),
          `Pärast reservi, võlamakseid ja ${euro(values.plannedRemaining)} planeeritud makseid`,
        );
        replaceSummaryValue("Päevane eelarve", euro(values.dailyBudget));
        replaceSummaryValue(
          "Prognoos",
          euro(values.safeToSpend),
          "Pärast reservi, võla- ja planeeritud makseid",
        );
      });
    };

    apply();
    window.addEventListener("mymoney-data-changed", apply);
    window.addEventListener("storage", apply);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mymoney-data-changed", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
