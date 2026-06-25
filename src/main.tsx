import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorReporting } from "@/lib/errorReporter";

installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
