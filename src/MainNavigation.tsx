import { useEffect, useState } from "react";

type Main = "info" | "loans" | "calendar" | "notes";
type Info = "overview" | "budget" | "canbuy";
type Calendar = "calendar" | "todo";

function originalButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".navigation .nav-button"))
    .find((button) => button.textContent?.trim() === label);
}

function openOriginal(label: string) {
  originalButton(label)?.click();
}

export default function MainNavigation() {
  const [main, setMain] = useState<Main>("info");
  const [info, setInfo] = useState<Info>("overview");
  const [calendar, setCalendar] = useState<Calendar>("calendar");

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".navigation");
    if (!nav) return;
    nav.classList.add("legacy-navigation");
    return () => nav.classList.remove("legacy-navigation");
  }, []);

  function chooseMain(next: Main) {
    setMain(next);
    document.body.classList.toggle("notes-mode", next === "notes");
    window.dispatchEvent(new CustomEvent("mymoney-notes-mode", { detail: next === "notes" }));
    if (next === "info") openOriginal(info === "budget" ? "Eelarve" : "Täna");
    if (next === "loans") openOriginal("Võlad");
    if (next === "calendar") openOriginal(calendar === "todo" ? "Todo" : "Kalender");
  }

  function chooseInfo(next: Info) {
    setInfo(next);
    setMain("info");
    document.body.classList.remove("notes-mode");
    window.dispatchEvent(new CustomEvent("mymoney-notes-mode", { detail: false }));
    window.dispatchEvent(new CustomEvent("mymoney-canbuy-mode", { detail: next === "canbuy" }));
    openOriginal(next === "budget" ? "Eelarve" : "Täna");
  }

  function chooseCalendar(next: Calendar) {
    setCalendar(next);
    setMain("calendar");
    document.body.classList.remove("notes-mode");
    window.dispatchEvent(new CustomEvent("mymoney-notes-mode", { detail: false }));
    window.dispatchEvent(new CustomEvent("mymoney-canbuy-mode", { detail: false }));
    openOriginal(next === "todo" ? "Todo" : "Kalender");
  }

  return <div className="simple-navigation-wrap">
    <nav className="simple-navigation" aria-label="Main navigation">
      <button className={main === "info" ? "active" : ""} onClick={() => chooseMain("info")}>Info</button>
      <button className={main === "loans" ? "active" : ""} onClick={() => chooseMain("loans")}>Loans</button>
      <button className={main === "calendar" ? "active" : ""} onClick={() => chooseMain("calendar")}>Calendar</button>
      <button className={main === "notes" ? "active" : ""} onClick={() => chooseMain("notes")}>Notes</button>
    </nav>

    {main === "info" && <nav className="simple-subnav" aria-label="Info views">
      <button className={info === "overview" ? "active" : ""} onClick={() => chooseInfo("overview")}>Overview</button>
      <button className={info === "budget" ? "active" : ""} onClick={() => chooseInfo("budget")}>Budget</button>
      <button className={info === "canbuy" ? "active" : ""} onClick={() => chooseInfo("canbuy")}>Can I buy it?</button>
    </nav>}

    {main === "calendar" && <nav className="simple-subnav" aria-label="Calendar views">
      <button className={calendar === "calendar" ? "active" : ""} onClick={() => chooseCalendar("calendar")}>Calendar</button>
      <button className={calendar === "todo" ? "active" : ""} onClick={() => chooseCalendar("todo")}>To-Do</button>
    </nav>}
  </div>;
}
