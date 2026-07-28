import { useState, type FormEvent } from "react";

const STORAGE_KEY = "rebuildme-mymoney-v2";

type MainData = {
  settings?: {
    startingBalance?: number;
    monthlyReserve?: number;
  };
  [key: string]: unknown;
};

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) as MainData : {};
    return {
      startingBalance: Number(data.settings?.startingBalance ?? 0),
      monthlyReserve: Number(data.settings?.monthlyReserve ?? 100),
    };
  } catch {
    return { startingBalance: 0, monthlyReserve: 100 };
  }
}

export default function BudgetSettingsTool() {
  const [open, setOpen] = useState(false);
  const initial = readSettings();
  const [startingBalance, setStartingBalance] = useState(String(initial.startingBalance));
  const [monthlyReserve, setMonthlyReserve] = useState(String(initial.monthlyReserve));

  function openSettings() {
    const current = readSettings();
    setStartingBalance(String(current.startingBalance));
    setMonthlyReserve(String(current.monthlyReserve));
    setOpen(true);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const balance = Number(startingBalance.replace(",", "."));
    const reserve = Number(monthlyReserve.replace(",", "."));
    if (!Number.isFinite(balance) || !Number.isFinite(reserve) || reserve < 0) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) as MainData : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        settings: {
          ...(data.settings ?? {}),
          startingBalance: balance,
          monthlyReserve: reserve,
        },
      }));
      window.dispatchEvent(new CustomEvent("mymoney-data-changed", { detail: { key: STORAGE_KEY } }));
      setOpen(false);
      window.location.reload();
    } catch {
      alert("Eelarve seadeid ei saanud salvestada.");
    }
  }

  return (
    <>
      <button className="secondary-button" onClick={openSettings}>Ava eelarve seaded</button>
      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section className="editor-panel" role="dialog" aria-modal="true" aria-label="Eelarve seaded" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div><p className="eyebrow">Eelarve</p><h2>Kuu algandmed</h2></div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>
            <form onSubmit={save}>
              <div className="form-grid">
                <label>Algjääk
                  <input type="number" step="0.01" value={startingBalance} onChange={(event) => setStartingBalance(event.target.value)} />
                  <small>Raha, mis oli kuu alguses kasutada.</small>
                </label>
                <label>Turvareserv
                  <input type="number" min="0" step="0.01" value={monthlyReserve} onChange={(event) => setMonthlyReserve(event.target.value)} />
                  <small>Summa, mida rakendus ei arvesta vabalt kasutatavaks.</small>
                </label>
              </div>
              <button className="primary-button" type="submit">Salvesta seaded</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
