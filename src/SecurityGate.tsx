import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPin, hasPin, isValidPinFormat, verifyPin } from "./Security";
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (!configured) {
      if (!isValidPinFormat(pin)) {
        setError("PIN peab olema 6–12 numbrit.");
        return;
      }
      if (pin !== confirmPin) {
        setError("PIN-koodid ei ühti.");
        return;
      }
      setBusy(true);
      try {
        await createPin(pin);
        setConfigured(true);
        setUnlocked(true);
        setPin("");
        setConfirmPin("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "PIN-i salvestamine ebaõnnestus.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    const valid = await verifyPin(pin);
    setBusy(false);
    if (!valid) {
      setPin("");
      setError("Vale PIN-kood.");
      return;
    }
    setUnlocked(true);
    setPin("");
  }

  if (!ready) return null;
  if (configured && unlocked) return <>{children}</>;

  return (
    <main className="security-gate">
      <section className="security-card" aria-labelledby="security-title">
        <p className="eyebrow">MyMoney turvalukk</p>
        <h1 id="security-title">{configured ? "Sisesta PIN" : "Loo MyMoney PIN"}</h1>
        <p>
          {configured
            ? "MyMoney sisu on lukustatud. Sisesta oma PIN-kood."
            : "PIN-koodi küsitakse rakenduse avamisel ning sama PIN krüpteerib sinu uued varukoopiad."}
        </p>
        <form onSubmit={submit} className="security-form">
          <label>
            PIN-kood
            <input
              autoFocus
              inputMode="numeric"
              autoComplete={configured ? "current-password" : "new-password"}
              pattern="[0-9]*"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="6–12 numbrit"
            />
          </label>
          {!configured && (
            <label>
              PIN uuesti
              <input
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]*"
                type="password"
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="Korda PIN-koodi"
              />
            </label>
          )}
          {error && <div className="security-error" role="alert">{error}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Kontrollin…" : configured ? "Ava MyMoney" : "Salvesta PIN ja ava"}
          </button>
        </form>
        <small>PIN-i ennast ei salvestata loetaval kujul. Kui PIN ununeb, ei saa krüpteeritud varukoopiat avada.</small>
      </section>
    </main>
  );
}
