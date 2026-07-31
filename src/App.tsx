import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import "./App.css";

type TransactionType = "income" | "expense";
type Tab = "today" | "budget" | "debts" | "calendar";
type Transaction = { id: string; name: string; amount: number; type: TransactionType; date: string; category: string };
type Debt = { id: string; name: string; balance: number; minimumPayment: number; interest: number; dueDate: string; priority: number };
type DebtPayment = { id: string; debtId: string; debtName: string; amount: number; date: string };
type Task = { id: string; title: string; date: string; completed: boolean; linkedAmount?: number };
type Settings = { startingBalance: number; monthlyReserve: number };
type AppData = { transactions: Transaction[]; debts: Debt[]; debtPayments: DebtPayment[]; tasks: Task[]; settings: Settings };

const STORAGE_KEY = "rebuildme-mymoney-v2";
const initialData: AppData = { transactions: [], debts: [], debtPayments: [], tasks: [], settings: { startingBalance: 0, monthlyReserve: 100 } };
const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => todayIso().slice(0, 7);
const monthKey = (date: string) => date.slice(0, 7);
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const euro = (value: number) => new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);
const parseNumber = (value: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizeData(value: unknown): AppData {
  const candidate = value as Partial<AppData> | null;
  return {
    transactions: Array.isArray(candidate?.transactions) ? candidate.transactions : [],
    debts: Array.isArray(candidate?.debts) ? candidate.debts : [],
    debtPayments: Array.isArray(candidate?.debtPayments) ? candidate.debtPayments : [],
    tasks: Array.isArray(candidate?.tasks) ? candidate.tasks : [],
    settings: {
      startingBalance: typeof candidate?.settings?.startingBalance === "number" ? candidate.settings.startingBalance : 0,
      monthlyReserve: typeof candidate?.settings?.monthlyReserve === "number" ? candidate.settings.monthlyReserve : 100,
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
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [transactionCategory, setTransactionCategory] = useState("Muu");

  const [debtName, setDebtName] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtMinimum, setDebtMinimum] = useState("");
  const [debtInterest, setDebtInterest] = useState("");
  const [debtDueDate, setDebtDueDate] = useState(todayIso());
  const [debtPriority, setDebtPriority] = useState("1");

  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentMonth = currentMonthKey();
  const monthTransactions = useMemo(() => data.transactions.filter((item) => monthKey(item.date) === currentMonth), [data.transactions, currentMonth]);
  const monthDebtPayments = useMemo(() => data.debtPayments.filter((item) => monthKey(item.date) === currentMonth), [data.debtPayments, currentMonth]);
  const monthlyIncome = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const monthlyExpenses = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const currentBalance = data.settings.startingBalance + monthlyIncome - monthlyExpenses;
  const monthlyDebtPlan = data.debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const monthlyDebtPaid = monthDebtPayments.reduce((sum, item) => sum + item.amount, 0);
  const monthlyDebtRemaining = data.debts.reduce((sum, debt) => {
    const paid = monthDebtPayments.filter((item) => item.debtId === debt.id).reduce((total, item) => total + item.amount, 0);
    return sum + Math.max(0, debt.minimumPayment - paid);
  }, 0);
  const safeToSpend = currentBalance - monthlyDebtRemaining - Math.max(0, data.settings.monthlyReserve);
  const totalDebt = data.debts.reduce((sum, debt) => sum + debt.balance, 0);
  const remainingDays = useMemo(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.max(1, last.getDate() - now.getDate() + 1);
  }, []);
  const dailyBudget = Math.max(0, safeToSpend / remainingDays);
  const upcomingTasks = [...data.tasks].filter((task) => !task.completed).sort((a, b) => a.date.localeCompare(b.date));
  const sortedDebts = [...data.debts].sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : b.interest - a.interest);

  const purchaseValue = parseNumber(purchaseAmount);
  const affordability = useMemo(() => {
    if (purchaseValue <= 0) return { status: "neutral", title: "Sisesta ostu hind", message: "Rakendus arvutab kohe, kas ost mahub sinu eelarvesse." };
    const after = safeToSpend - purchaseValue;
    if (after >= data.settings.monthlyReserve) return { status: "good", title: "Jah, saad lubada", message: `Pärast ostu jääks vabaks ${euro(after)}.` };
    if (after >= 0) return { status: "warning", title: "Saad lubada, aga eelarve läheb pingeliseks", message: `Pärast ostu jääks ${euro(after)}.` };
    return { status: "danger", title: "Praegu ei ole mõistlik", message: `Turvalisest eelarvest jääb puudu ${euro(Math.abs(after))}.` };
  }, [purchaseValue, safeToSpend, data.settings.monthlyReserve]);

  function addTransaction(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseNumber(transactionAmount);
    if (!transactionName.trim() || amount <= 0) return;
    const item: Transaction = { id: createId(), name: transactionName.trim(), amount, type: transactionType, date: transactionDate, category: transactionCategory };
    setData((previous) => ({ ...previous, transactions: [item, ...previous.transactions] }));
    setTransactionName("");
    setTransactionAmount("");
  }

  function addDebt(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const balance = parseNumber(debtBalance);
    if (!debtName.trim() || balance <= 0) return;
    const item: Debt = {
      id: createId(),
      name: debtName.trim(),
      balance,
      minimumPayment: Math.max(0, parseNumber(debtMinimum)),
      interest: Math.max(0, parseNumber(debtInterest)),
      dueDate: debtDueDate,
      priority: Math.max(1, Math.round(parseNumber(debtPriority)) || 1),
    };
    setData((previous) => ({ ...previous, debts: [...previous.debts, item] }));
    setDebtName("");
    setDebtBalance("");
    setDebtMinimum("");
    setDebtInterest("");
    setDebtPriority("1");
  }

  function saveDebtPayment(debt: Debt) {
    const payment = parseNumber(paymentAmount);
    if (payment <= 0) return;
    const paidAmount = Math.min(payment, debt.balance);
    const date = todayIso();
    const record: DebtPayment = { id: createId(), debtId: debt.id, debtName: debt.name, amount: paidAmount, date };
    setData((previous) => ({
      ...previous,
      debts: previous.debts.map((item) => item.id === debt.id ? { ...item, balance: Math.max(0, item.balance - paidAmount) } : item).filter((item) => item.balance > 0),
      debtPayments: [record, ...previous.debtPayments],
      transactions: [{ id: createId(), name: `Võlamakse: ${debt.name}`, amount: paidAmount, type: "expense", date, category: "Võlamakse" }, ...previous.transactions],
    }));
    setPayingDebtId(null);
    setPaymentAmount("");
  }

  function toggleTask(id: string) {
    setData((previous) => ({ ...previous, tasks: previous.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task) }));
  }

  function updateSetting(field: keyof Settings, value: string) {
    setData((previous) => ({ ...previous, settings: { ...previous.settings, [field]: parseNumber(value) } }));
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
    if (window.confirm("Kas kustutada kõik MyMoney andmed? Seda ei saa tagasi võtta.")) setData(initialData);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">RebuildMe</p><h1>MyMoney</h1></div>
      <button className="secondary-button" onClick={exportBackup}>Varukoopia</button>
    </header>

    <nav className="navigation" aria-label="Põhimenüü">
      <NavButton label="Täna" active={tab === "today"} onClick={() => setTab("today")} />
      <NavButton label="Eelarve" active={tab === "budget"} onClick={() => setTab("budget")} />
      <NavButton label="Võlad" active={tab === "debts"} onClick={() => setTab("debts")} />
      <NavButton label="Kalender" active={tab === "calendar"} onClick={() => setTab("calendar")} />
    </nav>

    <main>
      {tab === "today" && <>
        <section className="summary-grid">
          <SummaryCard label="Praegune saldo" value={euro(currentBalance)} detail="Algjääk + tulud − kulud" />
          <SummaryCard label="Turvaliselt kasutada" value={euro(Math.max(0, safeToSpend))} detail="Pärast reservi ja võlamakseid" />
          <SummaryCard label="Päevane eelarve" value={euro(dailyBudget)} detail={`${remainingDays} päeva kuu lõpuni`} />
          <SummaryCard label="Võlgu kokku" value={euro(totalDebt)} detail={`${data.debts.length} aktiivset võlga`} />
        </section>

        <section className="two-column">
          <div className="card">
            <div className="section-heading"><div><p className="eyebrow">Kontroll</p><h2>Kas saan lubada?</h2></div></div>
            <div className="form-grid">
              <label>Ostu nimetus<input value={purchaseName} onChange={(e) => setPurchaseName(e.target.value)} placeholder="Näiteks telefon või toit" /></label>
              <MoneyInput label="Hind" value={purchaseAmount} onChange={setPurchaseAmount} />
            </div>
            <div className={`affordability ${affordability.status}`}><strong>{affordability.title}</strong><span>{affordability.message}</span></div>
          </div>

          <div className="card">
            <div className="section-heading"><div><p className="eyebrow">Järgmised tegevused</p><h2>Tulemas</h2></div></div>
            {upcomingTasks.length === 0 ? <EmptyState text="Ühtegi aktiivset tegevust pole." /> : <div className="list">
              {upcomingTasks.slice(0, 5).map((task) => <div className="list-row" key={task.id}>
                <button className="check-button" onClick={() => toggleTask(task.id)}>○</button>
                <div className="list-content"><strong>{task.title}</strong><span>{task.date}{task.linkedAmount ? ` · ${euro(task.linkedAmount)}` : ""}</span></div>
              </div>)}
            </div>}
          </div>
        </section>

        <section className="card">
          <div className="section-heading"><div><p className="eyebrow">Selle kuu võlaplaan</p><h2>{euro(monthlyDebtPaid)} / {euro(monthlyDebtPlan)} makstud</h2></div></div>
          <ProgressBar value={monthlyDebtPlan > 0 ? monthlyDebtPaid / monthlyDebtPlan : 0} />
          <span>Veel maksta: {euro(monthlyDebtRemaining)}</span>
        </section>
      </>}

      {tab === "budget" && <>
        <section className="summary-grid">
          <SummaryCard label="Sissetulekud" value={euro(monthlyIncome)} detail="Sellel kuul" />
          <SummaryCard label="Kulud" value={euro(monthlyExpenses)} detail="Sellel kuul" />
          <SummaryCard label="Võlamaksed" value={euro(monthlyDebtPaid)} detail={`Plaan ${euro(monthlyDebtPlan)}`} />
          <SummaryCard label="Vabalt kasutada" value={euro(safeToSpend)} detail="Pärast reservi ja võlamakseid" />
        </section>

        <section className="two-column">
          <div className="card">
            <div className="section-heading"><div><p className="eyebrow">Seaded</p><h2>Kuu algandmed</h2></div></div>
            <div className="form-grid">
              <SettingInput label="Algjääk" value={data.settings.startingBalance} onCommit={(value) => updateSetting("startingBalance", value)} />
              <SettingInput label="Turvareserv" value={data.settings.monthlyReserve} onCommit={(value) => updateSetting("monthlyReserve", value)} />
            </div>
          </div>

          <div className="card">
            <div className="section-heading"><div><p className="eyebrow">Uus kirje</p><h2>Lisa tulu või kulu</h2></div></div>
            <form onSubmit={addTransaction}>
              <div className="form-grid">
                <label>Nimetus<input required value={transactionName} onChange={(e) => setTransactionName(e.target.value)} placeholder="Näiteks palk või toit" /></label>
                <MoneyInput label="Summa" value={transactionAmount} onChange={setTransactionAmount} required />
                <label>Tüüp<select value={transactionType} onChange={(e) => setTransactionType(e.target.value as TransactionType)}><option value="expense">Kulu</option><option value="income">Tulu</option></select></label>
                <label>Kategooria<select value={transactionCategory} onChange={(e) => setTransactionCategory(e.target.value)}><option>Elamine</option><option>Toit</option><option>Transport</option><option>Lapsed</option><option>Võlamakse</option><option>Tervis</option><option>Töö</option><option>Sissetulek</option><option>Muu</option></select></label>
                <label>Kuupäev<input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} /></label>
              </div>
              <button className="primary-button" type="submit">Lisa kirje</button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="section-heading"><div><p className="eyebrow">Ajalugu</p><h2>Tulud ja kulud</h2></div></div>
          {data.transactions.length === 0 ? <EmptyState text="Ühtegi tulu ega kulu pole veel lisatud." /> : <div className="table-wrapper"><table>
            <thead><tr><th>Kuupäev</th><th>Nimetus</th><th>Kategooria</th><th>Tüüp</th><th>Summa</th><th /></tr></thead>
            <tbody>{data.transactions.map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.name}</td><td>{item.category}</td><td>{item.type === "income" ? "Tulu" : "Kulu"}</td><td className={item.type === "income" ? "positive-text" : "negative-text"}>{item.type === "income" ? "+" : "−"}{euro(item.amount)}</td><td><button className="danger-link" onClick={() => setData((previous) => ({ ...previous, transactions: previous.transactions.filter((row) => row.id !== item.id) }))}>Kustuta</button></td></tr>)}</tbody>
          </table></div>}
        </section>
      </>}

      {tab === "debts" && <>
        <section className="summary-grid">
          <SummaryCard label="Võlgu kokku" value={euro(totalDebt)} detail={`${data.debts.length} aktiivset võlga`} />
          <SummaryCard label="Kuu plaan" value={euro(monthlyDebtPlan)} detail="Minimaalsed maksed" />
          <SummaryCard label="Makstud" value={euro(monthlyDebtPaid)} detail={`Veel ${euro(monthlyDebtRemaining)}`} />
          <SummaryCard label="Kõrgeim intress" value={`${Math.max(0, ...data.debts.map((item) => item.interest))}%`} detail="Aktiivsete võlgade seas" />
        </section>

        <section className="card">
          <div className="section-heading"><div><p className="eyebrow">Uus võlg</p><h2>Lisa võlg</h2></div></div>
          <form onSubmit={addDebt}>
            <div className="form-grid wide">
              <label>Võlausaldaja<input required value={debtName} onChange={(e) => setDebtName(e.target.value)} /></label>
              <MoneyInput label="Võlajääk" value={debtBalance} onChange={setDebtBalance} required />
              <MoneyInput label="Kuumakse" value={debtMinimum} onChange={setDebtMinimum} />
              <MoneyInput label="Intress" value={debtInterest} onChange={setDebtInterest} suffix="%" />
              <label>Järgmine tähtaeg<input type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} /></label>
              <label>Prioriteet<input type="text" inputMode="numeric" value={debtPriority} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setDebtPriority(e.target.value.replace(/\D/g, ""))} /></label>
            </div>
            <button className="primary-button" type="submit">Lisa võlg</button>
          </form>
        </section>

        <section className="card">
          <div className="section-heading"><div><p className="eyebrow">Makseplaan</p><h2>Võlad prioriteedi järgi</h2></div></div>
          {sortedDebts.length === 0 ? <EmptyState text="Võlatabel on tühi." /> : <div className="debt-list">{sortedDebts.map((debt) => {
            const paid = monthDebtPayments.filter((item) => item.debtId === debt.id).reduce((sum, item) => sum + item.amount, 0);
            const remaining = Math.max(0, debt.minimumPayment - paid);
            return <article className="debt-card" key={debt.id}>
              <div className="debt-header"><div><span className="priority-badge">Prioriteet {debt.priority}</span><h3>{debt.name}</h3></div><strong>{euro(debt.balance)}</strong></div>
              <div className="debt-details"><span>Kuu plaan: {euro(debt.minimumPayment)}</span><span>Makstud: {euro(paid)}</span><span>Veel maksta: {euro(remaining)}</span><span>Intress: {debt.interest}%</span><span>Tähtaeg: {debt.dueDate}</span></div>
              <ProgressBar value={debt.minimumPayment > 0 ? paid / debt.minimumPayment : 0} />
              {payingDebtId === debt.id ? <div className="form-grid"><MoneyInput label="Makstud summa" value={paymentAmount} onChange={setPaymentAmount} autoFocus /><div className="button-row"><button className="primary-button small" type="button" onClick={() => saveDebtPayment(debt)}>Salvesta makse</button><button className="secondary-button" type="button" onClick={() => { setPayingDebtId(null); setPaymentAmount(""); }}>Tühista</button></div></div> : <div className="button-row"><button className="primary-button small" type="button" onClick={() => { setPayingDebtId(debt.id); setPaymentAmount(debt.minimumPayment > 0 ? String(debt.minimumPayment).replace(".", ",") : ""); }}>Märgi makse</button><button className="danger-link" type="button" onClick={() => setData((previous) => ({ ...previous, debts: previous.debts.filter((row) => row.id !== debt.id) }))}>Kustuta</button></div>}
            </article>;
          })}</div>}
        </section>
      </>}

      {tab === "calendar" && <section className="card">
        <div className="section-heading"><div><p className="eyebrow">Ajajoon</p><h2>Kalender ja tähtajad</h2></div></div>
        <CalendarTimeline debts={data.debts} debtPayments={data.debtPayments} tasks={data.tasks} transactions={data.transactions} />
      </section>}

      <section className="footer-actions"><button className="danger-link" onClick={resetAll}>Kustuta kõik andmed</button><span>Andmed salvestatakse sellesse seadmesse.</span></section>
    </main>
  </div>;
}

function MoneyInput({ label, value, onChange, placeholder = "0,00", suffix = "€", required = false, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; suffix?: string; required?: boolean; autoFocus?: boolean }) {
  return <label>{label}<div style={{ position: "relative" }}><input required={required} autoFocus={autoFocus} type="text" inputMode="decimal" autoComplete="off" value={value} onFocus={(e) => e.currentTarget.select()} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,\-\s]/g, ""))} placeholder={placeholder} style={{ paddingRight: "2.5rem" }} /><span aria-hidden="true" style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", opacity: 0.65, pointerEvents: "none" }}>{suffix}</span></div></label>;
}

function SettingInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(String(value).replace(".", ","));
  return <label>{label}<div style={{ position: "relative" }}><input type="text" inputMode="decimal" value={draft} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,\-\s]/g, ""))} onBlur={() => onCommit(draft)} style={{ paddingRight: "2.5rem" }} /><span aria-hidden="true" style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", opacity: 0.65, pointerEvents: "none" }}>€</span></div></label>;
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{label}</button>; }
function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function ProgressBar({ value }: { value: number }) { const percentage = Math.max(0, Math.min(100, value * 100)); return <div className="progress-track" aria-label={`${Math.round(percentage)}%`}><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }

function CalendarTimeline({ debts, debtPayments, tasks, transactions }: { debts: Debt[]; debtPayments: DebtPayment[]; tasks: Task[]; transactions: Transaction[] }) {
  const entries = [
    ...debts.map((debt) => ({ id: `debt-${debt.id}`, date: debt.dueDate, title: `Võlg: ${debt.name}`, detail: `${euro(debt.minimumPayment)} · jääk ${euro(debt.balance)}` })),
    ...tasks.map((task) => ({ id: `task-${task.id}`, date: task.date, title: task.completed ? `✓ ${task.title}` : task.title, detail: task.linkedAmount ? euro(task.linkedAmount) : "Tegevus" })),
    ...debtPayments.map((payment) => ({ id: `payment-${payment.id}`, date: payment.date, title: `Makstud: ${payment.debtName}`, detail: euro(payment.amount) })),
    ...transactions.map((item) => ({ id: `transaction-${item.id}`, date: item.date, title: item.name, detail: `${item.type === "income" ? "+" : "−"}${euro(item.amount)} · ${item.category}` })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  if (entries.length === 0) return <EmptyState text="Kalendris ei ole veel kirjeid." />;
  return <div className="list">{entries.map((entry) => <div className="list-row" key={entry.id}><div className="list-content"><strong>{entry.title}</strong><span>{entry.date} · {entry.detail}</span></div></div>)}</div>;
}

export default App;
