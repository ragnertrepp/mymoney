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

type CategoryRow = {
  category: string;
  amount: number;
  count: number;
  percent: number;
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

export default function CategorySummary() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [revision, setRevision] = useState(0);

  const summary = useMemo(() => {
    const expenses = readTransactions().filter(
      (item) => item.type === "expense" && item.date?.slice(0, 7) === selectedMonth,
    );

    const grouped = new Map<string, { amount: number; count: number }>();
    for (const item of expenses) {
      const category = item.category?.trim() || "Muu";
      const previous = grouped.get(category) ?? { amount: 0, count: 0 };
      grouped.set(category, {
        amount: previous.amount + Number(item.amount || 0),
        count: previous.count + 1,
      });
    }

    const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const rows: CategoryRow[] = Array.from(grouped.entries())
      .map(([category, value]) => ({
        category,
        amount: value.amount,
        count: value.count,
        percent: total > 0 ? (value.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total,
      count: expenses.length,
      rows,
      largest: rows[0],
    };
  }, [selectedMonth, revision]);

  return (
    <>
      <button
        className="secondary-button"
        onClick={() => {
          setRevision((value) => value + 1);
          setOpen(true);
        }}
      >
        Ava kokkuvõte
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="category-summary-panel"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="editor-header">
              <div>
                <p className="eyebrow">Kulude analüüs</p>
                <h2>Kategooriate kokkuvõte</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="month-switcher">
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>←</button>
              <div>
                <strong>{monthLabel(selectedMonth)}</strong>
                {selectedMonth !== currentMonth() && (
                  <button className="month-current-link" onClick={() => setSelectedMonth(currentMonth())}>Praegune kuu</button>
                )}
              </div>
              <button className="secondary-button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>→</button>
            </div>

            <div className="category-summary-cards">
              <article><span>Kulud kokku</span><strong>{euro(summary.total)}</strong></article>
              <article><span>Kulukirjeid</span><strong>{summary.count}</strong></article>
              <article><span>Suurim kategooria</span><strong>{summary.largest?.category ?? "Puudub"}</strong></article>
            </div>

            {summary.rows.length === 0 ? (
              <div className="empty-state">Selles kuus kulusid pole.</div>
            ) : (
              <div className="category-chart" aria-label="Kulud kategooriate kaupa">
                {summary.rows.map((row) => (
                  <article className="category-chart-row" key={row.category}>
                    <div className="category-chart-heading">
                      <div><strong>{row.category}</strong><small>{row.count} kirjet · {row.percent.toFixed(1)}%</small></div>
                      <strong>{euro(row.amount)}</strong>
                    </div>
                    <div className="category-bar-track">
                      <div className="category-bar-fill" style={{ width: `${Math.max(2, row.percent)}%` }} />
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
