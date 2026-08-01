import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPin, hasPin, isValidPinFormat, verifyPin } from "./Security";
import { restoreEncryptedVaultToLocalStorage } from "./SecureStorage";
import "./SecurityGate.css";

type Props = { children: ReactNode };

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
