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
              <article><span>1</span><div><strong>Seadista kuu algjääk ja reserv</strong><p>Ava Eelarve → Seaded. Algjääk on raha, mis sul kuu alguses päriselt kasutada oli. Turvareserv on summa, mida sa ei taha tavakuludeks puutuda.</p></div></article>
              <article><span>2</span><div><strong>Lisa kõik tulud ja kulud</strong><p>Ava Eelarve → Lisa tulu/kulu. Pane kirjele õige kuupäev ja kategooria, sest ülevaated ja prognoosid arvutatakse nende järgi.</p></div></article>
              <article><span>3</span><div><strong>Lisa enda võlad</strong><p>Ava Võlad ja sisesta võlausaldaja, jääk, minimaalne kuumakse, intress, järgmine tähtaeg ja prioriteet. Kui maksad, kasuta nuppu „Märgi makse“.</p></div></article>
              <article><span>4</span><div><strong>Lisa raha, mis teised sulle võlgnevad</strong><p>Võlgade vaates on eraldi „Mulle võlgu“ osa. Sisesta inimene või ettevõte, summa ja kokkulepitud maksekuupäev.</p></div></article>
              <article><span>5</span><div><strong>Lisa tulevased arved</strong><p>Halda → Planeeritud maksed. Nii arvestab MyMoney teadaolevate tulevaste kohustustega enne, kui näitab palju raha on turvaliselt kasutada.</p></div></article>
              <article><span>6</span><div><strong>Määra kategooriate piirid</strong><p>Halda → Kategooriate eelarvepiirid. Näiteks Toit 400 €, Transport 200 €. Täna vaade hoiatab 80% juures ja näitab ületusi.</p></div></article>
              <article><span>7</span><div><strong>Vaata iga päev „Täna“ vaadet</strong><p>Seal näed kuu tulemust, lähenevaid makseid, eelarvehoiatusi ja olulisi tähtaegu. „Turvaliselt kasutada“ on parem orientiir kui ainult kontojääk.</p></div></article>
              <article><span>8</span><div><strong>Tee varukoopia</strong><p>Kasuta üleval „Täielik varukoopia“ või Halda → Varukoopia. See salvestab MyMoney andmed JSON-failina.</p></div></article>
            </div>

            <div className="guide-note">
              <strong>Hea rusikareegel</strong>
              <p>Sisesta andmed võimalikult kohe pärast tehingut. Mida täpsemad on kuupäevad, kategooriad ja tulevased maksed, seda täpsemad on prognoosid.</p>
            </div>

            <button className="primary-button guide-finish" onClick={closeGuide}>{mode === "first-run" ? "Sain aru, alusta MyMoneyga" : "Sulge juhend"}</button>
          </section>
        </div>
      )}
    </>
  );
}
