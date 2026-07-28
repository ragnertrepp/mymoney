import { lazy, Suspense, useState, type ReactNode } from "react";

const BackupRestore = lazy(() => import("./BackupRestore"));
const BudgetForecast = lazy(() => import("./BudgetForecast"));
const BudgetSettingsTool = lazy(() => import("./BudgetSettingsTool"));
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

type ToolId = "guide" | "settings" | "forecast" | "budgets" | "comparison" | "summary" | "search" | "undo" | "integrity" | "months" | "planned" | "recurring" | "editor" | "backup";
type GroupId = "guide" | "budget" | "analysis" | "data" | "system";

type ToolRowProps = {
  id: ToolId;
  title: string;
  description: string;
  active: ToolId | null;
  onToggle: (id: ToolId) => void;
  children: ReactNode;
};

type GroupProps = {
  id: GroupId;
  icon: string;
  title: string;
  description: string;
  active: GroupId | null;
  onToggle: (id: GroupId) => void;
  children: ReactNode;
};

function LoadingTool() {
  return <div className="v5-tool-loading">Laadin…</div>;
}

function ToolRow({ id, title, description, active, onToggle, children }: ToolRowProps) {
  const isOpen = active === id;
  return (
    <section className={`v5-tool-row ${isOpen ? "is-open" : ""}`}>
      <button className="v5-tool-row-toggle" type="button" onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <span className="v5-chevron" aria-hidden="true">{isOpen ? "⌃" : "›"}</span>
      </button>
      {isOpen && (
        <div className="v5-tool-card-content">
          <Suspense fallback={<LoadingTool />}>{children}</Suspense>
        </div>
      )}
    </section>
  );
}

function ToolGroup({ id, icon, title, description, active, onToggle, children }: GroupProps) {
  const isOpen = active === id;
  return (
    <section className={`v5-tool-group ${isOpen ? "is-open" : ""}`}>
      <button className="v5-tool-group-toggle" type="button" onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <span className="v5-tool-group-icon" aria-hidden="true">{icon}</span>
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <span className="v5-chevron" aria-hidden="true">{isOpen ? "⌄" : "›"}</span>
      </button>
      {isOpen && <div className="v5-tool-group-content">{children}</div>}
    </section>
  );
}

export default function V5Tools() {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupId | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  const toggleGroup = (id: GroupId) => {
    setActiveGroup((current) => current === id ? null : id);
    setActiveTool(null);
  };
  const toggleTool = (id: ToolId) => setActiveTool((current) => current === id ? null : id);
  const close = () => {
    setOpen(false);
    setActiveGroup(null);
    setActiveTool(null);
  };

  return (
    <>
      <button className="v5-manage-button" onClick={() => setOpen(true)}>Halda</button>

      {open && (
        <div className="v5-tools-backdrop" role="presentation" onMouseDown={close}>
          <aside className="v5-tools-drawer" role="dialog" aria-modal="true" aria-label="MyMoney haldus" onMouseDown={(event) => event.stopPropagation()}>
            <header className="v5-tools-header">
              <div><p className="eyebrow">MyMoney V5</p><h2>Halda</h2></div>
              <button className="secondary-button" onClick={close}>Sulge</button>
            </header>

            <p className="v5-tools-intro">Kõik seaded ja tööriistad viies lihtsas jaotises.</p>

            <div className="v5-tools-list">
              <ToolGroup id="guide" icon="📘" title="Kasutusjuhend" description="Kuidas MyMoney täita ja kasutada" active={activeGroup} onToggle={toggleGroup}>
                <ToolRow id="guide" title="README / kasutusjuhend" description="Samm-sammuline juhend" active={activeTool} onToggle={toggleTool}><UserGuide /></ToolRow>
              </ToolGroup>

              <ToolGroup id="budget" icon="💰" title="Eelarve" description="Seaded, piirid, prognoos ja maksed" active={activeGroup} onToggle={toggleGroup}>
                <ToolRow id="settings" title="Eelarve seaded" description="Algjääk ja turvareserv" active={activeTool} onToggle={toggleTool}><BudgetSettingsTool /></ToolRow>
                <ToolRow id="forecast" title="Eelarveprognoos" description="Vaata, kas kuu eelarve püsib rajal" active={activeTool} onToggle={toggleTool}><BudgetForecast /></ToolRow>
                <ToolRow id="budgets" title="Kategooriate piirid" description="Määra kategooriate kuupiirid" active={activeTool} onToggle={toggleTool}><CategoryBudgets /></ToolRow>
                <ToolRow id="planned" title="Planeeritud maksed" description="Jälgi arveid ja tähtaegu" active={activeTool} onToggle={toggleTool}><PlannedPayments /></ToolRow>
                <ToolRow id="recurring" title="Korduvad kirjed" description="Halda palka ja püsikulusid" active={activeTool} onToggle={toggleTool}><RecurringTransactions /></ToolRow>
              </ToolGroup>

              <ToolGroup id="analysis" icon="📊" title="Analüüs" description="Kuud ja kulude jaotus" active={activeGroup} onToggle={toggleGroup}>
                <ToolRow id="comparison" title="Kuude võrdlus" description="Võrdle valitud kuud eelmisega" active={activeTool} onToggle={toggleTool}><MonthComparison /></ToolRow>
                <ToolRow id="summary" title="Kulud kategooriate kaupa" description="Vaata, kuhu raha läheb" active={activeTool} onToggle={toggleTool}><CategorySummary /></ToolRow>
                <ToolRow id="months" title="Kuude ülevaade" description="Vaata varasemaid ja tulevasi kuid" active={activeTool} onToggle={toggleTool}><MonthlyView /></ToolRow>
              </ToolGroup>

              <ToolGroup id="data" icon="🔎" title="Andmed" description="Otsi, muuda ja võta tagasi" active={activeGroup} onToggle={toggleGroup}>
                <ToolRow id="search" title="Otsing ja filtrid" description="Leia vajalikud kirjed kiiresti" active={activeTool} onToggle={toggleTool}><SearchFilter /></ToolRow>
                <ToolRow id="editor" title="Muuda kirjeid" description="Paranda summat, kuupäeva või kategooriat" active={activeTool} onToggle={toggleTool}><TransactionEditor /></ToolRow>
                <ToolRow id="undo" title="Võta tagasi" description="Taasta viimane muudatus" active={activeTool} onToggle={toggleTool}><UndoManagerTool /></ToolRow>
              </ToolGroup>

              <ToolGroup id="system" icon="⚙️" title="Süsteem" description="Kontroll ja varukoopia" active={activeGroup} onToggle={toggleGroup}>
                <ToolRow id="integrity" title="Andmete kontroll" description="Leia vigased või katkised kirjed" active={activeTool} onToggle={toggleTool}><DataIntegrityTool /></ToolRow>
                <ToolRow id="backup" title="Varukoopia" description="Salvesta või taasta kõik andmed" active={activeTool} onToggle={toggleTool}><BackupRestore /></ToolRow>
              </ToolGroup>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
