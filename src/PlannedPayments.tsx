import { useMemo, useState, type FormEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

type PaymentStatus = "planned" | "paid" | "cancelled";

type PlannedPayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: PaymentStatus;
  transactionId?: string;
};

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category: string;
  plannedPaymentId?: string;
};

type AppData = {
  transactions?: Transaction[];
  [key: string]: unknown;
};

const categories = ["Elamine", "Toit", "Transport", "Lapsed", "Võlamakse", "Tervis", "Töö", "Muu"];
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

function readPlanned(): PlannedPayment[] {
  try {
    const raw = localStorage.getItem(PLANNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function writePlanned(items: PlannedPayment[]) {
  localStorage.setItem(PLANNED_KEY, JSON.stringify(items));
}

function effectiveStatus(item: PlannedPayment): "planned" | "paid" | "late" | "cancelled" {
  if (item.status === "paid") return "paid";
  if (item.status === "cancelled") return "cancelled";
  return item.dueDate < todayIso() ? "late" : "planned";
}

const statusLabel = {
  planned: "Planeeritud",
  paid: "Makstud",
  late: "Hilinenud",
  cancelled: "Tühistatud",
};

export default function PlannedPayments() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlannedPayment[]>(() => readPlanned());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [category, setCategory] = useState("Elamine");

  const counts = useMemo(() => {
    return items.reduce(
      (result, item) => {
        result[effectiveStatus(item)] += 1;
        return result;
      },
      { planned: 0, paid: 0, late: 0, cancelled: 0 },
    );
  }, [items]);

  function saveItems(next: PlannedPayment[]) {
    setItems(next);
    writePlanned(next);
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !dueDate) {
      alert("Kontrolli nimetust, summat ja kuupäeva.");
      return;
    }

    saveItems([
      {
        id: createId(),
        name: name.trim(),
        amount: numericAmount,
        dueDate,
        category,
        status: "planned",
      },
      ...items,
    ]);
    setName("");
    setAmount("");
  }

  function markPaid(item: PlannedPayment) {
    if (item.status === "paid") return;
    const data = readAppData();
    if (!data) {
      alert("MyMoney põhiandmeid ei leitud.");
      return;
    }

    const transactionId = createId();
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const transaction: Transaction = {
      id: transactionId,
      name: item.name,
      amount: item.amount,
      type: "expense",
      date: todayIso(),
      category: item.category,
      plannedPaymentId: item.id,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, transactions: [transaction, ...transactions] }));
    saveItems(items.map((current) => current.id === item.id ? { ...current, status: "paid", transactionId } : current));
    window.location.reload();
  }

  function setStatus(id: string, status: PaymentStatus) {
    saveItems(items.map((item) => item.id === id ? { ...item, status } : item));
  }

  function removeItem(id: string) {
    if (!window.confirm("Kustutada see planeeritud makse?")) return;
    saveItems(items.filter((item) => item.id !== id));
  }

  return (
    <>
      <button className="secondary-button planned-open" onClick={() => setOpen(true)}>
        Maksed{counts.late > 0 ? ` (${counts.late} hilinenud)` : ""}
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="planned-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Makseplaan</p>
                <h2>Planeeritud ja makstud</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="status-summary">
              <span>Planeeritud <strong>{counts.planned}</strong></span>
              <span>Makstud <strong>{counts.paid}</strong></span>
              <span>Hilinenud <strong>{counts.late}</strong></span>
            </div>

            <form className="planned-form" onSubmit={addItem}>
              <label>Nimetus<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Näiteks elekter või üür" /></label>
              <label>Summa<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              <label>Tähtaeg<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              <label>Kategooria<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="primary-button" type="submit">Lisa planeeritud makse</button>
            </form>

            {items.length === 0 ? (
              <div className="empty-state">Planeeritud makseid pole lisatud.</div>
            ) : (
              <div className="planned-list">
                {items.map((item) => {
                  const status = effectiveStatus(item);
                  return (
                    <article className={`planned-row status-${status}`} key={item.id}>
                      <div className="planned-main">
                        <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>
                        <strong>{item.name}</strong>
                        <small>{item.dueDate} · {item.category}</small>
                      </div>
                      <strong className="planned-amount">{item.amount.toFixed(2)} €</strong>
                      <div className="planned-actions">
                        {status !== "paid" && status !== "cancelled" && <button className="primary-button small" onClick={() => markPaid(item)}>Märgi makstuks</button>}
                        {status === "cancelled" && <button className="secondary-button" onClick={() => setStatus(item.id, "planned")}>Taasta</button>}
                        {status !== "paid" && status !== "cancelled" && <button className="secondary-button" onClick={() => setStatus(item.id, "cancelled")}>Tühista</button>}
                        <button className="danger-link" onClick={() => removeItem(item.id)}>Kustuta</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
