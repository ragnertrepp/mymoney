import { useEffect, useState, type FormEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
};

type StoredData = {
  transactions?: Transaction[];
  [key: string]: unknown;
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

function readStoredData(): StoredData | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredData;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function TransactionEditor() {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = readStoredData();
    setTransactions(Array.isArray(stored?.transactions) ? stored.transactions : []);
  }, [open]);

  function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const name = editing.name.trim();
    const amount = Number(editing.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0 || !editing.date) {
      alert("Kontrolli nimetust, summat ja kuupäeva.");
      return;
    }

    const stored = readStoredData();
    if (!stored) {
      alert("MyMoney andmeid ei leitud.");
      return;
    }

    const current = Array.isArray(stored.transactions) ? stored.transactions : [];
    const updated = current.map((item) =>
      item.id === editing.id ? { ...editing, name, amount } : item,
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, transactions: updated }));
    setTransactions(updated);
    setEditing(null);
    alert("Kirje muudetud.");
    window.location.reload();
  }

  function removeTransaction(transaction: Transaction) {
    const accepted = window.confirm(`Kustutada kirje “${transaction.name}”?`);
    if (!accepted) return;

    const stored = readStoredData();
    if (!stored) return;
    const current = Array.isArray(stored.transactions) ? stored.transactions : [];
    const updated = current.filter((item) => item.id !== transaction.id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, transactions: updated }));
    setTransactions(updated);
    setEditing(null);
    window.location.reload();
  }

  return (
    <>
      <button className="secondary-button transaction-editor-open" onClick={() => setOpen(true)}>
        Muuda kirjeid
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="transaction-editor-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Tulude ja kulude muutmine"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="editor-header">
              <div>
                <p className="eyebrow">Eelarve</p>
                <h2>Muuda tulu või kulu</h2>
              </div>
              <button className="secondary-button" onClick={() => { setEditing(null); setOpen(false); }}>
                Sulge
              </button>
            </header>

            {editing ? (
              <form className="editor-form" onSubmit={saveTransaction}>
                <div className="type-switch">
                  <button
                    type="button"
                    className={editing.type === "income" ? "active" : ""}
                    onClick={() => setEditing({ ...editing, type: "income", category: editing.category === "Muu" ? "Sissetulek" : editing.category })}
                  >
                    Tulu
                  </button>
                  <button
                    type="button"
                    className={editing.type === "expense" ? "active" : ""}
                    onClick={() => setEditing({ ...editing, type: "expense" })}
                  >
                    Kulu
                  </button>
                </div>

                <label>
                  Nimetus
                  <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                </label>
                <label>
                  Summa
                  <input type="number" min="0.01" step="0.01" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: Number(event.target.value) })} />
                </label>
                <label>
                  Kategooria
                  <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label>
                  Kuupäev
                  <input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} />
                </label>

                <div className="editor-actions">
                  <button className="primary-button" type="submit">Salvesta muudatus</button>
                  <button className="secondary-button" type="button" onClick={() => setEditing(null)}>Tühista</button>
                  <button className="danger-link" type="button" onClick={() => removeTransaction(editing)}>Kustuta kirje</button>
                </div>
              </form>
            ) : transactions.length === 0 ? (
              <div className="empty-state">Ühtegi tulu ega kulu pole veel lisatud.</div>
            ) : (
              <div className="editor-transaction-list">
                {transactions.map((transaction) => (
                  <button className="editor-transaction-row" key={transaction.id} onClick={() => setEditing({ ...transaction })}>
                    <span>
                      <strong>{transaction.name}</strong>
                      <small>{transaction.date} · {transaction.category}</small>
                    </span>
                    <strong className={transaction.type === "income" ? "positive-text" : "negative-text"}>
                      {transaction.type === "income" ? "+" : "−"}{transaction.amount.toFixed(2)} €
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
