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

type CategoryComparison = {
  category: string;
  current: number;
  previous: number;
  difference: number;
  percentChange: number | null;
};

function readTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { transactions?: Transaction[] };
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    return [];
  }
}

const euro = (value: number) =>
  new Intl.NumberFormat("et-EE", { style: "currency", currency: "EUR" }).format(value);

const currentMonth = () => new Date().toISOString().slice(0, 7);

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

function groupExpenses(transactions: Transaction[], month: string) {
  const grouped = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "expense" || item.date?.slice(0, 7) !== month) continue;
    const category = item.category?.trim() || "Muu";
    grouped.set(category, (grouped.get(category) ?? 0) + Number(item.amount || 0));
  }
  return grouped;
}

export default function MonthComparison() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [revision, setRevision] = useState(0);

  const comparison = useMemo(() => {
    const transactions = readTransactions();
    const previousMonth = shiftMonth(selectedMonth, -1);
    const currentByCategory = groupExpenses(transactions, selectedMonth);
    const previousByCategory = groupExpenses(transactions, previousMonth);
    const categories = Array.from(new Set([...currentByCategory.keys(), ...previousByCategory.keys()]));

    const rows: CategoryComparison[] = categories
      .map((category) => {
        const current = currentByCategory.get(category) ?? 0;
        const previous = previousByCategory.get(category) ?? 0;
        const difference = current - previous;
        return {
          category,
          current,
          previous,
          difference,
          percentChange: previous > 0 ? (difference / previous) * 100 : current > 0 ? null : 0,
        };
      })
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    const currentTotal = rows.reduce((sum, row) => sum + row.current, 0);
    const previousTotal = rows.reduce((sum, row) => sum + row.previous, 0);
    const difference = currentTotal - previousTotal;
    const percentChange = previousTotal > 0 ? (difference / previousTotal) * 100 : null;

    return {
      previousMonth,
      rows,
      currentTotal,
      previousTotal,
      difference,
      percentChange,
      biggestIncrease: rows.filter((row) => row.difference > 0)[0],
      biggestDecrease: rows.filter((row) => row.difference < 0)[0],
    };
  }, [selectedMonth, revision]);

  return (
    <>
      <button className="secondary-button" onClick={() => { setRevision((value) => value + 1); setOpen(true); }}>
        Võrdle kuid
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="month-comparison-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Kulude muutus</p>
                <h2>Kuude võrdlus</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="month-switcher">
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>←</button>
              <div>
                <strong>{monthLabel(selectedMonth)}</strong>
                <small>võrdlus: {monthLabel(comparison.previousMonth)}</small>
              </div>
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>→</button>
            </div>

            <div className="comparison-summary-grid">
              <article><span>Valitud kuu kulud</span><strong>{euro(comparison.currentTotal)}</strong></article>
              <article><span>Eelmise kuu kulud</span><strong>{euro(comparison.previousTotal)}</strong></article>
              <article>
                <span>Muutus</span>
                <strong className={comparison.difference > 0 ? "negative-text" : comparison.difference < 0 ? "positive-text" : ""}>
                  {comparison.difference > 0 ? "+" : ""}{euro(comparison.difference)}
                </strong>
                <small>{comparison.percentChange === null ? "Eelmisel kuul kulusid polnud" : `${comparison.percentChange > 0 ? "+" : ""}${comparison.percentChange.toFixed(1)}%`}</small>
              </article>
            </div>

            {comparison.rows.length === 0 ? (
              <div className="empty-state">Nendes kuudes kulusid pole.</div>
            ) : (
              <div className="comparison-list">
                {comparison.rows.map((row) => {
                  const max = Math.max(row.current, row.previous, 1);
                  return (
                    <article className="comparison-row" key={row.category}>
                      <div className="comparison-row-heading">
                        <div><strong>{row.category}</strong><small>{row.percentChange === null ? "Uus kulu" : `${row.percentChange > 0 ? "+" : ""}${row.percentChange.toFixed(1)}%`}</small></div>
                        <strong className={row.difference > 0 ? "negative-text" : row.difference < 0 ? "positive-text" : ""}>
                          {row.difference > 0 ? "+" : ""}{euro(row.difference)}
                        </strong>
                      </div>
                      <div className="comparison-bars">
                        <div><span>{monthLabel(comparison.previousMonth)}</span><div className="comparison-track"><div className="comparison-fill previous" style={{ width: `${(row.previous / max) * 100}%` }} /></div><strong>{euro(row.previous)}</strong></div>
                        <div><span>{monthLabel(selectedMonth)}</span><div className="comparison-track"><div className="comparison-fill current" style={{ width: `${(row.current / max) * 100}%` }} /></div><strong>{euro(row.current)}</strong></div>
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
