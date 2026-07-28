import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import "./App.css";

type TransactionType = "income" | "expense";
type MainTab = "today" | "budget" | "debts" | "tasks" | "calendar";
type BudgetTab = "overview" | "entry" | "settings";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
};

type Debt = {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interest: number;
  dueDate: string;
  priority: number;
};

type DebtPayment = {
  id: string;
  debtId: string;
  debtName: string;
  amount: number;
  date: string;
};

type Task = {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  linkedAmount?: number;
};

type Settings = {
  startingBalance: number;
  monthlyReserve: number;
};

type AppData = {
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  tasks: Task[];
  settings: Settings;
};

const STORAGE_KEY = "rebuildme-mymoney-v2";

const initialData: AppData = {
  transactions: [],
  debts: [],
  debtPayments: [],
  tasks: [],
  settings: { startingBalance: 0, monthlyReserve: 100 },
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthKey = (date: string) => date.slice(0, 7);
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

function normalizeData(value: unknown): AppData {
  const candidate = value as Partial<AppData> | null;
  return {
    transactions: Array.isArray(candidate?.transactions) ? candidate.transactions : [],
    debts: Array.isArray(candidate?.debts) ? candidate.debts : [],
    debtPayments: Array.isArray(candidate?.debtPayments) ? candidate.debtPayments : [],
    tasks: Array.isArray(candidate?.tasks) ? candidate.tasks : [],
    settings: {
      startingBalance:
        typeof candidate?.settings?.startingBalance === "number"
          ? candidate.settings.startingBalance
          : 0,
      monthlyReserve:
        typeof candidate?.settings?.monthlyReserve === "number"
          ? candidate.settings.monthlyReserve
          : 100,
    },
  };
}

export default function AppV3() {
  const [tab, setTab] = useState<MainTab>("today");
  const [budgetTab, setBudgetTab] = useState<BudgetTab>("overview");

  const [data, setData] = useState<AppData>(() => {
    try {
      const v2 = localStorage.getItem(STORAGE_KEY);
      if (v2) return normalizeData(JSON.parse(v2));
      const v1 = localStorage.getItem("rebuildme-mymoney-v1");
      if (v1) return normalizeData(JSON.parse(v1));
      return initialData;
    } catch {
      return initialData;
    }
  });

  const [transactionName, setTransactionName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [transactionCategory, setTransactionCategory] = useState("Muu");

  const [debtName, setDebtName] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtMinimum, setDebtMinimum] = useState("");
  const [debtInterest, setDebtInterest] = useState("");
  const [debtDueDate, setDebtDueDate] = useState(todayIso());
  const [debtPriority, setDebtPriority] = useState("1");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(todayIso());
  const [taskAmount, setTaskAmount] = useState("");

  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentMonth = todayIso().slice(0, 7);

  const monthTransactions = useMemo(
    () => data.transactions.filter((item) => monthKey(item.date) === currentMonth),
    [data.transactions, currentMonth],
  );

  const monthDebtPayments = useMemo(
    () => data.debtPayments.filter((item) => monthKey(item.date) === currentMonth),
    [data.debtPayments, currentMonth],
  );

  const monthlyIncome = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpenses = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const currentBalance = data.settings.startingBalance + monthlyIncome - monthlyExpenses;
  const monthlyDebtPlan = data.debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const monthlyDebtPaid = monthDebtPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const monthlyDebtRemaining = data.debts.reduce((sum, debt) => {
    const paid = monthDebtPayments
      .filter((payment) => payment.debtId === debt.id)
      .reduce((total, payment) => total + payment.amount, 0);
    return sum + Math.max(0, debt.minimumPayment - paid);
  }, 0);

  const safeToSpend =
    currentBalance - monthlyDebtRemaining - Math.max(0, data.settings.monthlyReserve);

  const totalDebt = data.debts.reduce((sum, debt) => sum + debt.balance, 0);

  const remainingDays = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, lastDay.getDate() - now.getDate() + 1);
  }, []);

  const dailyBudget = Math.max(0, safeToSpend / remainingDays);
  const sortedDebts = [...data.debts].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : b.interest - a.interest,
  );
  const upcomingTasks = [...data.tasks]
    .filter((task) => !task.completed)
    .sort((a, b) => a.date.localeCompare(b.date));

  const purchaseValue = Number(purchaseAmount) || 0;
  const affordability = useMemo(() => {
    if (purchaseValue <= 0) {
      return {
        status: "neutral",
        title: "Sisesta ostu hind",
        message: "Rakendus arvutab, kas ost mahub sinu turvalisse eelarvesse.",
      };
    }

    const afterPurchase = safeToSpend - purchaseValue;
    if (afterPurchase >= data.settings.monthlyReserve) {
      return {
        status: "good",
        title: "Jah, saad lubada",
        message: `Pärast ostu jääks vabaks ${euro(afterPurchase)}.`,
      };
    }
    if (afterPurchase >= 0) {
      return {
        status: "warning",
        title: "Saad lubada, aga eelarve läheb pingeliseks",
        message: `Pärast ostu jääks ainult ${euro(afterPurchase)}.`,
      };
    }
    return {
      status: "danger",
      title: "Praegu ei ole mõistlik",
      message: `Turvalisest eelarvest jääb puudu ${euro(Math.abs(afterPurchase))}.`,
    };
  }, [purchaseValue, safeToSpend, data.settings.monthlyReserve]);

  function addTransaction(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(transactionAmount);
    if (!transactionName.trim() || amount <= 0) return;

    setData((previous) => ({
      ...previous,
      transactions: [
        {
          id: createId(),
          name: transactionName.trim(),
          amount,
          type: transactionType,
          date: transactionDate,
          category: transactionCategory,
        },
        ...previous.transactions,
      ],
    }));

    setTransactionName("");
    setTransactionAmount("");
    setBudgetTab("overview");
  }

  function deleteTransaction(id: string) {
    setData((previous) => ({
      ...previous,
      transactions: previous.transactions.filter((item) => item.id !== id),
    }));
  }

  function addDebt(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const balance = Number(debtBalance);
    if (!debtName.trim() || balance <= 0) return;

    setData((previous) => ({
      ...previous,
      debts: [
        ...previous.debts,
        {
          id: createId(),
          name: debtName.trim(),
          balance,
          minimumPayment: Math.max(0, Number(debtMinimum) || 0),
          interest: Math.max(0, Number(debtInterest) || 0),
          dueDate: debtDueDate,
          priority: Math.max(1, Number(debtPriority) || 1),
        },
      ],
    }));

    setDebtName("");
    setDebtBalance("");
    setDebtMinimum("");
    setDebtInterest("");
    setDebtPriority("1");
  }

  function registerDebtPayment(debt: Debt) {
    const text = prompt(`Kui palju maksid võlale "${debt.name}"?`, String(debt.minimumPayment || ""));
    if (text === null) return;
    const amount = Number(text.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const paidAmount = Math.min(amount, debt.balance);
    const date = todayIso();

    setData((previous) => ({
      ...previous,
      debts: previous.debts
        .map((item) =>
          item.id === debt.id
            ? { ...item, balance: Math.max(0, item.balance - paidAmount) }
            : item,
        )
        .filter((item) => item.balance > 0),
      debtPayments: [
        { id: createId(), debtId: debt.id, debtName: debt.name, amount: paidAmount, date },
        ...previous.debtPayments,
      ],
      transactions: [
        {
          id: createId(),
          name: `Võlamakse: ${debt.name}`,
          amount: paidAmount,
          type: "expense",
          date,
          category: "Võlamakse",
        },
        ...previous.transactions,
      ],
    }));
  }

  function addTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;

    setData((previous) => ({
      ...previous,
      tasks: [
        ...previous.tasks,
        {
          id: createId(),
          title: taskTitle.trim(),
          date: taskDate,
          completed: false,
          linkedAmount: Number(taskAmount) || undefined,
        },
      ],
    }));

    setTaskTitle("");
    setTaskAmount("");
  }

  function toggleTask(id: string) {
    setData((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    }));
  }

  function updateSettings(field: keyof Settings, value: string) {
    setData((previous) => ({
      ...previous,
      settings: { ...previous.settings, [field]: Number(value) || 0 },
    }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mymoney-backup-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    if (window.confirm("Kas kustutada kõik MyMoney andmed? Seda ei saa tagasi võtta.")) {
      setData(initialData);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RebuildMe</p>
          <h1>MyMoney</h1>
        </div>
        <button className="secondary-button" onClick={exportBackup}>Varukoopia</button>
      </header>

      <nav className="navigation">
        <NavButton label="Täna" active={tab === "today"} onClick={() => setTab("today")} />
        <NavButton label="Eelarve" active={tab === "budget"} onClick={() => setTab("budget")} />
        <NavButton label="Võlad" active={tab === "debts"} onClick={() => setTab("debts")} />
        <NavButton label="Todo" active={tab === "tasks"} onClick={() => setTab("tasks")} />
        <NavButton label="Kalender" active={tab === "calendar"} onClick={() => setTab("calendar")} />
      </nav>

      <main>
        {tab === "today" && (
          <>
            <SummaryGrid
              currentBalance={currentBalance}
              safeToSpend={safeToSpend}
              dailyBudget={dailyBudget}
              remainingDays={remainingDays}
              totalDebt={totalDebt}
              debtCount={data.debts.length}
            />

            <section className="payment-progress card">
              <div>
                <p className="eyebrow">Selle kuu võlaplaan</p>
                <h2>{euro(monthlyDebtPaid)} / {euro(monthlyDebtPlan)} makstud</h2>
              </div>
              <ProgressBar value={monthlyDebtPlan > 0 ? monthlyDebtPaid / monthlyDebtPlan : 0} />
              <span>Veel maksta: {euro(monthlyDebtRemaining)}</span>
            </section>

            <section className="two-column">
              <div className="card">
                <SectionTitle eyebrow="Kontroll" title="Kas saan lubada?" />
                <div className="form-grid">
                  <label>Ostu nimetus
                    <input value={purchaseName} onChange={(e) => setPurchaseName(e.target.value)} placeholder="Näiteks telefon või toit" />
                  </label>
                  <label>Hind
                    <input type="number" min="0" step="0.01" value={purchaseAmount} onChange={(e) => setPurchaseAmount(e.target.value)} placeholder="0.00" />
                  </label>
                </div>
                <div className={`affordability ${affordability.status}`}>
                  <strong>{affordability.title}</strong>
                  <span>{affordability.message}</span>
                </div>
              </div>

              <div className="card">
                <SectionTitle eyebrow="Järgmised tegevused" title="Todo" />
                {upcomingTasks.length === 0 ? <EmptyState text="Ühtegi aktiivset ülesannet pole." /> : (
                  <div className="list">
                    {upcomingTasks.slice(0, 5).map((task) => (
                      <div className="list-row" key={task.id}>
                        <button className="check-button" onClick={() => toggleTask(task.id)}>○</button>
                        <div className="list-content">
                          <strong>{task.title}</strong>
                          <span>{task.date}{task.linkedAmount ? ` · ${euro(task.linkedAmount)}` : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {tab === "budget" && (
          <>
            <nav className="sub-navigation" aria-label="Eelarve vaated">
              <SubNavButton label="Ülevaade" active={budgetTab === "overview"} onClick={() => setBudgetTab("overview")} />
              <SubNavButton label="Lisa tulu/kulu" active={budgetTab === "entry"} onClick={() => setBudgetTab("entry")} />
              <SubNavButton label="Seaded" active={budgetTab === "settings"} onClick={() => setBudgetTab("settings")} />
            </nav>

            {budgetTab === "overview" && (
              <>
                <section className="summary-grid">
                  <SummaryCard label="Sissetulekud" value={euro(monthlyIncome)} detail="Sellel kuul" />
                  <SummaryCard label="Kulud" value={euro(monthlyExpenses)} detail="Sellel kuul" />
                  <SummaryCard label="Võlamaksed" value={euro(monthlyDebtPaid)} detail={`Plaan ${euro(monthlyDebtPlan)}`} />
                  <SummaryCard label="Prognoos" value={euro(safeToSpend)} detail="Pärast reservi ja makseid" />
                </section>

                <section className="card">
                  <SectionTitle eyebrow="Ajalugu" title="Tulud ja kulud" />
                  {data.transactions.length === 0 ? <EmptyState text="Ühtegi tulu ega kulu pole veel lisatud." /> : (
                    <div className="transaction-list">
                      {data.transactions.map((item) => (
                        <article className="transaction-row" key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.date} · {item.category}</span>
                          </div>
                          <div className="transaction-value">
                            <strong className={item.type === "income" ? "positive-text" : "negative-text"}>
                              {item.type === "income" ? "+" : "−"}{euro(item.amount)}
                            </strong>
                            <button className="danger-link" onClick={() => deleteTransaction(item.id)}>Kustuta</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {budgetTab === "entry" && (
              <section className="card compact-form-card">
                <SectionTitle eyebrow="Uus kirje" title={transactionType === "income" ? "Lisa tulu" : "Lisa kulu"} />
                <div className="type-switch">
                  <button className={transactionType === "income" ? "active" : ""} onClick={() => { setTransactionType("income"); setTransactionCategory("Sissetulek"); }}>Tulu</button>
                  <button className={transactionType === "expense" ? "active" : ""} onClick={() => setTransactionType("expense")}>Kulu</button>
                </div>

                <form onSubmit={addTransaction}>
                  <div className="form-grid">
                    <label>Nimetus
                      <input required value={transactionName} onChange={(e) => setTransactionName(e.target.value)} placeholder={transactionType === "income" ? "Näiteks palk" : "Näiteks toit või üür"} />
                    </label>
                    <label>Summa
                      <input required type="number" min="0.01" step="0.01" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} />
                    </label>
                    <label>Kategooria
                      <select value={transactionCategory} onChange={(e) => setTransactionCategory(e.target.value)}>
                        <option>Elamine</option><option>Toit</option><option>Transport</option>
                        <option>Lapsed</option><option>Võlamakse</option><option>Tervis</option>
                        <option>Töö</option><option>Sissetulek</option><option>Muu</option>
                      </select>
                    </label>
                    <label>Kuupäev
                      <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
                    </label>
                  </div>
                  <button className="primary-button" type="submit">
                    {transactionType === "income" ? "Lisa tulu" : "Lisa kulu"}
                  </button>
                </form>
              </section>
            )}

            {budgetTab === "settings" && (
              <section className="card compact-form-card">
                <SectionTitle eyebrow="Eelarve seaded" title="Kuu algandmed" />
                <div className="form-grid">
                  <label>Algjääk
                    <input type="number" step="0.01" value={data.settings.startingBalance} onChange={(e) => updateSettings("startingBalance", e.target.value)} />
                    <small>Raha, mis oli kuu alguses kasutada.</small>
                  </label>
                  <label>Turvareserv
                    <input type="number" min="0" step="0.01" value={data.settings.monthlyReserve} onChange={(e) => updateSettings("monthlyReserve", e.target.value)} />
                    <small>Summa, mida rakendus ei arvesta vabalt kasutatavaks.</small>
                  </label>
                </div>
              </section>
            )}
          </>
        )}

        {tab === "debts" && (
          <>
            <section className="summary-grid">
              <SummaryCard label="Võlgu kokku" value={euro(totalDebt)} detail={`${data.debts.length} aktiivset võlga`} />
              <SummaryCard label="Kuu plaan" value={euro(monthlyDebtPlan)} detail="Minimaalsed maksed" />
              <SummaryCard label="Makstud" value={euro(monthlyDebtPaid)} detail={`Veel ${euro(monthlyDebtRemaining)}`} />
              <SummaryCard label="Kõrgeim intress" value={`${Math.max(0, ...data.debts.map((d) => d.interest))}%`} detail="Kõige kallim võlg" />
            </section>

            <section className="card">
              <SectionTitle eyebrow="Uus võlg" title="Lisa võlatabelisse" />
              <form onSubmit={addDebt}>
                <div className="form-grid wide">
                  <label>Võlausaldaja<input required value={debtName} onChange={(e) => setDebtName(e.target.value)} /></label>
                  <label>Võlajääk<input required type="number" min="0.01" step="0.01" value={debtBalance} onChange={(e) => setDebtBalance(e.target.value)} /></label>
                  <label>Minimaalne kuumakse<input type="number" min="0" step="0.01" value={debtMinimum} onChange={(e) => setDebtMinimum(e.target.value)} /></label>
                  <label>Intress %<input type="number" min="0" step="0.01" value={debtInterest} onChange={(e) => setDebtInterest(e.target.value)} /></label>
                  <label>Järgmine tähtaeg<input type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} /></label>
                  <label>Prioriteet<input type="number" min="1" step="1" value={debtPriority} onChange={(e) => setDebtPriority(e.target.value)} /></label>
                </div>
                <button className="primary-button" type="submit">Lisa võlg</button>
              </form>
            </section>

            <section className="card">
              <SectionTitle eyebrow="Makseplaan" title="Võlad prioriteedi järgi" />
              {sortedDebts.length === 0 ? <EmptyState text="Võlatabel on tühi." /> : (
                <div className="debt-list">
                  {sortedDebts.map((debt) => {
                    const paid = monthDebtPayments.filter((p) => p.debtId === debt.id).reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, debt.minimumPayment - paid);
                    return (
                      <article className="debt-card" key={debt.id}>
                        <div className="debt-header">
                          <div><span className="priority-badge">Prioriteet {debt.priority}</span><h3>{debt.name}</h3></div>
                          <strong>{euro(debt.balance)}</strong>
                        </div>
                        <div className="debt-details">
                          <span>Kuu plaan: {euro(debt.minimumPayment)}</span><span>Makstud: {euro(paid)}</span>
                          <span>Veel maksta: {euro(remaining)}</span><span>Intress: {debt.interest}%</span>
                          <span>Tähtaeg: {debt.dueDate}</span>
                        </div>
                        <ProgressBar value={debt.minimumPayment > 0 ? paid / debt.minimumPayment : 0} />
                        <div className="button-row">
                          <button className="primary-button small" onClick={() => registerDebtPayment(debt)}>Märgi makse</button>
                          <button className="danger-link" onClick={() => setData((p) => ({ ...p, debts: p.debts.filter((d) => d.id !== debt.id) }))}>Kustuta</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "tasks" && (
          <>
            <section className="card">
              <SectionTitle eyebrow="Uus ülesanne" title="Lisa Todo" />
              <form onSubmit={addTask}>
                <div className="form-grid">
                  <label>Ülesanne<input required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></label>
                  <label>Kuupäev<input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} /></label>
                  <label>Seotud summa<input type="number" min="0" step="0.01" value={taskAmount} onChange={(e) => setTaskAmount(e.target.value)} /></label>
                </div>
                <button className="primary-button" type="submit">Lisa ülesanne</button>
              </form>
            </section>

            <section className="card">
              <SectionTitle eyebrow="Kõik tegevused" title="Todo nimekiri" />
              {data.tasks.length === 0 ? <EmptyState text="Todo nimekiri on tühi." /> : (
                <div className="list">
                  {[...data.tasks].sort((a, b) => a.date.localeCompare(b.date)).map((task) => (
                    <div className={`list-row ${task.completed ? "completed" : ""}`} key={task.id}>
                      <button className="check-button" onClick={() => toggleTask(task.id)}>{task.completed ? "✓" : "○"}</button>
                      <div className="list-content"><strong>{task.title}</strong><span>{task.date}{task.linkedAmount ? ` · ${euro(task.linkedAmount)}` : ""}</span></div>
                      <button className="danger-link" onClick={() => setData((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== task.id) }))}>Kustuta</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "calendar" && (
          <section className="card">
            <SectionTitle eyebrow="Ajajoon" title="Kalender ja tähtajad" />
            <CalendarTimeline debts={data.debts} debtPayments={data.debtPayments} tasks={data.tasks} transactions={data.transactions} />
          </section>
        )}

        <section className="footer-actions">
          <button className="danger-link" onClick={resetAll}>Kustuta kõik andmed</button>
          <span>Andmed salvestatakse sellesse seadmesse.</span>
        </section>
      </main>
    </div>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{label}</button>;
}

function SubNavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>;
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function SummaryGrid(props: { currentBalance: number; safeToSpend: number; dailyBudget: number; remainingDays: number; totalDebt: number; debtCount: number }) {
  return (
    <section className="summary-grid">
      <SummaryCard label="Praegune saldo" value={euro(props.currentBalance)} detail="Algjääk + tulud − kulud" />
      <SummaryCard label="Turvaliselt kasutada" value={euro(Math.max(0, props.safeToSpend))} detail="Pärast reservi ja makseid" />
      <SummaryCard label="Päevane eelarve" value={euro(props.dailyBudget)} detail={`${props.remainingDays} päeva kuu lõpuni`} />
      <SummaryCard label="Võlgu kokku" value={euro(props.totalDebt)} detail={`${props.debtCount} aktiivset võlga`} />
    </section>
  );
}

function ProgressBar({ value }: { value: number }) {
  const percentage = Math.max(0, Math.min(100, value * 100));
  return <div className="progress-track" aria-label={`${Math.round(percentage)}%`}><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function CalendarTimeline({ debts, debtPayments, tasks, transactions }: { debts: Debt[]; debtPayments: DebtPayment[]; tasks: Task[]; transactions: Transaction[] }) {
  const entries = [
    ...debts.map((debt) => ({ id: `debt-${debt.id}`, date: debt.dueDate, title: `Võlamakse tähtaeg: ${debt.name}`, description: euro(debt.minimumPayment), type: "Võlg" })),
    ...debtPayments.map((p) => ({ id: `payment-${p.id}`, date: p.date, title: `Makstud: ${p.debtName}`, description: euro(p.amount), type: "Makse" })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, date: task.date, title: task.title, description: task.linkedAmount ? euro(task.linkedAmount) : task.completed ? "Tehtud" : "Todo", type: "Todo" })),
    ...transactions.map((t) => ({ id: `transaction-${t.id}`, date: t.date, title: t.name, description: `${t.type === "income" ? "+" : "−"}${euro(t.amount)}`, type: t.type === "income" ? "Tulu" : "Kulu" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length === 0) return <EmptyState text="Kalendris pole veel ühtegi kirjet." />;

  return <div className="timeline">{entries.map((entry) => (
    <article className="timeline-row" key={entry.id}>
      <div className="timeline-date">{entry.date}</div><div className="timeline-marker" />
      <div className="timeline-content"><span className="timeline-type">{entry.type}</span><strong>{entry.title}</strong><small>{entry.description}</small></div>
    </article>
  ))}</div>;
}