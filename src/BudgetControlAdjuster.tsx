import { useEffect } from "react";

function hideLegacyCanBuyCards() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>("main .card"));

  for (const card of cards) {
    if (card.closest(".standalone-page.canbuy-page")) continue;

    const heading = card.querySelector<HTMLElement>(".section-heading h2")?.textContent?.trim();
    const eyebrow = card.querySelector<HTMLElement>(".eyebrow")?.textContent?.trim().toLowerCase();

    if (heading === "Kas saan lubada?" || heading === "Can I buy it?" || eyebrow === "check") {
      card.style.display = "none";

      const parent = card.parentElement;
      if (parent?.classList.contains("two-column")) {
        parent.style.gridTemplateColumns = "1fr";
      }
    }
  }
}

export default function BudgetControlAdjuster() {
  useEffect(() => {
    const apply = () => window.requestAnimationFrame(hideLegacyCanBuyCards);

    apply();
    document.addEventListener("click", apply);
    window.addEventListener("mymoney-data-changed", apply);

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", apply);
      window.removeEventListener("mymoney-data-changed", apply);
      observer.disconnect();
    };
  }, []);

  return null;
}
