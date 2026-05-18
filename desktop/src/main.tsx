import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";

// Restore the saved business theme palette before first paint
try {
  const saved = localStorage.getItem("horus.theme.palette");
  if (saved) {
    const p = JSON.parse(saved);
    if (p?.primary) document.documentElement.style.setProperty("--primary", p.primary);
    if (p?.accent)  document.documentElement.style.setProperty("--accent",  p.accent);
  }
} catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
