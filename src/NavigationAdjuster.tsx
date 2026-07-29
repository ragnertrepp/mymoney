import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type DebtView = "overview" | "mine" | "receivables";

type ReceivablePayment = {
  amount: number;
};

type Receivable = {
  amount: number;
  dueDate: string;
  status: "open" | "paid";
  payments?: ReceivablePayment[];
};

const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";

function activeMainTab() {
  return document.querySelector(".navigation .nav-button.active")?.textContent?.trim() ?? "";
}

function findSectionByText(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("main > section.card"))
    .find((section) => section.textContent?.includes(text)) ?? null;
}

function readReceivables(): Receivable[] {
  try {
    const raw = localStorage.getItem(RECEIVABLES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function remaining(item: Receivable) {
  const paid = Array.isArray(item.payments)
    ? item.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    : item.status === "paid"
      ? Number(item.amount || 0)
      : 0;
  return Math.max(0, Number(item.amount || 0) - paid);
}

const euro = (value: number) =>
  new Intl.NumberFormat("et-FI", { style: "currency", currency: "EUR" }).format(value);

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function NavigationAdjuster() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [debtView, setDebtView] = useState<DebtView>("overview");
  const [isDebts, setIsDebts] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const mainNode = document.querySelector("main");
    if (!(mainNode instanceof HTMLElement)) return;

    const mount = document.createElement("div");
    mount.className = "debt-subnav-mount";
    mainNode.insertBefore(mount, mainNode.firstChild);
    setMountNode(mount);

    const update = () => {
      const tab = activeMainTab();
      const debtsActive = tab === "Võlad";
      setIsDebts(debtsActive);
      mount.style.display = debtsActive ? "block" : "none";

      const budgetNav = document.querySelector<HTMLElement>("main .sub-navigation[aria-label='Eelarve vaated']");
      if (budgetNav) {
        Array.from(budgetNav.querySelectorAll("button")).forEach((button) => {
          if (button.textContent?.trim() === "Seaded") button.style.display = "none";
        });
        budgetNav.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
      }
    };

    const navigation = document.querySelector(".navigation");
    const handleNavigation = () => window.requestAnimationFrame(() => {
      update();
      if (activeMainTab() === "Võlad") {
        setDebtView("overview");
        setRevision((value) => value + 1);
      }
    });
    const refresh = () => setRevision((value) => value + 1);

    update();
    navigation?.addEventListener("click", handleNavigation);
    window.addEventListener("mymoney-data-changed", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      navigation?.removeEventListener("click", handleNavigation);
      window.removeEventListener("mymoney-data-changed", refresh);
      window.removeEventListener("storage", refresh);
      mount.remove();
    };
  }, []);

  useEffect(() => {
    if (!isDebts) return;

    const apply = () => {
      const summary = document.querySelector<HTMLElement>("main > .summary-grid");
      const addDebt = findSectionByText("Lisa võlatabelisse");
      const debtList = findSectionByText("Võlad prioriteedi järgi");
      const receivables = document.querySelector<HTMLElement>("main > .receivables-mount");

      if (summary) summary.style.display = debtView === "overview" ? "grid" : "none";
      if (addDebt) addDebt.style.display = debtView === "mine" ? "block" : "none";
      if (debtList) debtList.style.display = debtView === "mine" ? "block" : "none";
      if (receivables) receivables.style.display = debtView === "receivables" ? "block" : "none";
    };

    apply();
    const id = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(id);
  }, [isDebts, debtView]);

  const receivableStats = useMemo(() => {
    void revision;
    const items = readReceivables();
    const open = items.filter((item) => remaining(item) > 0);
    const total = open.reduce((sum, item) => sum + remaining(item), 0);
    const overdue = open.filter((item) => item.dueDate && item.dueDate < todayIso()).length;
    return { total, count: open.length, overdue };
  }, [revision]);

  if (!mountNode || !isDebts) return null;

  return createPortal(
    <>
      <nav className="sub-navigation debt-sub-navigation" aria-label="Võlgade vaated">
        <button className={debtView === "overview" ? "active" : ""} onClick={() => setDebtView("overview")}>Ülevaade</button>
        <button className={debtView === "mine" ? "active" : ""} onClick={() => setDebtView("mine")}>Minu võlad</button>
        <button className={debtView === "receivables" ? "active" : ""} onClick={() => setDebtView("receivables")}>Mulle võlgu</button>
      </nav>

      {debtView === "overview" && (
        <section className="summary-grid receivables-overview-summary">
          <article className="summary-card">
            <span>Mulle võlgu kokku</span>
            <strong className="positive-text">{euro(receivableStats.total)}</strong>
            <small>{receivableStats.count} laekumata nõuet</small>
          </article>
          <article className="summary-card">
            <span>Laekumata</span>
            <strong>{receivableStats.count}</strong>
            <small>Aktiivsed nõuded</small>
          </article>
          <article className="summary-card">
            <span>Hilinenud</span>
            <strong className={receivableStats.overdue > 0 ? "negative-text" : "positive-text"}>{receivableStats.overdue}</strong>
            <small>Üle tähtaja</small>
          </article>
        </section>
      )}
    </>,
    mountNode,
  );
}
