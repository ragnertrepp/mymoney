import { useMemo, useState } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";

type Transaction = {
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: string;
};

type ForecastStatus = "good" | "warning" | "danger";

type ForecastRow = {
  category: string;
  limit: number;
  spent: number;
  forecast: number;
  forecastDifference: number;
  status: ForecastStatus;
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

function daysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function elapsedDays(monthKey: string) {
  const today = new Date();
  if (monthKey !== currentMonth()) return daysInMonth(monthKey);
  return Math.max(1, today.getDate());
}

export default function BudgetForecast() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [revision, setRevision] = useState(0);

  const result = useMemo(() => {
    const data = readJson<{ transactions?: Transaction[] }>(STORAGE_KEY, {});
    const budgets = readJson<Record<string, number>>(BUDGET_KEY, {});
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const monthDays = daysInMonth(selectedMonth);
    const passedDays = elapsedDays(selectedMonth);

    const rows: ForecastRow[] = Object.entries(budgets)
      .map(([category, limit]): ForecastRow => {
        const spent = transactions
          .filter((item) => item.type === "expense" && item.date?.slice(0, 7) === selectedMonth && (item.category?.trim() || "Muu") === category)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const forecast = selectedMonth === currentMonth()
          ? (spent / passedDays) * monthDays
          : spent;
        const forecastDifference = forecast - limit;
        const ratio = limit > 0 ? forecast / limit : 0;
        const status: ForecastStatus = ratio > 1 ? "danger" : ratio >= 0.9 ? "warning" : "good";

        return {
          category,
          limit,
          spent,
          forecast,
          forecastDifference,
          status,
        };
      })
      .sort((a, b) => b.forecastDifference - a.forecastDifference);

    const totalLimit = rows.reduce((sum, row) => sum + row.limit, 0);
    const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
    const totalForecast = rows.reduce((sum, row) => sum + row.forecast, 0);

    return { rows, totalLimit, totalSpent, totalForecast, monthDays, passedDays };
  }, [selectedMonth, revision]);

  return (
    <>
      <button className="secondary-button" onClick={() => { setRevision((value) => value + 1); setOpen(true); }}>
        Ava prognoos
      </button>

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="budget-forecast-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">Kulutempo</p>
                <h2>Kuu eelarveprognoos</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <div className="budget-forecast-controls">
              <label>Kuu<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>
              <span>{selectedMonth === currentMonth() ? `Arvutus ${result.passedDays}/${result.monthDays} päeva põhjal` : "Lõppenud kuu tegelik tulemus"}</span>
            </div>

            <div className="comparison-summary-grid">
              <article><span>Eelarved kokku</span><strong>{euro(result.totalLimit)}</strong></article>
              <article><span>Praegu kulutatud</span><strong>{euro(result.totalSpent)}</strong></article>
              <article><span>Kuu prognoos</span><strong className={result.totalForecast > result.totalLimit ? "negative-text" : "positive-text"}>{euro(result.totalForecast)}</strong></article>
            </div>

            {result.rows.length === 0 ? (
              <div className="empty-state">Prognoosi jaoks määra esmalt kategooriate eelarvepiirid.</div>
            ) : (
              <div className="budget-forecast-list">
                {result.rows.map((row) => (
                  <article className={`budget-forecast-row ${row.status}`} key={row.category}>
                    <div className="budget-forecast-heading">
                      <div>
                        <strong>{row.category}</strong>
                        <span>{row.status === "danger" ? `Prognoos ületab piiri ${euro(row.forecastDifference)}` : row.status === "warning" ? "Piiri lähedal" : `Prognoositav varu ${euro(Math.abs(row.forecastDifference))}`}</span>
                      </div>
                      <strong>{euro(row.forecast)}</strong>
                    </div>
                    <div className="budget-forecast-values">
                      <span>Kulutatud {euro(row.spent)}</span>
                      <span>Piir {euro(row.limit)}</span>
                    </div>
                    <div className="category-bar-track">
                      <div className="category-bar-fill" style={{ width: `${Math.min(100, Math.max(2, (row.forecast / row.limit) * 100))}%` }} />
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
