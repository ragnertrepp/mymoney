import { useMemo, useState } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category: string;
};

type DebtPayment = {
  id: string;
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

type AppData = {
  transactions?: Transaction[];
  debtPayments?: DebtPayment[];
  tasks?: Task[];
  settings?: { startingBalance?: number; monthlyReserve?: number };
};

const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

function readData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("et-EE", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export default function MonthlyView() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const data = useMemo(() => readData(), [open]);

  const transactions = (Array.isArray(data.transactions) ? data.transactions : [])
    .filter((item) => item.date?.slice(0, 7) === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date));

  const debtPayments = (Array.isArray(data.debtPayments) ? data.debtPayments : [])
    .filter((item) => item.date?.slice(0, 7) === selectedMonth);

  const tasks = (Array.isArray(data.tasks) ? data.tasks : [])
    .filter((item) => item.date?.slice(0, 7) === selectedMonth)
    .sort((a, b) => a.date.localeCompare(b.date));

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const debtPaid = debtPayments.reduce((sum, item) => sum + item.amount, 0);
  const result = income - expenses;

  return (
    <>
      <button className="secondary-button monthly-open" onClick={() => setOpen(true)}>
        Kuud
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="monthly-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Ajalugu</p>
                <h2>Kuude ülevaade</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="month-switcher">
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>←</button>
              <div>
                <strong>{monthLabel(selectedMonth)}</strong>
                {selectedMonth !== currentMonthKey() && (
                  <button className="month-current-link" onClick={() => setSelectedMonth(currentMonthKey())}>Praegune kuu</button>
                )}
              </div>
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>→</button>
            </div>

            <section className="month-summary-grid">
              <article><span>Tulud</span><strong className="positive-text">{euro(income)}</strong></article>
              <article><span>Kulud</span><strong className="negative-text">{euro(expenses)}</strong></article>
              <article><span>Kuu tulemus</span><strong className={result >= 0 ? "positive-text" : "negative-text"}>{euro(result)}</strong></article>
              <article><span>Võlamaksed</span><strong>{euro(debtPaid)}</strong></article>
            </section>

            <section className="monthly-section">
              <div className="monthly-section-heading">
                <h3>Tulud ja kulud</h3>
                <span>{transactions.length} kirjet</span>
              </div>
              {transactions.length === 0 ? (
                <div className="empty-state">Selles kuus tulusid ega kulusid pole.</div>
              ) : (
                <div className="monthly-list">
                  {transactions.map((item) => (
                    <article className="monthly-row" key={item.id}>
                      <div><strong>{item.name}</strong><small>{item.date} · {item.category}</small></div>
                      <strong className={item.type === "income" ? "positive-text" : "negative-text"}>
                        {item.type === "income" ? "+" : "−"}{euro(item.amount)}
                      </strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="monthly-section">
              <div className="monthly-section-heading">
                <h3>Todo</h3>
                <span>{tasks.length} ülesannet</span>
              </div>
              {tasks.length === 0 ? (
                <div className="empty-state">Selles kuus Todo ülesandeid pole.</div>
              ) : (
                <div className="monthly-list">
                  {tasks.map((task) => (
                    <article className={`monthly-row ${task.completed ? "completed" : ""}`} key={task.id}>
                      <div><strong>{task.title}</strong><small>{task.date}{task.linkedAmount ? ` · ${euro(task.linkedAmount)}` : ""}</small></div>
                      <span>{task.completed ? "Tehtud" : "Aktiivne"}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      )}
    </>
  );
}
