import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config"; // initialize i18next (Phase 1 of docs/seo/i18n-seo-plan.md)
import { installGlobalErrorReporting } from "@/lib/errorReporter";

installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
