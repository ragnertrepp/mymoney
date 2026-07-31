import { useEffect } from "react";
import { encryptBackupJson, verifyPin } from "./Security";

const STORAGE_KEY = "rebuildme-mymoney-v2";
const RECURRING_KEY = "rebuildme-mymoney-recurring-v1";
const PLANNED_KEY = "rebuildme-mymoney-planned-v1";
const CATEGORY_BUDGET_KEY = "rebuildme-mymoney-category-budgets-v1";
const RECEIVABLES_KEY = "rebuildme-mymoney-receivables-v1";
const NOTES_KEY = "rebuildme-mymoney-notes-v1";

function readJson(key:string,fallback:unknown){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function isObject(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value)}
function cleanCategoryBudgets(value:unknown){if(!isObject(value))return{};return Object.fromEntries(Object.entries(value).filter(([,limit])=>typeof limit==="number"&&Number.isFinite(limit)&&limit>0))}
function cleanReceivables(value:unknown){if(!Array.isArray(value))return[];return value.filter(item=>isObject(item)&&typeof item.id==="string"&&typeof item.name==="string"&&typeof item.amount==="number"&&typeof item.dueDate==="string")}
const todayIso=()=>new Date().toISOString().slice(0,10);

async function downloadFullBackup(){
 const pin=prompt("Enter your MyMoney PIN to encrypt the backup:");
 if(pin===null)return;
 if(!(await verifyPin(pin))){alert("Incorrect PIN. Backup was not created.");return}
 const data=readJson(STORAGE_KEY,null);
 if(!data||typeof data!=="object"){alert("MyMoney data could not be found.");return}
 const backup={format:"mymoney-full-backup",version:5,createdAt:new Date().toISOString(),data,recurring:readJson(RECURRING_KEY,[]),plannedPayments:readJson(PLANNED_KEY,[]),categoryBudgets:cleanCategoryBudgets(readJson(CATEGORY_BUDGET_KEY,{})),receivables:cleanReceivables(readJson(RECEIVABLES_KEY,[])),notes:readJson(NOTES_KEY,[])};
 const blob=await encryptBackupJson(backup,pin),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=`mymoney-full-backup-${todayIso()}.mymoney`;link.click();URL.revokeObjectURL(url);
}

export default function TopBackupAdjuster(){
 useEffect(()=>{
  const attach=()=>{
   const button=Array.from(document.querySelectorAll<HTMLButtonElement>(".topbar button")).find(item=>["Varukoopia","Täielik varukoopia","Encrypted backup"].includes(item.textContent?.trim()||""));
   if(!button||button.dataset.mymoneyBackupAttached==="1")return;
   button.dataset.mymoneyBackupAttached="1";button.textContent="Encrypted backup";button.title="Download a PIN-encrypted MyMoney backup";
   button.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();void downloadFullBackup()},true);
  };
  attach();const timer=window.setTimeout(attach,300);const handle=()=>window.requestAnimationFrame(attach);document.querySelector(".navigation")?.addEventListener("click",handle);
  return()=>{clearTimeout(timer);document.querySelector(".navigation")?.removeEventListener("click",handle)};
 },[]);
 return null;
}
