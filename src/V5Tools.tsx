import { useState } from "react";
import BackupRestore from "./BackupRestore";
import { DataIntegrityTool } from "./DataIntegrity";
import MonthlyView from "./MonthlyView";
import PlannedPayments from "./PlannedPayments";
import RecurringTransactions from "./RecurringTransactions";
import TransactionEditor from "./TransactionEditor";
import { UndoManagerTool } from "./UndoManager";

export default function V5Tools() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="v5-manage-button" onClick={() => setOpen(true)}>
        Halda
      </button>

      {open && (
        <div className="v5-tools-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <aside className="v5-tools-drawer" role="dialog" aria-modal="true" aria-label="MyMoney haldus" onMouseDown={(event) => event.stopPropagation()}>
            <header className="v5-tools-header">
              <div>
                <p className="eyebrow">MyMoney V5</p>
                <h2>Haldus</h2>
              </div>
              <button className="secondary-button" onClick={() => setOpen(false)}>Sulge</button>
            </header>

            <p className="v5-tools-intro">
              Kõik lisatööriistad on nüüd ühes kohas. Ava vajalik osa ja tee muudatused.
            </p>

            <div className="v5-tools-list">
              <section className="v5-tool-card">
                <div><strong>Võta tagasi</strong><span>Taasta viimane tulu-, kulu-, makse- või püsikirje muudatus.</span></div>
                <UndoManagerTool />
              </section>

              <section className="v5-tool-card">
                <div><strong>Andmete kontroll</strong><span>Leia vigased summad, kuupäevad ja katkised kirjed.</span></div>
                <DataIntegrityTool />
              </section>

              <section className="v5-tool-card">
                <div><strong>Kuude ülevaade</strong><span>Vaata varasemaid ja tulevasi kuid.</span></div>
                <MonthlyView />
              </section>

              <section className="v5-tool-card">
                <div><strong>Planeeritud maksed</strong><span>Jälgi tähtaegu, makstud ja hilinenud arveid.</span></div>
                <PlannedPayments />
              </section>

              <section className="v5-tool-card">
                <div><strong>Korduvad kirjed</strong><span>Halda palka, üüri ja muid püsikulusid.</span></div>
                <RecurringTransactions />
              </section>

              <section className="v5-tool-card">
                <div><strong>Muuda kirjeid</strong><span>Paranda summat, kuupäeva või kategooriat.</span></div>
                <TransactionEditor />
              </section>

              <section className="v5-tool-card">
                <div><strong>Varukoopia</strong><span>Salvesta või taasta kõik MyMoney andmed.</span></div>
                <BackupRestore />
              </section>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
