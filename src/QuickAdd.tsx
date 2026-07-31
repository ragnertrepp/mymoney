import { useState, type FormEvent } from "react";

type Mode = "expense" | "income" | "cashout" | "cashin" | "todo" | "note" | null;
const DATA_KEY = "rebuildme-mymoney-v2";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";
const NOTES_KEY = "rebuildme-mymoney-notes-v1";
const LAST_CATEGORY_KEY = "mymoney-last-category";
const today = () => new Date().toISOString().slice(0, 10);
const id = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const num = (value: string) => Number(value.trim().replace(/\s/g, "").replace(",", ".")) || 0;
function readMain(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||"{}")||{}}catch{return{}}}
function readArray(key:string){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}

export default function QuickAdd(){
 const [open,setOpen]=useState(false),[mode,setMode]=useState<Mode>(null),[amount,setAmount]=useState(""),[name,setName]=useState(""),[date,setDate]=useState(today()),[text,setText]=useState(""),[category,setCategory]=useState(localStorage.getItem(LAST_CATEGORY_KEY)||"Other");
 const close=()=>{setOpen(false);setMode(null);setAmount("");setName("");setText("");setDate(today())};
 const changed=()=>{window.dispatchEvent(new CustomEvent("mymoney-data-changed"));close()};
 function save(event:FormEvent){
  event.preventDefault(); const data=readMain(),transactions=Array.isArray(data.transactions)?data.transactions:[],debts=Array.isArray(data.debts)?data.debts:[],tasks=Array.isArray(data.tasks)?data.tasks:[],value=num(amount);
  if(mode==="expense"||mode==="income"){
   if(value<=0)return; const finalCategory=mode==="income"?"Income":category; localStorage.setItem(LAST_CATEGORY_KEY,finalCategory);
   localStorage.setItem(DATA_KEY,JSON.stringify({...data,transactions:[{id:id(),name:name.trim()||(mode==="expense"?"Expense":"Income"),amount:value,type:mode,date:today(),category:finalCategory},...transactions]}));
  }else if(mode==="cashout"){
   if(!name.trim()||value<=0)return; localStorage.setItem(DATA_KEY,JSON.stringify({...data,debts:[...debts,{id:id(),name:name.trim(),balance:value,minimumPayment:0,interest:0,dueDate:date,priority:debts.length+1}]}));
  }else if(mode==="cashin"){
   if(!name.trim()||value<=0)return; const items=readArray(RECEIVABLES_KEY); localStorage.setItem(RECEIVABLES_KEY,JSON.stringify([{id:id(),name:name.trim(),amount:value,dueDate:date,status:"open",payments:[]},...items]));
  }else if(mode==="todo"){
   if(!name.trim())return; localStorage.setItem(DATA_KEY,JSON.stringify({...data,tasks:[...tasks,{id:id(),title:name.trim(),date,completed:false}]}));
  }else if(mode==="note"){
   if(!name.trim()&&!text.trim())return; const notes=readArray(NOTES_KEY); localStorage.setItem(NOTES_KEY,JSON.stringify([{id:id(),title:name.trim()||"Note",text:text.trim(),date:today()},...notes]));
  }else return; changed();
 }
 return <><button className="quick-add-fab" aria-label="Add" onClick={()=>setOpen(true)}>+</button>{open&&<div className="quick-add-backdrop" onMouseDown={close}><section className="quick-add-sheet" onMouseDown={e=>e.stopPropagation()}><div className="quick-add-head"><div><p className="eyebrow">Quick add</p><h2>{mode?"Add item":"What do you want to add?"}</h2></div><button className="secondary-button" onClick={close}>Close</button></div>{!mode?<div className="quick-add-grid"><button onClick={()=>setMode("expense")}>− Expense</button><button onClick={()=>setMode("income")}>+ Income</button><button onClick={()=>setMode("cashout")}>Cash Out</button><button onClick={()=>setMode("cashin")}>Cash In</button><button onClick={()=>setMode("todo")}>To-Do</button><button onClick={()=>setMode("note")}>Note</button></div>:<form onSubmit={save} className="quick-add-form">
 {(mode!=="expense"&&mode!=="income")&&<label>{mode==="todo"?"Task":mode==="note"?"Title":"Name"}<input autoFocus value={name} onChange={e=>setName(e.target.value)}/></label>}
 {(mode==="expense"||mode==="income")&&<><label>Amount<div className="quick-money"><input autoFocus inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.,\s-]/g,""))} placeholder="0,00"/><span>€</span></div></label><div className="quick-amounts">{[5,10,20,50].map(v=><button type="button" key={v} onClick={()=>setAmount(String(v))}>{v} €</button>)}</div><label>Name (optional)<input value={name} onChange={e=>setName(e.target.value)}/></label>{mode==="expense"&&<label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option>Other</option><option>Food</option><option>Transport</option><option>Housing</option><option>Work</option><option>Health</option><option>Children</option></select></label>}</>}
 {(mode==="cashout"||mode==="cashin")&&<label>Amount<div className="quick-money"><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.,\s-]/g,""))} placeholder="0,00"/><span>€</span></div></label>}
 {(mode==="cashout"||mode==="cashin"||mode==="todo")&&<label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>}
 {mode==="note"&&<label>Note<textarea rows={5} value={text} onChange={e=>setText(e.target.value)}/></label>}
 <button className="primary-button" type="submit">Save</button></form>}</section></div>}</>;
}
