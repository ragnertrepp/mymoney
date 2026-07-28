import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import "./App.css";

type TransactionType = "income" | "expense";
type Tab = "today" | "budget" | "debts" | "tasks" | "calendar";

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
  settings: {
    startingBalance: 0,
    monthlyReserve: 100,
  },
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => todayIso().slice(0, 7);
const monthKey = (date: string) => date.slice(0, 7);

const createId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency: "EUR",
  }).format(value);

function normalizeData(value: unknown): AppData {
  const candidate = value as Partial<AppData> | null;

  return {
    transactions: Array.isArray(candidate?.transactions)
      ? candidate.transactions
      : [],
    debts: Array.isArray(candidate?.debts) ? candidate.debts : [],
    debtPayments: Array.isArray(candidate?.debtPayments)
      ? candidate.debtPayments
      : [],
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

function App() {
  const [tab, setTab] = useState<Tab>("today");

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
  const [transactionType, setTransactionType] =
    useState<TransactionType>("expense");
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

  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseName, setPurchaseName] = useState("");

  const currentMonth = currentMonthKey();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const monthTransactions = useMemo(
    () =>
      data.transactions.filter(
        (transaction) => monthKey(transaction.date) === currentMonth,
      ),
    [data.transactions, currentMonth],
  );

  const monthDebtPayments = useMemo(
    () =>
      data.debtPayments.filter(
        (payment) => monthKey(payment.date) === currentMonth,
      ),
    [data.debtPayments, currentMonth],
  );

  const monthlyIncome = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0),
    [monthTransactions],
  );

  const monthlyExpenses = useMemo(
    () =>
      monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0),
    [monthTransactions],
  );

  const currentBalance =
    data.settings.startingBalance + monthlyIncome - monthlyExpenses;

  const monthlyDebtPlan = data.debts.reduce(
    (sum, debt) => sum + debt.minimumPayment,
    0,
  );

  const monthlyDebtPaid = monthDebtPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const monthlyDebtRemaining = data.debts.reduce((sum, debt) => {
    const paid = monthDebtPayments
      .filter((payment) => payment.debtId === debt.id)
      .reduce((total, payment) => total + payment.amount, 0);

    return sum + Math.max(0, debt.minimumPayment - paid);
  }, 0);

  const safeToSpend =
    currentBalance -
    monthlyDebtRemaining -
    Math.max(0, data.settings.monthlyReserve);

  const totalDebt = data.debts.reduce(
    (sum, debt) => sum + debt.balance,
    0,
  );

  const remainingDays = useMemo(() => {
    const now = new Date();
    const finalDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, finalDay.getDate() - now.getDate() + 1);
  }, []);

  const dailyBudget = Math.max(0, safeToSpend / remainingDays);

  const upcomingTasks = [...data.tasks]
    .filter((task) => !task.completed)
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedDebts = [...data.debts].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.interest - a.interest;
  });

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
      message: `Turvalisest eelarvest jääb puudu ${euro(
        Math.abs(afterPurchase),
      )}.`,
    };
  }, [purchaseValue, safeToSpend, data.settings.monthlyReserve]);

  function addTransaction(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(transactionAmount);

    if (!transactionName.trim() || amount <= 0) return;

    const transaction: Transaction = {
      id: createId(),
      name: transactionName.trim(),
      amount,
      type: transactionType,
      date: transactionDate,
      category: transactionCategory,
    };

    setData((previous) => ({
      ...previous,
      transactions: [transaction, ...previous.transactions],
    }));

    setTransactionName("");
    setTransactionAmount("");
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
    const minimumPayment = Number(debtMinimum);
    const interest = Number(debtInterest);
    const priority = Number(debtPriority);

    if (!debtName.trim() || balance <= 0) return;

    const debt: Debt = {
      id: createId(),
      name: debtName.trim(),
      balance,
      minimumPayment: Math.max(0, minimumPayment),
      interest: Math.max(0, interest),
      dueDate: debtDueDate,
      priority: Math.max(1, priority),
    };

    setData((previous) => ({
      ...previous,
      debts: [...previous.debts, debt],
    }));

    setDebtName("");
    setDebtBalance("");
    setDebtMinimum("");
    setDebtInterest("");
    setDebtPriority("1");
  }

  function registerDebtPayment(debt: Debt) {
    const text = prompt(
      `Kui palju maksid võlale "${debt.name}"?`,
      String(debt.minimumPayment || ""),
    );

    if (text === null) return;

    const payment = Number(text.replace(",", "."));

    if (!Number.isFinite(payment) || payment <= 0) return;

    const paidAmount = Math.min(payment, debt.balance);
    const paymentDate = todayIso();

    const paymentRecord: DebtPayment = {
      id: createId(),
      debtId: debt.id,
      debtName: debt.name,
      amount: paidAmount,
      date: paymentDate,
    };

    setData((previous) => ({
      ...previous,
      debts: previous.debts
        .map((item) =>
          item.id === debt.id
            ? { ...item, balance: Math.max(0, item.balance - paidAmount) }
            : item,
        )
        .filter((item) => item.balance > 0),
      debtPayments: [paymentRecord, ...previous.debtPayments],
      transactions: [
        {
          id: createId(),
          name: `Võlamakse: ${debt.name}`,
          amount: paidAmount,
          type: "expense",
          date: paymentDate,
          category: "Võlamakse",
        },
        ...previous.transactions,
      ],
    }));
  }

  function deleteDebt(id: string) {
    setData((previous) => ({
      ...previous,
      debts: previous.debts.filter((item) => item.id !== id),
    }));
  }

  function addTask(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskTitle.trim()) return;

    const task: Task = {
      id: createId(),
      title: taskTitle.trim(),
      date: taskDate,
      completed: false,
      linkedAmount: Number(taskAmount) || undefined,
    };

    setData((previous) => ({
      ...previous,
      tasks: [...previous.tasks, task],
    }));

    setTaskTitle("");
    setTaskAmount("");
  }

  function toggleTask(id: string) {
    setData((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task,
      ),
    }));
  }

  function deleteTask(id: string) {
    setData((previous) => ({
      ...previous,
      tasks: previous.tasks.filter((task) => task.id !== id),
    }));
  }

  function updateSettings(field: keyof Settings, value: string) {
    setData((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        [field]: Number(value) || 0,
      },
    }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `mymoney-backup-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    const confirmed = window.confirm(
      "Kas kustutada kõik MyMoney andmed? Seda ei saa tagasi võtta.",
    );

    if (confirmed) setData(initialData);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RebuildMe</p>
          <h1>MyMoney</h1>
        </div>

        <button className="secondary-button" onClick={exportBackup}>
          Varukoopia
        </button>
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
            <section className="summary-grid">
              <SummaryCard label="Praegune saldo" value={euro(currentBalance)} detail="Algjääk + tulud − kulud" />
              <SummaryCard label="Turvaliselt kasutada" value={euro(Math.max(0, safeToSpend))} detail="Pärast reservi ja maksmata võlamakseid" />
              <SummaryCard label="Päevane eelarve" value={euro(dailyBudget)} detail={`${remainingDays} päeva kuu lõpuni`} />
              <SummaryCard label="Võlgu kokku" value={euro(totalDebt)} detail={`${data.debts.length} aktiivset võlga`} />
            </section>

            <section className="payment-progress card">
              <div>
                <p className="eyebrow">Selle kuu võlaplaan</p>
                <h2>{euro(monthlyDebtPaid)} / {euro(monthlyDebtPlan)} makstud</h2>
              </div>
              <ProgressBar
                value={monthlyDebtPlan > 0 ? monthlyDebtPaid / monthlyDebtPlan : 0}
              />
              <span>Veel maksta: {euro(monthlyDebtRemaining)}</span>
            </section>

            <section className="two-column">
              <div className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Kontroll</p>
                    <h2>Kas saan lubada?</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    Ostu nimetus
                    <input
                      value={purchaseName}
                      onChange={(event) => setPurchaseName(event.target.value)}
                      placeholder="Näiteks telefon või toit"
                    />
                  </label>

                  <label>
                    Hind
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchaseAmount}
                      onChange={(event) => setPurchaseAmount(event.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <div className={`affordability ${affordability.status}`}>
                  <strong>{affordability.title}</strong>
                  <span>{affordability.message}</span>
                </div>
              </div>

              <div className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Järgmised tegevused</p>
                    <h2>Todo</h2>
                  </div>
                </div>

                {upcomingTasks.length === 0 ? (
                  <EmptyState text="Ühtegi aktiivset ülesannet pole." />
                ) : (
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

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Maksejärjekord</p>
                  <h2>Selle kuu võlamaksed</h2>
                </div>
              </div>

              {sortedDebts.length === 0 ? (
                <EmptyState text="Lisa võlad, et näha maksejärjekorda." />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Prioriteet</th>
                        <th>Võlg</th>
                        <th>Jääk</th>
                        <th>Plaan</th>
                        <th>Makstud</th>
                        <th>Puudu</th>
                        <th>Tähtaeg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDebts.map((debt) => {
                        const paid = monthDebtPayments
                          .filter((payment) => payment.debtId === debt.id)
                          .reduce((sum, payment) => sum + payment.amount, 0);
                        const remaining = Math.max(0, debt.minimumPayment - paid);

                        return (
                          <tr key={debt.id}>
                            <td>#{debt.priority}</td>
                            <td>{debt.name}</td>
                            <td>{euro(debt.balance)}</td>
                            <td>{euro(debt.minimumPayment)}</td>
                            <td className="positive-text">{euro(paid)}</td>
                            <td className={remaining > 0 ? "negative-text" : "positive-text"}>
                              {remaining > 0 ? euro(remaining) : "Makstud"}
                            </td>
                            <td>{debt.dueDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "budget" && (
          <>
            <section className="summary-grid">
              <SummaryCard label="Sissetulekud" value={euro(monthlyIncome)} detail="Sellel kuul" />
              <SummaryCard label="Kulud" value={euro(monthlyExpenses)} detail="Sellel kuul" />
              <SummaryCard label="Võlamaksed tehtud" value={euro(monthlyDebtPaid)} detail={`Plaan ${euro(monthlyDebtPlan)}`} />
              <SummaryCard label="Prognoos" value={euro(safeToSpend)} detail="Pärast reservi ja maksmata võlamakseid" />
            </section>

            <section className="two-column">
              <div className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Seaded</p>
                    <h2>Kuu algandmed</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    Algjääk
                    <input
                      type="number"
                      step="0.01"
                      value={data.settings.startingBalance}
                      onChange={(event) => updateSettings("startingBalance", event.target.value)}
                    />
                  </label>

                  <label>
                    Turvareserv
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.settings.monthlyReserve}
                      onChange={(event) => updateSettings("monthlyReserve", event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Uus kirje</p>
                    <h2>Lisa tulu või kulu</h2>
                  </div>
                </div>

                <form onSubmit={addTransaction}>
                  <div className="form-grid">
                    <label>
                      Nimetus
                      <input required value={transactionName} onChange={(event) => setTransactionName(event.target.value)} />
                    </label>

                    <label>
                      Summa
                      <input required type="number" min="0.01" step="0.01" value={transactionAmount} onChange={(event) => setTransactionAmount(event.target.value)} />
                    </label>

                    <label>
                      Tüüp
                      <select value={transactionType} onChange={(event) => setTransactionType(event.target.value as TransactionType)}>
                        <option value="expense">Kulu</option>
                        <option value="income">Tulu</option>
                      </select>
                    </label>

                    <label>
                      Kategooria
                      <select value={transactionCategory} onChange={(event) => setTransactionCategory(event.target.value)}>
                        <option>Elamine</option>
                        <option>Toit</option>
                        <option>Transport</option>
                        <option>Lapsed</option>
                        <option>Võlamakse</option>
                        <option>Tervis</option>
                        <option>Töö</option>
                        <option>Sissetulek</option>
                        <option>Muu</option>
                      </select>
                    </label>

                    <label>
                      Kuupäev
                      <input type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} />
                    </label>
                  </div>

                  <button className="primary-button" type="submit">Lisa kirje</button>
                </form>
              </div>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Ajalugu</p>
                  <h2>Tulud ja kulud</h2>
                </div>
              </div>

              {data.transactions.length === 0 ? (
                <EmptyState text="Ühtegi tulu ega kulu pole veel lisatud." />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Kuupäev</th>
                        <th>Nimetus</th>
                        <th>Kategooria</th>
                        <th>Tüüp</th>
                        <th>Summa</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.date}</td>
                          <td>{item.name}</td>
                          <td>{item.category}</td>
                          <td>{item.type === "income" ? "Tulu" : "Kulu"}</td>
                          <td className={item.type === "income" ? "positive-text" : "negative-text"}>
                            {item.type === "income" ? "+" : "−"}{euro(item.amount)}
                          </td>
                          <td>
                            <button className="danger-link" onClick={() => deleteTransaction(item.id)}>Kustuta</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "debts" && (
          <>
            <section className="summary-grid">
              <SummaryCard label="Võlgu kokku" value={euro(totalDebt)} detail={`${data.debts.length} aktiivset võlga`} />
              <SummaryCard label="Kuu plaan" value={euro(monthlyDebtPlan)} detail="Minimaalsed maksed" />
              <SummaryCard label="Kuu jooksul makstud" value={euro(monthlyDebtPaid)} detail={`Veel ${euro(monthlyDebtRemaining)}`} />
              <SummaryCard label="Kõrgeim intress" value={`${Math.max(0, ...data.debts.map((item) => item.interest))}%`} detail="Kõige kallim aktiivne võlg" />
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Uus võlg</p>
                  <h2>Lisa võlatabelisse</h2>
                </div>
              </div>

              <form onSubmit={addDebt}>
                <div className="form-grid wide">
                  <label>
                    Võlausaldaja
                    <input required value={debtName} onChange={(event) => setDebtName(event.target.value)} />
                  </label>

                  <label>
                    Võlajääk
                    <input required type="number" min="0.01" step="0.01" value={debtBalance} onChange={(event) => setDebtBalance(event.target.value)} />
                  </label>

                  <label>
                    Minimaalne kuumakse
                    <input type="number" min="0" step="0.01" value={debtMinimum} onChange={(event) => setDebtMinimum(event.target.value)} />
                  </label>

                  <label>
                    Intress %
                    <input type="number" min="0" step="0.01" value={debtInterest} onChange={(event) => setDebtInterest(event.target.value)} />
                  </label>

                  <label>
                    Järgmine tähtaeg
                    <input type="date" value={debtDueDate} onChange={(event) => setDebtDueDate(event.target.value)} />
                  </label>

                  <label>
                    Prioriteet
                    <input type="number" min="1" step="1" value={debtPriority} onChange={(event) => setDebtPriority(event.target.value)} />
                  </label>
                </div>

                <button className="primary-button" type="submit">Lisa võlg</button>
              </form>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Makseplaan</p>
                  <h2>Võlad prioriteedi järgi</h2>
                </div>
              </div>

              {sortedDebts.length === 0 ? (
                <EmptyState text="Võlatabel on tühi." />
              ) : (
                <div className="debt-list">
                  {sortedDebts.map((debt) => {
                    const paidThisMonth = monthDebtPayments
                      .filter((payment) => payment.debtId === debt.id)
                      .reduce((sum, payment) => sum + payment.amount, 0);
                    const remainingThisMonth = Math.max(0, debt.minimumPayment - paidThisMonth);
                    const progress = debt.minimumPayment > 0 ? paidThisMonth / debt.minimumPayment : 0;

                    return (
                      <article className="debt-card" key={debt.id}>
                        <div className="debt-header">
                          <div>
                            <span className="priority-badge">Prioriteet {debt.priority}</span>
                            <h3>{debt.name}</h3>
                          </div>
                          <strong>{euro(debt.balance)}</strong>
                        </div>

                        <div className="debt-details">
                          <span>Kuu plaan: {euro(debt.minimumPayment)}</span>
                          <span>Makstud: {euro(paidThisMonth)}</span>
                          <span>Veel maksta: {euro(remainingThisMonth)}</span>
                          <span>Intress: {debt.interest}%</span>
                          <span>Tähtaeg: {debt.dueDate}</span>
                        </div>

                        <ProgressBar value={progress} />

                        <div className="button-row">
                          <button className="primary-button small" onClick={() => registerDebtPayment(debt)}>
                            Märgi makse
                          </button>
                          <button className="danger-link" onClick={() => deleteDebt(debt.id)}>Kustuta</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Ajalugu</p>
                  <h2>Võlamaksed</h2>
                </div>
              </div>

              {data.debtPayments.length === 0 ? (
                <EmptyState text="Ühtegi võlamakset pole veel registreeritud." />
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Kuupäev</th>
                        <th>Võlg</th>
                        <th>Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.debtPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.date}</td>
                          <td>{payment.debtName}</td>
                          <td className="negative-text">{euro(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "tasks" && (
          <>
            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Uus ülesanne</p>
                  <h2>Lisa Todo</h2>
                </div>
              </div>

              <form onSubmit={addTask}>
                <div className="form-grid">
                  <label>
                    Ülesanne
                    <input required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
                  </label>

                  <label>
                    Kuupäev
                    <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
                  </label>

                  <label>
                    Seotud summa
                    <input type="number" min="0" step="0.01" value={taskAmount} onChange={(event) => setTaskAmount(event.target.value)} />
                  </label>
                </div>

                <button className="primary-button" type="submit">Lisa ülesanne</button>
              </form>
            </section>

            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Kõik tegevused</p>
                  <h2>Todo nimekiri</h2>
                </div>
              </div>

              {data.tasks.length === 0 ? (
                <EmptyState text="Todo nimekiri on tühi." />
              ) : (
                <div className="list">
                  {[...data.tasks]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((task) => (
                      <div className={`list-row ${task.completed ? "completed" : ""}`} key={task.id}>
                        <button className="check-button" onClick={() => toggleTask(task.id)}>
                          {task.completed ? "✓" : "○"}
                        </button>
                        <div className="list-content">
                          <strong>{task.title}</strong>
                          <span>{task.date}{task.linkedAmount ? ` · ${euro(task.linkedAmount)}` : ""}</span>
                        </div>
                        <button className="danger-link" onClick={() => deleteTask(task.id)}>Kustuta</button>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "calendar" && (
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ajajoon</p>
                <h2>Kalender ja tähtajad</h2>
              </div>
            </div>

            <CalendarTimeline
              debts={data.debts}
              debtPayments={data.debtPayments}
              tasks={data.tasks}
              transactions={data.transactions}
            />
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

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  const percentage = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="progress-track" aria-label={`${Math.round(percentage)}%`}>
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function CalendarTimeline({
  debts,
  debtPayments,
  tasks,
  transactions,
}: {
  debts: Debt[];
  debtPayments: DebtPayment[];
  tasks: Task[];
  transactions: Transaction[];
}) {
  const entries = [
    ...debts.map((debt) => ({
      id: `debt-${debt.id}`,
      date: debt.dueDate,
      title: `Võlamakse tähtaeg: ${debt.name}`,
      description: euro(debt.minimumPayment),
      type: "Võlg",
    })),
    ...debtPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.date,
      title: `Makstud: ${payment.debtName}`,
      description: euro(payment.amount),
      type: "Makse",
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      date: task.date,
      title: task.title,
      description: task.linkedAmount
        ? euro(task.linkedAmount)
        : task.completed
          ? "Tehtud"
          : "Todo",
      type: "Todo",
    })),
    ...transactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      date: transaction.date,
      title: transaction.name,
      description: `${transaction.type === "income" ? "+" : "−"}${euro(transaction.amount)}`,
      type: transaction.type === "income" ? "Tulu" : "Kulu",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length === 0) {
    return <EmptyState text="Kalendris pole veel ühtegi kirjet." />;
  }

  return (
    <div className="timeline">
      {entries.map((entry) => (
        <article className="timeline-row" key={entry.id}>
          <div className="timeline-date">{entry.date}</div>
          <div className="timeline-marker" />
          <div className="timeline-content">
            <span className="timeline-type">{entry.type}</span>
            <strong>{entry.title}</strong>
            <small>{entry.description}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

export default App;