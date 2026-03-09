import { createRoot } from "react-dom/client";
import App from "./App";
import "./global.css";
import "./lib/resize-observer-fix";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find root element");

const root = createRoot(rootElement);
root.render(<App />);
