import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile.css";
import "./polish.css";
import "./v4.css";
import "./recurring.css";
import "./v5.css";
import "./today-overview.css";
import "./search.css";
import "./category-summary.css";
import "./month-comparison.css";
import App from "./AppV4";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
