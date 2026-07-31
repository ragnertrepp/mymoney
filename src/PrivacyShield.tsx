import { useEffect, useState } from "react";

export default function PrivacyShield(){
 const [hidden,setHidden]=useState(false);
 useEffect(()=>{
  const update=()=>setHidden(document.visibilityState!=="visible");
  const blur=()=>setHidden(true);
  const focus=()=>setHidden(false);
  document.addEventListener("visibilitychange",update);
  window.addEventListener("blur",blur);
  window.addEventListener("focus",focus);
  return()=>{document.removeEventListener("visibilitychange",update);window.removeEventListener("blur",blur);window.removeEventListener("focus",focus)};
 },[]);
 if(!hidden)return null;
 return <div className="privacy-shield" aria-hidden="true"><div><strong>MyMoney locked</strong><span>Return to the app to view your data.</span></div></div>;
}
