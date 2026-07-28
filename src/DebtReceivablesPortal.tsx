import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Receivables from "./Receivables";

export default function DebtReceivablesPortal() {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;

    const node = document.createElement("div");
    node.className = "receivables-mount";
    main.append(node);
    setMountNode(node);

    const updateVisibility = () => {
      const active = document.querySelector(".navigation .nav-button.active");
      setVisible(active?.textContent?.trim() === "Võlad");
    };

    const navigation = document.querySelector(".navigation");
    const handleNavigationClick = () => window.requestAnimationFrame(updateVisibility);
    updateVisibility();
    navigation?.addEventListener("click", handleNavigationClick);

    return () => {
      navigation?.removeEventListener("click", handleNavigationClick);
      node.remove();
    };
  }, []);

  if (!mountNode || !visible) return null;

  return createPortal(
    <section className="receivables-section">
      <div className="section-heading"><div><p className="eyebrow">Mulle võlgu</p><h2>Kes mulle raha võlgneb</h2></div></div>
      <Receivables />
    </section>,
    mountNode,
  );
}
