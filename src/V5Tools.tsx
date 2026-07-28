import { lazy, Suspense, useState, type ReactNode } from "react";

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
const UserGuide = lazy(() => import("./UserGuide"));
const DataIntegrityTool = lazy(() => import("./DataIntegrity").then((module) => ({ default: module.DataIntegrityTool })));
const UndoManagerTool = lazy(() => import("./UndoManager").then((module) => ({ default: module.UndoManagerTool })));

type ToolId = "guide" | "forecast" | "budgets" | "comparison" | "summary" | "search" | "undo" | "integrity" | "months" | "planned" | "recurring" | "editor" | "backup";

type ToolCardProps = {
  id: ToolId;
  title: string;
  description: string;
  active: ToolId | null;
  onToggle: (id: ToolId) => void;
  children: ReactNode;
};

function LoadingTool() {
  return <div className="v5-tool-loading">Laadin…</div>;
}

function ToolCard({ id, title, description, active, onToggle, children }: ToolCardProps) {
  const isOpen = active === id;
  return (
    <section className={`v5-tool-card ${isOpen ? "is-open" : ""}`}>
      <button className="v5-tool-card-toggle" type="button" onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <div><strong>{title}</strong><span>{description}</span></div>
        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="v5-tool-card-content"><Suspense fallback={<LoadingTool />}>{children}</Suspense></div>}
    </section>
  );
}

export default function V5Tools() {
  const [open, setOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  const toggleTool = (id: ToolId) => setActiveTool((current) => current === id ? null : id);
  const close = () => { setOpen(false); setActiveTool(null); };

  return (
    <>
      <button className="v5-manage-button" onClick={() => setOpen(true)}>Halda</button>

      {open && (
        <div className="v5-tools-backdrop" role="presentation" onMouseDown={close}>
          <aside className="v5-tools-drawer" role="dialog" aria-modal="true" aria-label="MyMoney haldus" onMouseDown={(event) => event.stopPropagation()}>
            <header className="v5-tools-header">
              <div><p className="eyebrow">MyMoney V5</p><h2>Haldus</h2></div>
              <button className="secondary-button" onClick={close}>Sulge</button>
            </header>

            <p className="v5-tools-intro">Ava ainult vajalik tööriist. Nii püsib rakendus telefonis kiirem.</p>

            <div className="v5-tools-list">
              <ToolCard id="guide" title="README / kasutusjuhend" description="Vaata samm-sammult, kuidas MyMoney õigesti täita ja kasutada." active={activeTool} onToggle={toggleTool}><UserGuide /></ToolCard>
              <ToolCard id="forecast" title="Eelarveprognoos" description="Vaata, millised kategooriad võivad kuu lõpuks piiri ületada." active={activeTool} onToggle={toggleTool}><BudgetForecast /></ToolCard>
              <ToolCard id="budgets" title="Kategooriate eelarvepiirid" description="Määra toidu, transpordi ja muude kategooriate kuupiirid." active={activeTool} onToggle={toggleTool}><CategoryBudgets /></ToolCard>
              <ToolCard id="comparison" title="Kuude võrdlus" description="Võrdle valitud kuu kulusid eelmise kuuga." active={activeTool} onToggle={toggleTool}><MonthComparison /></ToolCard>
              <ToolCard id="summary" title="Kulud kategooriate kaupa" description="Vaata kuu kulude jaotust ja suurimaid kategooriaid." active={activeTool} onToggle={toggleTool}><CategorySummary /></ToolCard>
              <ToolCard id="search" title="Otsing ja filtrid" description="Leia kirjeid nime, kategooria, kuu, tüübi või summa järgi." active={activeTool} onToggle={toggleTool}><SearchFilter /></ToolCard>
              <ToolCard id="undo" title="Võta tagasi" description="Taasta viimane tulu-, kulu-, makse- või püsikirje muudatus." active={activeTool} onToggle={toggleTool}><UndoManagerTool /></ToolCard>
              <ToolCard id="integrity" title="Andmete kontroll" description="Kontrolli andmeid ainult siis, kui seda vajad." active={activeTool} onToggle={toggleTool}><DataIntegrityTool /></ToolCard>
              <ToolCard id="months" title="Kuude ülevaade" description="Vaata varasemaid ja tulevasi kuid." active={activeTool} onToggle={toggleTool}><MonthlyView /></ToolCard>
              <ToolCard id="planned" title="Planeeritud maksed" description="Jälgi tähtaegu, makstud ja hilinenud arveid." active={activeTool} onToggle={toggleTool}><PlannedPayments /></ToolCard>
              <ToolCard id="recurring" title="Korduvad kirjed" description="Halda palka, üüri ja muid püsikulusid." active={activeTool} onToggle={toggleTool}><RecurringTransactions /></ToolCard>
              <ToolCard id="editor" title="Muuda kirjeid" description="Paranda summat, kuupäeva või kategooriat." active={activeTool} onToggle={toggleTool}><TransactionEditor /></ToolCard>
              <ToolCard id="backup" title="Varukoopia" description="Salvesta või taasta kõik MyMoney andmed." active={activeTool} onToggle={toggleTool}><BackupRestore /></ToolCard>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
