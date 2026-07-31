import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DebtView = "mine" | "receivables";

function activeMainTab() {
  return document.querySelector(".navigation .nav-button.active")?.textContent?.trim() ?? "";
}

function findSectionByText(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("main > section.card"))
    .find((section) => section.textContent?.includes(text)) ?? null;
}

export default function NavigationAdjuster() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [debtView, setDebtView] = useState<DebtView>("mine");
  const [isDebts, setIsDebts] = useState(false);

  useEffect(() => {
    const mainNode = document.querySelector("main");
    if (!(mainNode instanceof HTMLElement)) return;

    const mount = document.createElement("div");
    mount.className = "debt-subnav-mount";
    mainNode.insertBefore(mount, mainNode.firstChild);
    setMountNode(mount);

    const update = () => {
      const tab = activeMainTab();
      const debtsActive = tab === "Võlad" || tab === "Loans";
      setIsDebts(debtsActive);
      mount.style.display = debtsActive ? "block" : "none";

      const budgetNav = document.querySelector<HTMLElement>("main .sub-navigation[aria-label='Eelarve vaated']");
      if (budgetNav) {
        Array.from(budgetNav.querySelectorAll("button")).forEach((button) => {
          if (button.textContent?.trim() === "Seaded") button.style.display = "none";
        });
      }
    };

    const navigation = document.querySelector(".navigation");
    const handleNavigation = () => window.requestAnimationFrame(() => {
      update();
      if (["Võlad", "Loans"].includes(activeMainTab())) setDebtView("mine");
    });

    update();
    navigation?.addEventListener("click", handleNavigation);
    window.addEventListener("mymoney-data-changed", update);
    return () => {
      navigation?.removeEventListener("click", handleNavigation);
      window.removeEventListener("mymoney-data-changed", update);
      mount.remove();
    };
  }, []);

  useEffect(() => {
    if (!isDebts) return;
    const apply = () => {
      const summary = document.querySelector<HTMLElement>("main > .summary-grid");
      const addDebt = findSectionByText("Lisa võlatabelisse") || findSectionByText("Add debt");
      const debtList = findSectionByText("Võlad prioriteedi järgi") || findSectionByText("Debts by priority");
      const receivables = document.querySelector<HTMLElement>("main > .receivables-mount");
      if (summary) summary.style.display = "none";
      if (addDebt) addDebt.style.display = debtView === "mine" ? "block" : "none";
      if (debtList) debtList.style.display = debtView === "mine" ? "block" : "none";
      if (receivables) receivables.style.display = debtView === "receivables" ? "block" : "none";
    };
    apply();
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, [isDebts, debtView]);

  if (!mountNode || !isDebts) return null;
  return createPortal(
    <nav className="sub-navigation debt-sub-navigation simple-subnav" aria-label="Loan views">
      <button className={debtView === "mine" ? "active" : ""} onClick={() => setDebtView("mine")}>Cash Out</button>
      <button className={debtView === "receivables" ? "active" : ""} onClick={() => setDebtView("receivables")}>Cash In</button>
    </nav>,
    mountNode,
  );
}
