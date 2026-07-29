import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Mounts = {
  nav: HTMLElement;
  content: HTMLElement;
};

function activeMainTab() {
  return document.querySelector(".navigation .nav-button.active")?.textContent?.trim() ?? "";
}

function hideTodayControl() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>("main .two-column > .card"));
  const card = cards.find((item) =>
    item.querySelector<HTMLElement>(".section-heading h2")?.textContent?.trim() === "Kas saan lubada?",
  );
  if (!card) return;

  const parent = card.parentElement;
  card.style.display = "none";
  if (parent?.classList.contains("two-column")) {
    parent.style.gridTemplateColumns = "1fr";
  }
}

export default function BudgetControlAdjuster() {
  const [mounts, setMounts] = useState<Mounts | null>(null);
  const [isBudget, setIsBudget] = useState(false);
  const [controlActive, setControlActive] = useState(false);
  const [purchaseName, setPurchaseName] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");

  useEffect(() => {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;

    const contentMount = document.createElement("div");
    contentMount.className = "budget-control-mount";
    main.appendChild(contentMount);

    let navMount: HTMLElement | null = null;

    const bindBudgetNav = () => {
      const budgetNav = document.querySelector<HTMLElement>("main .sub-navigation[aria-label='Eelarve vaated']");
      if (!budgetNav) return;

      if (!navMount || !navMount.isConnected) {
        navMount = document.createElement("span");
        navMount.className = "budget-control-nav-mount";
        navMount.style.display = "contents";
        budgetNav.appendChild(navMount);
      }

      setMounts({ nav: navMount, content: contentMount });
    };

    const update = () => {
      const budgetActive = activeMainTab() === "Eelarve";
      setIsBudget(budgetActive);
      hideTodayControl();
      if (budgetActive) window.requestAnimationFrame(bindBudgetNav);
      if (!budgetActive) setControlActive(false);
    };

    const navigation = document.querySelector(".navigation");
    const handleNavigation = () => window.requestAnimationFrame(update);
    const handleDocumentClick = (event: MouseEvent) => {
      hideTodayControl();
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      if (!target.closest("main .sub-navigation[aria-label='Eelarve vaated']")) return;
      if (target.textContent?.trim() !== "Kontroll") setControlActive(false);
    };

    update();
    navigation?.addEventListener("click", handleNavigation);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      navigation?.removeEventListener("click", handleNavigation);
      document.removeEventListener("click", handleDocumentClick);
      navMount?.remove();
      contentMount.remove();
    };
  }, []);

  useEffect(() => {
    if (!isBudget || !mounts) return;

    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;

    const budgetNav = document.querySelector<HTMLElement>("main .sub-navigation[aria-label='Eelarve vaated']");
    const sections = Array.from(main.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.tagName === "SECTION" && !node.classList.contains("footer-actions"),
    );

    if (controlActive) {
      sections.forEach((section) => {
        section.dataset.budgetControlPreviousDisplay = section.style.display;
        section.style.display = "none";
      });
      budgetNav?.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    } else {
      sections.forEach((section) => {
        if (section.dataset.budgetControlPreviousDisplay !== undefined) {
          section.style.display = section.dataset.budgetControlPreviousDisplay;
          delete section.dataset.budgetControlPreviousDisplay;
        }
      });
    }

    return () => {
      sections.forEach((section) => {
        if (section.dataset.budgetControlPreviousDisplay !== undefined) {
          section.style.display = section.dataset.budgetControlPreviousDisplay;
          delete section.dataset.budgetControlPreviousDisplay;
        }
      });
    };
  }, [controlActive, isBudget, mounts]);

  if (!mounts || !isBudget) return null;

  return (
    <>
      {createPortal(
        <button className={controlActive ? "active" : ""} onClick={() => setControlActive(true)}>
          Kontroll
        </button>,
        mounts.nav,
      )}

      {controlActive && createPortal(
        <section className="card compact-form-card budget-control-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Kontroll</p>
              <h2>Kas saan lubada?</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Ostu nimetus
              <input
                value={purchaseName}
                onChange={(event) => setPurchaseName(event.target.value)}
                placeholder="Näiteks telefon või toit"
              />
            </label>
            <label>
              Hind
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchaseAmount}
                onChange={(event) => setPurchaseAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="affordability neutral">
            <strong>Sisesta ostu hind</strong>
            <span>Arvutus arvestab reservi, võlamakseid ja planeeritud arveid.</span>
          </div>
        </section>,
        mounts.content,
      )}
    </>
  );
}
