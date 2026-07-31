import { useEffect, useState } from "react";

const DATA_KEY="rebuildme-mymoney-v2";
const RECEIVABLES_KEY="rebuildme-mymoney-receivables-v1";
const today=()=>new Date().toISOString().slice(0,10);
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}

export default function ReminderNotifications(){
 const [permission,setPermission]=useState<NotificationPermission>(()=>"Notification" in window?Notification.permission:"denied");
 function check(){
  if (!("Notification" in window) || Notification.permission!=="granted") return;
  const data=read(DATA_KEY,{}), receivables=read(RECEIVABLES_KEY,[]);
  const tasks=Array.isArray(data.tasks)?data.tasks:[], debts=Array.isArray(data.debts)?data.debts:[];
  const dueTasks=tasks.filter((t:any)=>!t.completed&&t.date&&t.date<=today());
  const overdueDebts=debts.filter((d:any)=>d.dueDate&&d.dueDate<today()&&Number(d.balance||0)>0);
  const overdueIn=Array.isArray(receivables)?receivables.filter((r:any)=>r.status!=="paid"&&r.dueDate&&r.dueDate<today()):[];
  const count=dueTasks.length+overdueDebts.length+overdueIn.length;
  const key=`mymoney-reminder-${today()}-${count}`;
  if(count>0&&localStorage.getItem("mymoney-last-notification")!==key){new Notification("MyMoney reminder",{body:`${count} item${count===1?"":"s"} need attention.`});localStorage.setItem("mymoney-last-notification",key)}
 }
 useEffect(()=>{check();const timer=window.setInterval(check,60*60*1000);window.addEventListener("mymoney-data-changed",check);return()=>{clearInterval(timer);window.removeEventListener("mymoney-data-changed",check)}},[]);
 async function enable(){if(!("Notification" in window))return;const next=await Notification.requestPermission();setPermission(next);if(next==="granted")check()}
 if(permission!=="default")return null;
 return <button className="reminder-enable" onClick={enable}>🔔 Enable reminders</button>;
}
