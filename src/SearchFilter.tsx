import { useMemo, useState } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category: string;
};

type PlannedPayment = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: "planned" | "paid" | "cancelled";
};

type SearchRow = {
  id: string;
  source: "transaction" | "planned";
  name: string;
  amount: number;
  type: "income" | "expense" | "planned";
  date: string;
  category: string;
  status?: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

export default function SearchFilter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [revision, setRevision] = useState(0);

  const rows = useMemo(() => {
    const data = readJson<{ transactions?: Transaction[] }>(STORAGE_KEY, {});
    const planned = readJson<PlannedPayment[]>(PLANNED_KEY, []);

    const transactionRows: SearchRow[] = (Array.isArray(data.transactions) ? data.transactions : []).map((item) => ({
      id: item.id,
      source: "transaction",
      name: item.name,
      amount: Number(item.amount || 0),
      type: item.type,
      date: item.date,
      category: item.category || "Muu",
    }));

    const plannedRows: SearchRow[] = (Array.isArray(planned) ? planned : []).map((item) => ({
      id: item.id,
      source: "planned",
      name: item.name,
      amount: Number(item.amount || 0),
      type: "planned",
      date: item.dueDate,
      category: item.category || "Muu",
      status: item.status,
    }));

    return [...transactionRows, ...plannedRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [revision]);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "et")),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("et");
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

    return rows.filter((item) => {
      if (q && !`${item.name} ${item.category} ${item.status ?? ""}`.toLocaleLowerCase("et").includes(q)) return false;
      if (type !== "all" && item.type !== type) return false;
      if (category !== "all" && item.category !== category) return false;
      if (month && item.date.slice(0, 7) !== month) return false;
      if (min !== null && Number.isFinite(min) && item.amount < min) return false;
      if (max !== null && Number.isFinite(max) && item.amount > max) return false;
      return true;
    });
  }, [rows, query, type, category, month, minAmount, maxAmount]);

  const total = filtered.reduce((sum, item) => {
    if (item.type === "income") return sum + item.amount;
    if (item.type === "expense") return sum - item.amount;
    return sum;
  }, 0);

  function resetFilters() {
    setQuery("");
    setType("all");
    setCategory("all");
    setMonth("");
    setMinAmount("");
    setMaxAmount("");
  }

  return (
    <>
      <button className="secondary-button" onClick={() => { setRevision((value) => value + 1); setOpen(true); }}>
        Ava otsing
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="search-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Otsing</p>
                <h2>Leia kirjed kiiresti</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="search-filter-grid">
              <label>Otsing<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nimi või kategooria" /></label>
              <label>Tüüp<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">Kõik</option><option value="income">Tulud</option><option value="expense">Kulud</option><option value="planned">Planeeritud maksed</option></select></label>
              <label>Kategooria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Kõik kategooriad</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Kuu<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
              <label>Min summa<input type="number" min="0" step="0.01" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} /></label>
              <label>Max summa<input type="number" min="0" step="0.01" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} /></label>
            </div>

            <div className="search-toolbar">
              <div><strong>{filtered.length} tulemust</strong><span>Tehingute saldo {euro(total)}</span></div>
              <button className="secondary-button" onClick={resetFilters}>Puhasta filtrid</button>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">Sobivaid kirjeid ei leitud.</div>
            ) : (
              <div className="search-results">
                {filtered.map((item) => (
                  <article className="search-result-row" key={`${item.source}-${item.id}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.date} · {item.category}{item.status ? ` · ${item.status}` : ""}</small>
                    </div>
                    <div className="search-result-meta">
                      <span>{item.type === "income" ? "Tulu" : item.type === "expense" ? "Kulu" : "Planeeritud"}</span>
                      <strong className={item.type === "income" ? "positive-text" : item.type === "expense" ? "negative-text" : ""}>
                        {item.type === "income" ? "+" : item.type === "expense" ? "−" : ""}{euro(item.amount)}
                      </strong>
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
