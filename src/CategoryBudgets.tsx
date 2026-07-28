import { useMemo, useState } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";

type Transaction = {
  amount: number;
  type: "income" | "expense";
  date: string;
  category: string;
};

type BudgetMap = Record<string, number>;

type BudgetRow = {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  status: "good" | "warning" | "danger";
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

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function CategoryBudgets() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<BudgetMap>(() => readJson<BudgetMap>(BUDGET_KEY, {}));
  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [revision, setRevision] = useState(0);

  const categories = useMemo(() => {
    const data = readJson<{ transactions?: Transaction[] }>(STORAGE_KEY, {});
    const values = Array.isArray(data.transactions)
      ? data.transactions.map((item) => item.category?.trim()).filter(Boolean)
      : [];
    return Array.from(new Set([...Object.keys(budgets), ...values])).sort((a, b) => a.localeCompare(b, "et"));
  }, [budgets, revision]);

  const rows = useMemo(() => {
    const data = readJson<{ transactions?: Transaction[] }>(STORAGE_KEY, {});
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];

    return Object.entries(budgets)
      .map(([category, limit]) => {
        const spent = transactions
          .filter((item) => item.type === "expense" && item.category === category && item.date?.slice(0, 7) === selectedMonth)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        return {
          category,
          limit,
          spent,
          remaining: limit - spent,
          percent,
          status: percent >= 100 ? "danger" : percent >= 80 ? "warning" : "good",
        } as BudgetRow;
      })
      .sort((a, b) => b.percent - a.percent);
  }, [budgets, selectedMonth, revision]);

  const totals = rows.reduce(
    (result, row) => ({ limit: result.limit + row.limit, spent: result.spent + row.spent }),
    { limit: 0, spent: 0 },
  );

  function saveBudgets(next: BudgetMap) {
    setBudgets(next);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(next));
  }

  function addBudget() {
    const category = newCategory.trim();
    const limit = Number(newLimit.replace(",", "."));
    if (!category || !Number.isFinite(limit) || limit <= 0) return;
    saveBudgets({ ...budgets, [category]: limit });
    setNewCategory("");
    setNewLimit("");
  }

  function updateBudget(category: string, value: string) {
    const limit = Number(value.replace(",", "."));
    if (!Number.isFinite(limit) || limit <= 0) return;
    saveBudgets({ ...budgets, [category]: limit });
  }

  function removeBudget(category: string) {
    const next = { ...budgets };
    delete next[category];
    saveBudgets(next);
  }

  return (
    <>
      <button className="secondary-button" onClick={() => { setRevision((value) => value + 1); setOpen(true); }}>
        Halda piire
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="category-budget-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Eelarvehoiatused</p>
                <h2>Kategooriate piirid</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="category-budget-controls">
              <label>Kuu<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
              <label>Kategooria<input list="budget-category-options" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Näiteks Toit" /></label>
              <label>Kuupiir<input type="number" min="0" step="0.01" value={newLimit} onChange={(event) => setNewLimit(event.target.value)} placeholder="0.00" /></label>
              <button className="primary-button" onClick={addBudget}>Lisa piir</button>
              <datalist id="budget-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist>
            </div>

            <div className="comparison-summary-grid">
              <article><span>Piirid kokku</span><strong>{euro(totals.limit)}</strong></article>
              <article><span>Kulutatud</span><strong>{euro(totals.spent)}</strong></article>
              <article><span>Alles</span><strong className={totals.limit - totals.spent < 0 ? "negative-text" : "positive-text"}>{euro(totals.limit - totals.spent)}</strong></article>
            </div>

            {rows.length === 0 ? (
              <div className="empty-state">Kategooriate eelarvepiire pole veel määratud.</div>
            ) : (
              <div className="category-budget-list">
                {rows.map((row) => (
                  <article className={`category-budget-row ${row.status}`} key={row.category}>
                    <div className="category-budget-heading">
                      <div>
                        <strong>{row.category}</strong>
                        <span>{row.spent > row.limit ? `Üle piiri ${euro(row.spent - row.limit)}` : `Alles ${euro(row.remaining)}`}</span>
                      </div>
                      <div className="category-budget-values"><strong>{euro(row.spent)}</strong><span>/ {euro(row.limit)}</span></div>
                    </div>
                    <div className="category-bar-track"><div className="category-bar-fill" style={{ width: `${Math.min(100, Math.max(2, row.percent))}%` }} /></div>
                    <div className="category-budget-actions">
                      <label>Piir<input type="number" min="0" step="0.01" defaultValue={row.limit} onBlur={(event) => updateBudget(row.category, event.target.value)} /></label>
                      <span>{row.percent.toFixed(0)}%</span>
                      <button className="secondary-button" onClick={() => removeBudget(row.category)}>Eemalda</button>
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
