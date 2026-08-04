import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Main = "overview" | "sales" | "loans" | "calendar";
type Overview = "summary" | "budget" | "canbuy";
type Loans = "overview" | "cashout" | "cashin";
type Calendar = "calendar" | "todo" | "notes";

function originalButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".navigation .nav-button"))
    .find((button) => button.textContent?.trim() === label);
}
function openOriginal(label: string) { originalButton(label)?.click(); }

export default function MainNavigation() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [main, setMain] = useState<Main>("overview");
  const [openMenu, setOpenMenu] = useState<Exclude<Main, "sales"> | null>(null);
  const [overview, setOverview] = useState<Overview>("summary");
  const [loans, setLoans] = useState<Loans>("overview");
  const [calendar, setCalendar] = useState<Calendar>("calendar");

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".navigation");
    if (!nav?.parentElement) return;
    nav.classList.add("legacy-navigation");
    const mount = document.createElement("div");
    mount.className = "simple-navigation-mount";
    nav.parentElement.insertBefore(mount, nav);
    setMountNode(mount);
    return () => { nav.classList.remove("legacy-navigation"); mount.remove(); };
  }, []);

  function modes(next?: "notes" | "sales" | "canbuy") {
    const notes = next === "notes", sales = next === "sales", canbuy = next === "canbuy";
    document.body.classList.toggle("notes-mode", notes);
    document.body.classList.toggle("sales-mode", sales);
    document.body.classList.toggle("canbuy-mode", canbuy);
    window.dispatchEvent(new CustomEvent("mymoney-notes-mode", { detail: notes }));
    window.dispatchEvent(new CustomEvent("mymoney-sales-mode", { detail: sales }));
    window.dispatchEvent(new CustomEvent("mymoney-canbuy-mode", { detail: canbuy }));
  }

  function chooseMain(next: Main) {
    setMain(next);
    if (next === "sales") {
      setOpenMenu(null);
      modes("sales");
      return;
    }

    modes();
    setOpenMenu(next);
  }

  function chooseOverview(next: Overview) {
    setOverview(next); setMain("overview"); modes(next === "canbuy" ? "canbuy" : undefined);
    openOriginal(next === "budget" ? "Eelarve" : "Täna");
  }

  function chooseLoans(next: Loans) {
    setLoans(next); setMain("loans"); modes(); openOriginal("Võlad");
    window.dispatchEvent(new CustomEvent("mymoney-loans-view", { detail: next }));
  }

  function chooseCalendar(next: Calendar) {
    setCalendar(next); setMain("calendar");
    if (next === "notes") { modes("notes"); return; }
    modes(); openOriginal(next === "todo" ? "Todo" : "Kalender");
  }

  if (!mountNode) return null;
  return createPortal(<div className="simple-navigation-wrap">
    <nav className="simple-navigation" aria-label="Main navigation">
      <button className={main === "overview" ? "active" : ""} onClick={() => chooseMain("overview")} aria-expanded={openMenu === "overview"}>Overview</button>
      <button className={main === "sales" ? "active" : ""} onClick={() => chooseMain("sales")}>Sales</button>
      <button className={main === "loans" ? "active" : ""} onClick={() => chooseMain("loans")} aria-expanded={openMenu === "loans"}>Loans</button>
      <button className={main === "calendar" ? "active" : ""} onClick={() => chooseMain("calendar")} aria-expanded={openMenu === "calendar"}>Calendar</button>
    </nav>
    {openMenu === "overview" && <nav className="simple-subnav" aria-label="Overview views">
      <button className={overview === "summary" ? "active" : ""} onClick={() => chooseOverview("summary")}>Summary</button>
      <button className={overview === "budget" ? "active" : ""} onClick={() => chooseOverview("budget")}>Budget</button>
      <button className={overview === "canbuy" ? "active" : ""} onClick={() => chooseOverview("canbuy")}>Can I buy it?</button>
    </nav>}
    {openMenu === "loans" && <nav className="simple-subnav" aria-label="Loan views">
      <button className={loans === "overview" ? "active" : ""} onClick={() => chooseLoans("overview")}>Loans Overview</button>
      <button className={loans === "cashout" ? "active" : ""} onClick={() => chooseLoans("cashout")}>Cash Out</button>
      <button className={loans === "cashin" ? "active" : ""} onClick={() => chooseLoans("cashin")}>Cash In</button>
    </nav>}
    {openMenu === "calendar" && <nav className="simple-subnav" aria-label="Calendar views">
      <button className={calendar === "calendar" ? "active" : ""} onClick={() => chooseCalendar("calendar")}>Calendar</button>
      <button className={calendar === "todo" ? "active" : ""} onClick={() => chooseCalendar("todo")}>To-Do</button>
      <button className={calendar === "notes" ? "active" : ""} onClick={() => chooseCalendar("notes")}>Notes</button>
    </nav>}
  </div>, mountNode);
}
