import { useEffect, useMemo, useState, type FormEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  recurringRuleId?: string;
};

type AppData = {
  transactions?: Transaction[];
  [key: string]: unknown;
};

type RecurringRule = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  dayOfMonth: number;
  active: boolean;
};

const categories = [
  "Elamine",
  "Toit",
  "Transport",
  "Lapsed",
  "Võlamakse",
  "Tervis",
  "Töö",
  "Sissetulek",
  "Muu",
];

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const monthKey = () => new Date().toISOString().slice(0, 7);

function readAppData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readRules(): RecurringRule[] {
  try {
    const raw = localStorage.getItem(RECURRING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRules(rules: RecurringRule[]) {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(rules));
}

function dateForMonth(dayOfMonth: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function generateCurrentMonth(rules: RecurringRule[]) {
  const data = readAppData();
  if (!data) return 0;

  const currentTransactions = Array.isArray(data.transactions) ? data.transactions : [];
  const month = monthKey();
  const additions: Transaction[] = [];

  for (const rule of rules.filter((item) => item.active)) {
    const alreadyExists = currentTransactions.some(
      (item) => item.recurringRuleId === rule.id && item.date.slice(0, 7) === month,
    );
    if (alreadyExists) continue;

    additions.push({
      id: createId(),
      name: rule.name,
      amount: rule.amount,
      type: rule.type,
      date: dateForMonth(rule.dayOfMonth),
      category: rule.category,
      recurringRuleId: rule.id,
    });
  }

  if (additions.length > 0) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, transactions: [...additions, ...currentTransactions] }),
    );
  }

  return additions.length;
}

export default function RecurringTransactions() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<RecurringRule[]>(() => readRules());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Elamine");
  const [dayOfMonth, setDayOfMonth] = useState("1");

  useEffect(() => {
    const created = generateCurrentMonth(rules);
    if (created > 0) window.location.reload();
  }, []);

  const activeCount = useMemo(() => rules.filter((rule) => rule.active).length, [rules]);

  function saveRules(next: RecurringRule[]) {
    setRules(next);
    writeRules(next);
  }

  function addRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const numericDay = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Kontrolli nimetust ja summat.");
      return;
    }

    const next = [
      ...rules,
      {
        id: createId(),
        name: name.trim(),
        amount: numericAmount,
        type,
        category,
        dayOfMonth: numericDay,
        active: true,
      },
    ];

    saveRules(next);
    setName("");
    setAmount("");
    setDayOfMonth("1");
  }

  function toggleRule(id: string) {
    saveRules(rules.map((rule) => rule.id === id ? { ...rule, active: !rule.active } : rule));
  }

  function deleteRule(id: string) {
    if (!window.confirm("Kustutada korduv kirje? Juba loodud tehingud jäävad alles.")) return;
    saveRules(rules.filter((rule) => rule.id !== id));
  }

  function createNow() {
    const created = generateCurrentMonth(rules);
    alert(created > 0 ? `Lisatud ${created} korduvat kirjet.` : "Kõik selle kuu korduvad kirjed on juba lisatud.");
    if (created > 0) window.location.reload();
  }

  return (
    <>
      <button className="secondary-button recurring-open" onClick={() => setOpen(true)}>
        Korduvad kirjed{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="recurring-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Automaatika</p>
                <h2>Korduvad tulud ja kulud</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <form className="recurring-form" onSubmit={addRule}>
              <div className="type-switch">
                <button type="button" className={type === "income" ? "active" : ""} onClick={() => { setType("income"); setCategory("Sissetulek"); }}>Tulu</button>
                <button type="button" className={type === "expense" ? "active" : ""} onClick={() => setType("expense")}>Kulu</button>
              </div>

              <label>Nimetus<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Näiteks palk või üür" /></label>
              <label>Summa<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              <label>Kategooria<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Kuu päev<input type="number" min="1" max="31" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} /></label>
              <button className="primary-button" type="submit">Lisa korduv kirje</button>
            </form>

            <div className="recurring-toolbar">
              <button className="secondary-button" onClick={createNow}>Loo selle kuu kirjed</button>
              <small>Aktiivsed kirjed lisatakse jooksvale kuule üks kord.</small>
            </div>

            {rules.length === 0 ? (
              <div className="empty-state">Korduvaid tulusid ega kulusid pole lisatud.</div>
            ) : (
              <div className="recurring-list">
                {rules.map((rule) => (
                  <article className={`recurring-row ${rule.active ? "" : "inactive"}`} key={rule.id}>
                    <div>
                      <strong>{rule.name}</strong>
                      <span>{rule.type === "income" ? "Tulu" : "Kulu"} · päev {rule.dayOfMonth} · {rule.category}</span>
                    </div>
                    <strong className={rule.type === "income" ? "positive-text" : "negative-text"}>{rule.type === "income" ? "+" : "−"}{rule.amount.toFixed(2)} €</strong>
                    <div className="recurring-actions">
                      <button className="secondary-button" onClick={() => toggleRule(rule.id)}>{rule.active ? "Peata" : "Aktiveeri"}</button>
                      <button className="danger-link" onClick={() => deleteRule(rule.id)}>Kustuta</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
