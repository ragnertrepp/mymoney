import { useEffect, useState } from "react";

const GUIDE_SEEN_KEY = "rebuildme-mymoney-guide-seen-v1";

type UserGuideProps = {
  mode?: "first-run" | "tool";
};

export default function UserGuide({ mode = "tool" }: UserGuideProps) {
  const [open, setOpen] = useState(mode === "first-run" && localStorage.getItem(GUIDE_SEEN_KEY) !== "1");

  useEffect(() => {
    if (mode === "first-run" && localStorage.getItem(GUIDE_SEEN_KEY) !== "1") setOpen(true);
  }, [mode]);

  function closeGuide() {
    if (mode === "first-run") localStorage.setItem(GUIDE_SEEN_KEY, "1");
    setOpen(false);
  }

  return (
    <>
      {mode === "tool" && <button className="secondary-button" onClick={() => setOpen(true)}>Ava kasutusjuhend</button>}

      {open && (
        <div className="editor-backdrop" role="presentation" onMouseDown={closeGuide}>
          <section className="user-guide-panel" role="dialog" aria-modal="true" aria-label="MyMoney kasutusjuhend" onMouseDown={(event) => event.stopPropagation()}>
            <header className="editor-header">
              <div>
                <p className="eyebrow">MyMoney kasutusjuhend</p>
                <h2>{mode === "first-run" ? "Alustame õigesti" : "Kuidas MyMoneyt kasutada"}</h2>
              </div>
              <button className="secondary-button" onClick={closeGuide}>Sulge</button>
            </header>

            <div className="user-guide-steps">
              <article><span>1</span><div><strong>Info – igapäevane vaade</strong><p>Info on peamine koht, kus vaatad tänast seisu. Overview näitab saldot, tänaseid tulusid ja kulusid ning turvaliselt kasutatavat summat. Tänase kulu või tulu saad lisada kiire sisestusega.</p></div></article>
              <article><span>2</span><div><strong>Budget – kuu eelarve</strong><p>Info → Budget all näed kuu tulusid, kulusid, võlamakseid ja turvaliselt kasutatavat summat. Algjääk ja turvareserv on eelarve põhiseaded.</p></div></article>
              <article><span>3</span><div><strong>Can I buy it?</strong><p>Info → Can I buy it? all sisesta ainult ostu hind. MyMoney arvutab olemasoleva eelarve järgi, kas ost mahub turvalisse eelarvesse ja palju pärast ostu alles jääb.</p></div></article>
              <article><span>4</span><div><strong>Loans – Cash Out</strong><p>Loans → Cash Out tähendab raha, mida sina oled teistele võlgu. Lisa võlausaldaja, jääk, kuumakse ja tähtaeg. Võlamaksed vähendavad võlajääki ja lähevad eelarves kuluna arvesse.</p></div></article>
              <article><span>5</span><div><strong>Loans – Cash In</strong><p>Loans → Cash In tähendab raha, mida teised sulle võlgnevad. Lisa inimene või ettevõte, summa ja kokkulepitud maksekuupäev.</p></div></article>
              <article><span>6</span><div><strong>Calendar ja To-Do</strong><p>Calendar koondab tähtajad ühte kohta. Calendar → To-Do all saad lisada ülesandeid ja märkida need tehtuks.</p></div></article>
              <article><span>7</span><div><strong>Notes</strong><p>Notes on vabade märkmete jaoks: kokkulepped, raha puudutavad märkused, meeldetuletused või muu info, mida tahad MyMoney sees hoida.</p></div></article>
              <article><span>8</span><div><strong>Halda</strong><p>Halda jääb süsteemi ja seadete kohaks. Seal on kasutusjuhend, eelarve seaded, prognoos, kategooriate piirid, planeeritud ja korduvad maksed, analüüs, otsing, kirjete muutmine, andmekontroll ning varukoopia.</p></div></article>
              <article><span>9</span><div><strong>Varukoopia</strong><p>Tee regulaarselt varukoopia. Halda → Süsteem → Varukoopia kaudu saad andmed salvestada või taastada.</p></div></article>
            </div>

            <div className="guide-note">
              <strong>Lihtsaim kasutusviis</strong>
              <p>Lisa kulu või tulu kohe pärast tehingut. Igapäevaselt piisab enamasti Info → Overview vaatest; muud menüüd ava ainult siis, kui vajad detailsemat eelarvet, võlgu, kalendrit, märkmeid või seadeid.</p>
            </div>

            <button className="primary-button guide-finish" onClick={closeGuide}>{mode === "first-run" ? "Sain aru, alusta MyMoneyga" : "Sulge juhend"}</button>
          </section>
        </div>
      )}
    </>
  );
}
