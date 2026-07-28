import { useMemo, useState } from "react";

const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";
const STORAGE_KEY = "rebuildme-mymoney-v2";

type ReceivableStatus = "open" | "paid";

type Receivable = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  note?: string;
  status: ReceivableStatus;
  paidDate?: string;
  transactionId?: string;
};

type MainData = {
  transactions?: Array<{
    id: string;
    name: string;
    amount: number;
    type: "income" | "expense";
    date: string;
    category: string;
    receivableId?: string;
  }>;
  [key: string]: unknown;
};

const euro = (value: number) => new Intl.NumberFormat("et-FI", { style: "currency", currency: "EUR" }).format(value);
const todayIso = () => new Date().toISOString().slice(0, 10);
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function readReceivables(): Receivable[] {
  try {
    const raw = localStorage.getItem(RECEIVABLES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readMainData(): MainData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as MainData : null;
  } catch {
    return null;
  }
}

export default function Receivables() {
  const [items, setItems] = useState<Receivable[]>(() => readReceivables());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [note, setNote] = useState("");

  const openItems = useMemo(
    () => items.filter((item) => item.status === "open").sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [items],
  );
  const paidItems = useMemo(
    () => items.filter((item) => item.status === "paid").sort((a, b) => (b.paidDate ?? "").localeCompare(a.paidDate ?? "")),
    [items],
  );
  const totalOpen = openItems.reduce((sum, item) => sum + item.amount, 0);
  const overdue = openItems.filter((item) => item.dueDate < todayIso());

  function save(next: Receivable[]) {
    setItems(next);
    localStorage.setItem(RECEIVABLES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mymoney-data-changed", { detail: { key: RECEIVABLES_KEY } }));
  }

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;

    save([
      {
        id: createId(),
        name: name.trim(),
        amount: value,
        dueDate,
        note: note.trim() || undefined,
        status: "open",
      },
      ...items,
    ]);

    setName("");
    setAmount("");
    setNote("");
  }

  function markPaid(id: string) {
    const receivable = items.find((item) => item.id === id);
    if (!receivable || receivable.status !== "open") return;

    const main = readMainData();
    if (!main) {
      alert("Põhiandmeid ei saanud avada. Laekumist ei märgitud, et vältida andmete kadumist.");
      return;
    }

    const date = todayIso();
    const transactionId = createId();
    const transactions = Array.isArray(main.transactions) ? main.transactions : [];

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...main,
      transactions: [
        {
          id: transactionId,
          name: `Laekumine: ${receivable.name}`,
          amount: receivable.amount,
          type: "income",
          date,
          category: "Sissetulek",
          receivableId: receivable.id,
        },
        ...transactions,
      ],
    }));

    save(items.map((item) => item.id === id ? { ...item, status: "paid", paidDate: date, transactionId } : item));
    window.location.reload();
  }

  function restore(id: string) {
    const receivable = items.find((item) => item.id === id);
    if (!receivable) return;

    if (receivable.transactionId) {
      const main = readMainData();
      if (!main) {
        alert("Põhiandmeid ei saanud avada. Laekumist ei taastatud, et vältida andmete vastuolu.");
        return;
      }
      const transactions = Array.isArray(main.transactions) ? main.transactions : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...main,
        transactions: transactions.filter((transaction) => transaction.id !== receivable.transactionId),
      }));
    }

    save(items.map((item) => item.id === id ? { ...item, status: "open", paidDate: undefined, transactionId: undefined } : item));
    window.location.reload();
  }

  function remove(id: string) {
    if (!window.confirm("Kustutada see nõue?")) return;
    save(items.filter((item) => item.id !== id));
  }

  return (
    <div className="receivables-tool">
      <div className="receivables-summary-grid">
        <article><span>Mulle võlgu kokku</span><strong>{euro(totalOpen)}</strong></article>
        <article><span>Laekumata</span><strong>{openItems.length}</strong></article>
        <article><span>Hilinenud</span><strong className={overdue.length > 0 ? "negative-text" : "positive-text"}>{overdue.length}</strong></article>
      </div>

      <section className="card compact-form-card receivable-form-card">
        <div className="section-heading"><div><p className="eyebrow">Uus nõue</p><h2>Lisa, kes sulle võlgu on</h2></div></div>
        <form onSubmit={addItem}>
          <div className="form-grid wide">
            <label>Kes võlgneb<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nimi või ettevõte" /></label>
            <label>Summa<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            <label>Millal maksab<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <label>Märkus<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Näiteks laen, arve, kokkulepe" /></label>
          </div>
          <button className="primary-button" type="submit">Lisa mulle võlgu</button>
        </form>
      </section>

      <section className="card">
        <div className="section-heading"><div><p className="eyebrow">Laekumised</p><h2>Ootel maksed</h2></div></div>
        {openItems.length === 0 ? (
          <div className="empty-state">Keegi ei ole praegu sulle märgitud võlgu.</div>
        ) : (
          <div className="receivables-list">
            {openItems.map((item) => {
              const isLate = item.dueDate < todayIso();
              return (
                <article className={`receivable-row ${isLate ? "late" : ""}`} key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{isLate ? "Hilinenud · " : "Tähtaeg · "}{item.dueDate}{item.note ? ` · ${item.note}` : ""}</span>
                  </div>
                  <div className="receivable-actions">
                    <strong>{euro(item.amount)}</strong>
                    <button className="primary-button small" onClick={() => markPaid(item.id)}>Märgi laekunuks</button>
                    <button className="danger-link" onClick={() => remove(item.id)}>Kustuta</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {paidItems.length > 0 && (
        <section className="card">
          <div className="section-heading"><div><p className="eyebrow">Ajalugu</p><h2>Laekunud</h2></div></div>
          <div className="receivables-list">
            {paidItems.slice(0, 12).map((item) => (
              <article className="receivable-row paid" key={item.id}>
                <div><strong>{item.name}</strong><span>Laekus {item.paidDate} · lisatud automaatselt tuluna</span></div>
                <div className="receivable-actions">
                  <strong>{euro(item.amount)}</strong>
                  <button className="secondary-button small" onClick={() => restore(item.id)}>Taasta ootele</button>
                  <button className="danger-link" onClick={() => remove(item.id)}>Kustuta</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
