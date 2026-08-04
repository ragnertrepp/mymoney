import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

const KEY = "rebuildme-mymoney-sales-v1";
type SalePayment = { id:string; amount:number; date:string };
type Sale = { id:string; name:string; amount:number; purchaseDate:string; payments:SalePayment[] };
const today=()=>new Date().toISOString().slice(0,10);
const id=()=>`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const num=(v:string)=>Number(v.trim().replace(/\s/g,"").replace(",","."))||0;
const eur=(n:number)=>new Intl.NumberFormat("en-FI",{style:"currency",currency:"EUR"}).format(n);
function read():Sale[]{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}

export default function SalesPage(){
 const [visible,setVisible]=useState(false),[mount,setMount]=useState<HTMLElement|null>(null),[items,setItems]=useState<Sale[]>(read);
 const [name,setName]=useState(""),[amount,setAmount]=useState(""),[purchaseDate,setPurchaseDate]=useState(today());
 const [paying,setPaying]=useState<string|null>(null),[paymentAmount,setPaymentAmount]=useState(""),[paymentDate,setPaymentDate]=useState(today());
 useEffect(()=>{const main=document.querySelector("main");if(!(main instanceof HTMLElement))return;const node=document.createElement("div");node.className="sales-page-mount";main.prepend(node);setMount(node);return()=>node.remove()},[]);
 useEffect(()=>{const show=(e:Event)=>{setVisible(Boolean((e as CustomEvent).detail));setItems(read())};const refresh=()=>setItems(read());window.addEventListener("mymoney-sales-mode",show);window.addEventListener("mymoney-data-changed",refresh);return()=>{window.removeEventListener("mymoney-sales-mode",show);window.removeEventListener("mymoney-data-changed",refresh)}},[]);
 function save(next:Sale[]){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent("mymoney-data-changed"))}
 function addSale(e:FormEvent){e.preventDefault();const value=num(amount);if(!name.trim()||value<=0)return;save([{id:id(),name:name.trim(),amount:value,purchaseDate,payments:[]},...items]);setName("");setAmount("");setPurchaseDate(today())}
 function addPayment(e:FormEvent,saleId:string){e.preventDefault();const value=num(paymentAmount);if(value<=0)return;save(items.map(s=>s.id===saleId?{...s,payments:[...s.payments,{id:id(),amount:value,date:paymentDate}]}:s));setPaymentAmount("");setPaymentDate(today());setPaying(null)}
 const totals=useMemo(()=>{const total=items.reduce((s,x)=>s+x.amount,0),paid=items.reduce((s,x)=>s+x.payments.reduce((a,p)=>a+p.amount,0),0);return{total,paid,left:Math.max(0,total-paid)}},[items]);
 if(!visible||!mount)return null;
 return createPortal(<section className="standalone-page sales-page">
  <section className="summary-grid"><article className="summary-card"><span>Total sales</span><strong>{eur(totals.total)}</strong><small>{items.length} projects</small></article><article className="summary-card"><span>Paid</span><strong>{eur(totals.paid)}</strong><small>Received</small></article><article className="summary-card"><span>Remaining</span><strong>{eur(totals.left)}</strong><small>Still unpaid</small></article></section>
  <div className="card"><p className="eyebrow">Sales</p><h2>Add sale</h2><form onSubmit={addSale} className="form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" required/></label><label>Purchase date<input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/></label><button className="primary-button">Save sale</button></form></div>
  <div className="card"><h2>Sales list</h2>{items.length===0?<div className="empty-state">No sales projects yet.</div>:items.map(s=>{const paid=s.payments.reduce((a,p)=>a+p.amount,0),left=Math.max(0,s.amount-paid),status=left<=0?"Paid":paid>0?"Partly paid":"Unpaid";return <article className="sale-card" key={s.id}><div className="sale-head"><div><strong>{s.name}</strong><small>Purchased {s.purchaseDate}</small></div><span>{status}</span></div><div className="sale-values"><span>Total <strong>{eur(s.amount)}</strong></span><span>Paid <strong>{eur(paid)}</strong></span><span>Remaining <strong>{eur(left)}</strong></span></div>{s.payments.length>0&&<div className="sale-payments">{s.payments.map(p=><small key={p.id}>{p.date} · {eur(p.amount)}</small>)}</div>}{paying===s.id?<form onSubmit={e=>addPayment(e,s.id)} className="form-grid sale-payment-form"><label>Payment amount<input autoFocus inputMode="decimal" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}/></label><label>Payment date<input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)}/></label><button className="primary-button">Save payment</button><button type="button" className="secondary-button" onClick={()=>setPaying(null)}>Cancel</button></form>:<button className="secondary-button" onClick={()=>setPaying(s.id)}>Add payment</button>}</article>})}</div>
 </section>,mount)
}
