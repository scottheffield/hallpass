import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { syncDemoFromUrl } from "./lib/clock";
import { startOfflineSync } from "./lib/offline";

syncDemoFromUrl();
startOfflineSync();

function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
    // Previews without SW support still run the app.
  });
}

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
