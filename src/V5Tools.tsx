import { lazy, Suspense, useState } from "react";

const BackupRestore = lazy(() => import("./BackupRestore"));
const BudgetForecast = lazy(() => import("./BudgetForecast"));
const CategoryBudgets = lazy(() => import("./CategoryBudgets"));
const CategorySummary = lazy(() => import("./CategorySummary"));
const MonthlyView = lazy(() => import("./MonthlyView"));
const MonthComparison = lazy(() => import("./MonthComparison"));
const PlannedPayments = lazy(() => import("./PlannedPayments"));
const RecurringTransactions = lazy(() => import("./RecurringTransactions"));
const SearchFilter = lazy(() => import("./SearchFilter"));
const TransactionEditor = lazy(() => import("./TransactionEditor"));
const DataIntegrityTool = lazy(() => import("./DataIntegrity").then((module) => ({ default: module.DataIntegrityTool })));
const UndoManagerTool = lazy(() => import("./UndoManager").then((module) => ({ default: module.UndoManagerTool })));

function LoadingTool() {
  return <div className="v5-tool-loading">Laadin…</div>;
}

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

            <Suspense fallback={<LoadingTool />}>
              <div className="v5-tools-list">
                <section className="v5-tool-card">
                  <div><strong>Eelarveprognoos</strong><span>Vaata kulutempo põhjal, millised kategooriad võivad kuu lõpuks piiri ületada.</span></div>
                  <BudgetForecast />
                </section>

                <section className="v5-tool-card">
                  <div><strong>Kategooriate eelarvepiirid</strong><span>Määra toidu, transpordi ja muude kategooriate kuupiirid.</span></div>
                  <CategoryBudgets />
                </section>

                <section className="v5-tool-card">
                  <div><strong>Kuude võrdlus</strong><span>Võrdle kategooriate kulusid valitud kuu ja eelmise kuu vahel.</span></div>
                  <MonthComparison />
                </section>

                <section className="v5-tool-card">
                  <div><strong>Kulud kategooriate kaupa</strong><span>Vaata valitud kuu kulude jaotust ja suurimaid kategooriaid.</span></div>
                  <CategorySummary />
                </section>

                <section className="v5-tool-card">
                  <div><strong>Otsing ja filtrid</strong><span>Leia kirjeid nime, kategooria, kuu, tüübi või summa järgi.</span></div>
                  <SearchFilter />
                </section>

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
            </Suspense>
          </aside>
        </div>
      )}
    </>
  );
}
