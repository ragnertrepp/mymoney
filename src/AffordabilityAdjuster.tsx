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

function safeToSpend() {
  const data = readJson<AppData>(STORAGE_KEY, {});
  const planned = readJson<PlannedPayment[]>(PLANNED_KEY, []);
  const month = todayIso().slice(0, 7);
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const debts = Array.isArray(data.debts) ? data.debts : [];
  const payments = Array.isArray(data.debtPayments) ? data.debtPayments : [];

  const monthTransactions = transactions.filter((item) => item.date?.slice(0, 7) === month);
  const income = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const paidByDebt = new Map<string, number>();
  for (const payment of payments) {
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

  const balance = Number(data.settings?.startingBalance || 0) + income - expenses;
  const reserve = Math.max(0, Number(data.settings?.monthlyReserve || 0));

  return {
    available: balance - debtRemaining - plannedRemaining - reserve,
    reserve,
    plannedRemaining,
  };
}

function findPurchaseInput() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>(".section-heading h2"));
  const heading = headings.find((item) => item.textContent?.trim() === "Kas saan lubada?");
  const card = heading?.closest<HTMLElement>(".card");
  if (!card) return null;
  const inputs = Array.from(card.querySelectorAll<HTMLInputElement>('input[type="number"]'));
  return { card, input: inputs[0] ?? null };
}

function applyResult(card: HTMLElement, purchaseValue: number) {
  const result = card.querySelector<HTMLElement>(".affordability");
  if (!result) return;

  const title = result.querySelector<HTMLElement>("strong");
  const message = result.querySelector<HTMLElement>("span");
  if (!title || !message) return;

  result.classList.remove("neutral", "good", "warning", "danger");

  if (!Number.isFinite(purchaseValue) || purchaseValue <= 0) {
    result.classList.add("neutral");
    title.textContent = "Sisesta ostu hind";
    message.textContent = "Arvutus arvestab reservi, võlamakseid ja planeeritud arveid.";
    return;
  }

  const values = safeToSpend();
  const afterPurchase = values.available - purchaseValue;

  if (afterPurchase >= values.reserve) {
    result.classList.add("good");
    title.textContent = "Jah, saad lubada";
    message.textContent = `Pärast ostu jääb turvaliselt kasutada ${euro(afterPurchase)}. Planeeritud makseid on arvestatud ${euro(values.plannedRemaining)}.`;
  } else if (afterPurchase >= 0) {
    result.classList.add("warning");
    title.textContent = "Saad lubada, aga eelarve läheb pingeliseks";
    message.textContent = `Pärast ostu jääb kasutada ${euro(afterPurchase)}. Turvareserv jääb osaliselt katmata.`;
  } else {
    result.classList.add("danger");
    title.textContent = "Praegu ei ole mõistlik";
    message.textContent = `Pärast kõiki planeeritud kohustusi jääb ostu jaoks puudu ${euro(Math.abs(afterPurchase))}.`;
  }
}

export default function AffordabilityAdjuster() {
  useEffect(() => {
    let currentInput: HTMLInputElement | null = null;
    let currentCard: HTMLElement | null = null;

    const handleInput = () => {
      if (currentInput && currentCard) applyResult(currentCard, Number(currentInput.value));
    };

    const bind = () => {
      const found = findPurchaseInput();
      if (!found?.input) return;
      if (currentInput === found.input) {
        applyResult(found.card, Number(found.input.value));
        return;
      }

      currentInput?.removeEventListener("input", handleInput);
      currentInput = found.input;
      currentCard = found.card;
      currentInput.addEventListener("input", handleInput);
      applyResult(found.card, Number(found.input.value));
    };

    bind();
    window.addEventListener("mymoney-data-changed", bind);
    window.addEventListener("storage", bind);
    document.addEventListener("click", bind);

    return () => {
      currentInput?.removeEventListener("input", handleInput);
      window.removeEventListener("mymoney-data-changed", bind);
      window.removeEventListener("storage", bind);
      document.removeEventListener("click", bind);
    };
  }, []);

  return null;
}
