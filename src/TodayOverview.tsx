import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";
const euro = (value:number) => new Intl.NumberFormat("en-FI", { style:"currency", currency:"EUR" }).format(value);
const localDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0,10);
};
function read(key:string, fallback:any){ try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function daysUntil(date:string){ const a=new Date(`${localDate()}T00:00:00`), b=new Date(`${date}T00:00:00`); return Math.round((b.getTime()-a.getTime())/86400000); }

export default function TodayOverview(){
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [visible,setVisible]=useState(true);
  const [revision,setRevision]=useState(0);
  const [more,setMore]=useState(false);

  useEffect(()=>{
    const main=document.querySelector("main");
    if(!(main instanceof HTMLElement)) return;
    const node=document.createElement("div");
    node.className="today-overview-mount";
    main.prepend(node);
    setMount(node);
    const update=()=>setVisible(document.querySelector(".simple-subnav button.active")?.textContent?.trim()==="Overview");
    const refresh=()=>setRevision(value=>value+1);
    const click=()=>requestAnimationFrame(()=>{ update(); refresh(); });
    update();
    document.addEventListener("click",click);
    window.addEventListener("mymoney-data-changed",refresh);
    return()=>{ document.removeEventListener("click",click); window.removeEventListener("mymoney-data-changed",refresh); node.remove(); };
  },[]);

  const summary=useMemo(()=>{
    void revision;
    const data=read(STORAGE_KEY,{});
    const planned=read(PLANNED_KEY,[]);
    const receivables=read(RECEIVABLES_KEY,[]);
    const now=localDate();
    const month=now.slice(0,7);
    const transactions=Array.isArray(data.transactions)?data.transactions:[];
    const debts=Array.isArray(data.debts)?data.debts:[];
    const tasks=Array.isArray(data.tasks)?data.tasks:[];
    let income=0, expenses=0, todayIn=0, todayOut=0;
    for(const item of transactions){
      const amount=Number(item.amount||0);
      if(item.date?.slice(0,7)===month){ item.type==="income" ? income+=amount : expenses+=amount; }
      if(item.date===now){ item.type==="income" ? todayIn+=amount : todayOut+=amount; }
    }
    const openTasks=tasks.filter((item:any)=>!item.completed);
    const overdueTasks=openTasks.filter((item:any)=>item.date && item.date<now);
    const upcoming=[
      ...(Array.isArray(planned)?planned:[]).filter((item:any)=>item.status==="planned").map((item:any)=>({name:item.name||"Payment",amount:Number(item.amount||0),date:item.dueDate,type:"Payment"})),
      ...debts.filter((item:any)=>item.dueDate&&Number(item.balance||0)>0).map((item:any)=>({name:item.name||"Debt",amount:Number(item.minimumPayment||item.monthlyPayment||item.balance||0),date:item.dueDate,type:"Debt payment"}))
    ].filter((item:any)=>item.date && daysUntil(item.date)>=0 && daysUntil(item.date)<=7).sort((a:any,b:any)=>a.date.localeCompare(b.date));
    const incoming=(Array.isArray(receivables)?receivables:[]).filter((item:any)=>item.status!=="paid"&&item.dueDate&&daysUntil(item.dueDate)>=0&&daysUntil(item.dueDate)<=7);
    const overdueMoney=[
      ...debts.filter((item:any)=>item.dueDate&&item.dueDate<now&&Number(item.balance||0)>0),
      ...(Array.isArray(receivables)?receivables:[]).filter((item:any)=>item.status!=="paid"&&item.dueDate&&item.dueDate<now),
      ...(Array.isArray(planned)?planned:[]).filter((item:any)=>item.status==="planned"&&item.dueDate&&item.dueDate<now)
    ];
    const attention=overdueTasks.length+overdueMoney.length;
    return {
      result:income-expenses,
      todayIn,
      todayOut,
      upcomingTotal:upcoming.reduce((sum:number,item:any)=>sum+item.amount,0),
      incomingTotal:incoming.reduce((sum:number,item:any)=>sum+Number(item.amount||0),0),
      attention,
      openTasks:openTasks.length,
      overdueCount:overdueTasks.length+overdueMoney.length,
      upcoming
    };
  },[revision]);

  if(!mount||!visible) return null;
  return createPortal(
    <section className={`today-overview ${summary.attention>0?"has-alert":""}`}>
      <div className="today-overview-heading">
        <div><p className="eyebrow">Overview</p><h2>{summary.attention>0?`${summary.attention} item${summary.attention===1?"":"s"} need attention`:"Everything looks up to date"}</h2></div>
        {summary.attention>0&&<span className="today-status-pill danger">Needs attention</span>}
      </div>
      <div className="today-overview-grid compact-overview">
        <article><span>Month result</span><strong className={summary.result>=0?"positive-text":"negative-text"}>{euro(summary.result)}</strong><small>Current month</small></article>
        <article><span>Today in</span><strong className="positive-text">+{euro(summary.todayIn)}</strong><small>Income today</small></article>
        <article><span>Today out</span><strong className="negative-text">−{euro(summary.todayOut)}</strong><small>Expenses today</small></article>
        <article><span>Next 7 days</span><strong>{euro(summary.upcomingTotal)}</strong><small>{summary.upcoming.length} payment{summary.upcoming.length===1?"":"s"}</small></article>
      </div>
      <button className="secondary-button overview-more" onClick={()=>setMore(value=>!value)}>{more?"Show less":"Show more"}</button>
      {more&&<div className="overview-more-grid">
        <article className="overview-detail"><span>Expected income</span><strong className="positive-text">{euro(summary.incomingTotal)}</strong><small>Next 7 days</small></article>
        <article className="overview-detail"><span>Open tasks</span><strong>{summary.openTasks}</strong><small>{summary.overdueCount} overdue</small></article>
        {summary.upcoming.slice(0,4).map((item:any,index:number)=><article className="overview-payment" key={`${item.date}-${index}`}><div><strong>{item.name}</strong><small>{item.type} · {item.date}</small></div><strong>{euro(item.amount)}</strong></article>)}
      </div>}
    </section>,mount
  );
}
