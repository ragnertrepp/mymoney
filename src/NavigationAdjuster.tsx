import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DebtView = "overview" | "mine" | "receivables";

function activeMainTab() {
  return document.querySelector(".navigation .nav-button.active")?.textContent?.trim() ?? "";
}

function findSectionByText(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("main > section.card"))
    .find((section) => section.textContent?.includes(text)) ?? null;
}

export default function NavigationAdjuster() {
  const [main, setMain] = useState<HTMLElement | null>(null);
  const [debtView, setDebtView] = useState<DebtView>("overview");
  const [isDebts, setIsDebts] = useState(false);

  useEffect(() => {
    const mainNode = document.querySelector("main");
    if (mainNode instanceof HTMLElement) setMain(mainNode);

    const update = () => {
      const tab = activeMainTab();
      setIsDebts(tab === "Võlad");

      const budgetNav = document.querySelector<HTMLElement>("main .sub-navigation[aria-label='Eelarve vaated']");
      if (budgetNav) {
        Array.from(budgetNav.querySelectorAll("button")).forEach((button) => {
          if (button.textContent?.trim() === "Seaded") button.style.display = "none";
        });
        budgetNav.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
      }
    };

    const navigation = document.querySelector(".navigation");
    const handleNavigation = () => window.requestAnimationFrame(() => {
      update();
      if (activeMainTab() === "Võlad") setDebtView("overview");
    });

    update();
    navigation?.addEventListener("click", handleNavigation);
    return () => navigation?.removeEventListener("click", handleNavigation);
  }, []);

  useEffect(() => {
    if (!isDebts) return;

    const apply = () => {
      const summary = document.querySelector<HTMLElement>("main > .summary-grid");
      const addDebt = findSectionByText("Lisa võlatabelisse");
      const debtList = findSectionByText("Võlad prioriteedi järgi");
      const receivables = document.querySelector<HTMLElement>("main > .receivables-mount");

      if (summary) summary.style.display = debtView === "overview" ? "grid" : "none";
      if (addDebt) addDebt.style.display = debtView === "mine" ? "block" : "none";
      if (debtList) debtList.style.display = debtView === "mine" ? "block" : "none";
      if (receivables) receivables.style.display = debtView === "receivables" ? "block" : "none";
    };

    apply();
    const id = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(id);
  }, [isDebts, debtView]);

  if (!main || !isDebts) return null;

  return createPortal(
    <nav className="sub-navigation debt-sub-navigation" aria-label="Võlgade vaated">
      <button className={debtView === "overview" ? "active" : ""} onClick={() => setDebtView("overview")}>Ülevaade</button>
      <button className={debtView === "mine" ? "active" : ""} onClick={() => setDebtView("mine")}>Minu võlad</button>
      <button className={debtView === "receivables" ? "active" : ""} onClick={() => setDebtView("receivables")}>Mulle võlgu</button>
    </nav>,
    main,
  );
}
