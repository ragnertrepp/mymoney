import { useEffect, useState, type FormEvent } from "react";

const KEY = "rebuildme-mymoney-notes-v1";
type Note = { id:string; title:string; text:string; date:string };
const today=()=>new Date().toISOString().slice(0,10);
const id=()=>`${Date.now()}-${Math.random().toString(16).slice(2)}`;
function read():Note[]{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
export default function NotesPage(){
 const [visible,setVisible]=useState(false),[items,setItems]=useState<Note[]>(read),[title,setTitle]=useState(""),[text,setText]=useState("");
 useEffect(()=>{const h=(e:Event)=>setVisible(Boolean((e as CustomEvent).detail));window.addEventListener("mymoney-notes-mode",h);return()=>window.removeEventListener("mymoney-notes-mode",h)},[]);
 function save(next:Note[]){setItems(next);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent("mymoney-data-changed"))}
 function add(e:FormEvent){e.preventDefault();if(!title.trim()&&!text.trim())return;save([{id:id(),title:title.trim()||"Note",text:text.trim(),date:today()},...items]);setTitle("");setText("")}
 if(!visible)return null;
 return <section className="standalone-page notes-page"><div className="card"><p className="eyebrow">Notes</p><h2>Quick note</h2><form onSubmit={add}><label>Title (optional)<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Note<textarea rows={6} value={text} onChange={e=>setText(e.target.value)} autoFocus/></label><button className="primary-button">Save note</button></form></div><div className="card"><h2>Saved notes</h2>{items.length===0?<div className="empty-state">No notes yet.</div>:<div className="notes-list">{items.map(n=><article className="note-card" key={n.id}><small>{n.date}</small><h3>{n.title}</h3><p>{n.text}</p><button className="danger-link" onClick={()=>save(items.filter(x=>x.id!==n.id))}>Delete</button></article>)}</div>}</div></section>
}
