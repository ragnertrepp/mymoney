import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPin, hasPin, isValidPinFormat, verifyPin } from "./Security";
import { restoreEncryptedVaultToLocalStorage } from "./SecureStorage";
import "./SecurityGate.css";

type Props = { children: ReactNode };

const APP_DATA_KEYS = ["rebuildme-mymoney-v2", "rebuildme-mymoney-v1"];

function safeDate(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function repairStoredAppData() {
  for (const key of APP_DATA_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;

      const data = parsed as Record<string, unknown>;

      if (Array.isArray(data.transactions)) {
        data.transactions = data.transactions
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
          .map((item, index) => ({
            ...item,
            id: typeof item.id === "string" && item.id ? item.id : `repaired-transaction-${index}-${Date.now()}`,
            name: typeof item.name === "string" ? item.name : "Entry",
            amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
            type: item.type === "income" ? "income" : "expense",
            date: safeDate(item.date),
            category: typeof item.category === "string" ? item.category : "Other",
          }));
      }

      if (Array.isArray(data.debts)) {
        data.debts = data.debts
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
          .map((item, index) => ({
            ...item,
            id: typeof item.id === "string" && item.id ? item.id : `repaired-debt-${index}-${Date.now()}`,
            name: typeof item.name === "string" ? item.name : "Debt",
            balance: Number.isFinite(Number(item.balance)) ? Number(item.balance) : 0,
            minimumPayment: Number.isFinite(Number(item.minimumPayment)) ? Number(item.minimumPayment) : 0,
            interest: Number.isFinite(Number(item.interest)) ? Number(item.interest) : 0,
            dueDate: safeDate(item.dueDate ?? item.date),
            priority: Number.isFinite(Number(item.priority)) ? Math.max(1, Number(item.priority)) : 1,
          }));
      }

      if (Array.isArray(data.debtPayments)) {
        data.debtPayments = data.debtPayments
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
          .map((item, index) => ({
            ...item,
            id: typeof item.id === "string" && item.id ? item.id : `repaired-payment-${index}-${Date.now()}`,
            debtId: typeof item.debtId === "string" ? item.debtId : "",
            debtName: typeof item.debtName === "string" ? item.debtName : "Debt",
            amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
            date: safeDate(item.date),
          }));
      }

      if (Array.isArray(data.tasks)) {
        data.tasks = data.tasks
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
          .map((item, index) => ({
            ...item,
            id: typeof item.id === "string" && item.id ? item.id : `repaired-task-${index}-${Date.now()}`,
            title: typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : "Task",
            date: safeDate(item.date ?? item.dueDate),
            completed: Boolean(item.completed),
            linkedAmount: item.linkedAmount == null || !Number.isFinite(Number(item.linkedAmount)) ? undefined : Number(item.linkedAmount),
          }));
      }

      if (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
        data.settings = { startingBalance: 0, monthlyReserve: 100 };
      } else {
        const settings = data.settings as Record<string, unknown>;
        data.settings = {
          ...settings,
          startingBalance: Number.isFinite(Number(settings.startingBalance)) ? Number(settings.startingBalance) : 0,
          monthlyReserve: Number.isFinite(Number(settings.monthlyReserve)) ? Number(settings.monthlyReserve) : 100,
        };
      }

      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Keep unreadable legacy data untouched; the app's own fallback will handle it.
    }
  }
}

export default function SecurityGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConfigured(hasPin());
    setUnlocked(false);
    setReady(true);
  }, []);

  async function unlockStorage(value: string) {
    await restoreEncryptedVaultToLocalStorage(value);
    repairStoredAppData();
    setUnlocked(true);
    setPin("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (!configured) {
      if (!isValidPinFormat(pin)) {
        setError("PIN must contain 6–12 digits.");
        return;
      }
      if (pin !== confirmPin) {
        setError("PIN codes do not match.");
        return;
      }
      setBusy(true);
      try {
        await createPin(pin);
        await unlockStorage(pin);
        setConfigured(true);
        setConfirmPin("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not open MyMoney.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const valid = await verifyPin(pin);
      if (!valid) {
        setPin("");
        setError("Incorrect PIN.");
        return;
      }
      await unlockStorage(pin);
    } catch {
      setError("Stored data could not be recovered. Check your PIN and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (configured && unlocked) return <>{children}</>;

  return (
    <main className="security-gate">
      <section className="security-card" aria-labelledby="security-title">
        <p className="eyebrow">MyMoney security</p>
        <h1 id="security-title">{configured ? "Enter PIN" : "Create MyMoney PIN"}</h1>
        <p>{configured ? "MyMoney is locked. Enter your PIN." : "Your PIN protects MyMoney and encrypts backups."}</p>
        <form onSubmit={submit} className="security-form">
          <label>PIN<input autoFocus inputMode="numeric" autoComplete={configured ? "current-password" : "new-password"} pattern="[0-9]*" type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="6–12 digits" /></label>
          {!configured && <label>Repeat PIN<input inputMode="numeric" autoComplete="new-password" pattern="[0-9]*" type="password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="Repeat PIN" /></label>}
          {error && <div className="security-error" role="alert">{error}</div>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Opening…" : configured ? "Open MyMoney" : "Save PIN and open"}</button>
        </form>
        <small>The PIN itself is not stored in readable form.</small>
      </section>
    </main>
  );
}
