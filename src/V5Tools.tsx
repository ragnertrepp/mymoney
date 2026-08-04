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
const DataIntegrityTool = lazy(() => import("./DataIntegrity").then(module => ({ default: module.DataIntegrityTool })));
const UndoManagerTool = lazy(() => import("./UndoManager").then(module => ({ default: module.UndoManagerTool })));

type ToolId = "guide"|"settings"|"forecast"|"budgets"|"comparison"|"summary"|"search"|"undo"|"integrity"|"months"|"planned"|"recurring"|"editor"|"backup";
type GroupId = "guide"|"budget"|"analysis"|"data"|"system";
type ToolRowProps={id:ToolId;title:string;description:string;active:ToolId|null;onToggle:(id:ToolId)=>void;children:ReactNode};
type GroupProps={id:GroupId;icon:string;title:string;description:string;active:GroupId|null;onToggle:(id:GroupId)=>void;children:ReactNode};

function LoadingTool(){ return <div className="v5-tool-loading">Loading…</div>; }
function ToolRow({id,title,description,active,onToggle,children}:ToolRowProps){
  const isOpen=active===id;
  return <section className={`v5-tool-row ${isOpen?"is-open":""}`}>
    <button className="v5-tool-row-toggle" type="button" onClick={()=>onToggle(id)} aria-expanded={isOpen}>
      <div><strong>{title}</strong><span>{description}</span></div><span className="v5-chevron" aria-hidden="true">{isOpen?"⌃":"›"}</span>
    </button>
    {isOpen&&<div className="v5-tool-card-content"><Suspense fallback={<LoadingTool/>}>{children}</Suspense></div>}
  </section>;
}
function ToolGroup({id,icon,title,description,active,onToggle,children}:GroupProps){
  const isOpen=active===id;
  return <section className={`v5-tool-group ${isOpen?"is-open":""}`}>
    <button className="v5-tool-group-toggle" type="button" onClick={()=>onToggle(id)} aria-expanded={isOpen}>
      <span className="v5-tool-group-icon" aria-hidden="true">{icon}</span><div><strong>{title}</strong><span>{description}</span></div><span className="v5-chevron" aria-hidden="true">{isOpen?"⌄":"›"}</span>
    </button>
    {isOpen&&<div className="v5-tool-group-content">{children}</div>}
  </section>;
}

export default function V5Tools(){
  const [open,setOpen]=useState(false);
  const [activeGroup,setActiveGroup]=useState<GroupId|null>(null);
  const [activeTool,setActiveTool]=useState<ToolId|null>(null);
  const toggleGroup=(id:GroupId)=>{setActiveGroup(current=>current===id?null:id);setActiveTool(null);};
  const toggleTool=(id:ToolId)=>setActiveTool(current=>current===id?null:id);
  const close=()=>{setOpen(false);setActiveGroup(null);setActiveTool(null);};
  return <>
    <button className="v5-manage-button" type="button" aria-label="Open Settings" title="Settings" onClick={()=>setOpen(true)}>⚙</button>
    {open&&<div className="v5-tools-backdrop" role="presentation" onMouseDown={close}>
      <aside className="v5-tools-drawer" role="dialog" aria-modal="true" aria-label="MyMoney Settings" onMouseDown={event=>event.stopPropagation()}>
        <header className="v5-tools-header"><div><p className="eyebrow">MyMoney</p><h2>Settings</h2></div><button className="secondary-button" onClick={close}>Close</button></header>
        <p className="v5-tools-intro">Budget settings, data tools, encrypted backup and the user guide.</p>
        <div className="v5-tools-list">
          <ToolGroup id="guide" icon="📘" title="User guide" description="How to set up and use MyMoney" active={activeGroup} onToggle={toggleGroup}>
            <ToolRow id="guide" title="README / user guide" description="Step-by-step instructions" active={activeTool} onToggle={toggleTool}><UserGuide/></ToolRow>
          </ToolGroup>
          <ToolGroup id="budget" icon="💰" title="Budget" description="Balance, reserve, limits and planned payments" active={activeGroup} onToggle={toggleGroup}>
            <ToolRow id="settings" title="Budget settings" description="Starting balance and safety reserve" active={activeTool} onToggle={toggleTool}><BudgetSettingsTool/></ToolRow>
            <ToolRow id="forecast" title="Budget forecast" description="Check whether the month stays on track" active={activeTool} onToggle={toggleTool}><BudgetForecast/></ToolRow>
            <ToolRow id="budgets" title="Category limits" description="Set monthly spending limits" active={activeTool} onToggle={toggleTool}><CategoryBudgets/></ToolRow>
            <ToolRow id="planned" title="Planned payments" description="Manage upcoming bills and due dates" active={activeTool} onToggle={toggleTool}><PlannedPayments/></ToolRow>
            <ToolRow id="recurring" title="Recurring entries" description="Manage salary and regular expenses" active={activeTool} onToggle={toggleTool}><RecurringTransactions/></ToolRow>
          </ToolGroup>
          <ToolGroup id="analysis" icon="📊" title="Analysis" description="Monthly results and spending breakdown" active={activeGroup} onToggle={toggleGroup}>
            <ToolRow id="comparison" title="Month comparison" description="Compare the selected month with the previous month" active={activeTool} onToggle={toggleTool}><MonthComparison/></ToolRow>
            <ToolRow id="summary" title="Spending by category" description="See where your money goes" active={activeTool} onToggle={toggleTool}><CategorySummary/></ToolRow>
            <ToolRow id="months" title="Monthly view" description="Review previous and upcoming months" active={activeTool} onToggle={toggleTool}><MonthlyView/></ToolRow>
          </ToolGroup>
          <ToolGroup id="data" icon="🔎" title="Data" description="Search, edit and undo changes" active={activeGroup} onToggle={toggleGroup}>
            <ToolRow id="search" title="Search and filters" description="Find entries quickly" active={activeTool} onToggle={toggleTool}><SearchFilter/></ToolRow>
            <ToolRow id="editor" title="Edit entries" description="Correct an amount, date or category" active={activeTool} onToggle={toggleTool}><TransactionEditor/></ToolRow>
            <ToolRow id="undo" title="Undo changes" description="Restore the most recent change" active={activeTool} onToggle={toggleTool}><UndoManagerTool/></ToolRow>
          </ToolGroup>
          <ToolGroup id="system" icon="🔐" title="Security and system" description="Integrity checks and encrypted backup" active={activeGroup} onToggle={toggleGroup}>
            <ToolRow id="integrity" title="Data integrity check" description="Find incomplete or broken entries" active={activeTool} onToggle={toggleTool}><DataIntegrityTool/></ToolRow>
            <ToolRow id="backup" title="Encrypted backup" description="Export or restore all MyMoney data" active={activeTool} onToggle={toggleTool}><BackupRestore/></ToolRow>
          </ToolGroup>
        </div>
      </aside>
    </div>}
  </>;
}
