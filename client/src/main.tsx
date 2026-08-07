import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { captureUtm } from "./lib/utm";

initAnalytics();
captureUtm(); // capture utm_*/gclid/fbclid on first load (before SPA nav strips them)

createRoot(document.getElementById("root")!).render(<App />);
