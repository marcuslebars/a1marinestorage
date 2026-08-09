import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initMetaPixel } from "./lib/meta-pixel";
import { captureUtm } from "./lib/utm";

initAnalytics();
initMetaPixel();
captureUtm(); // capture utm_*/gclid/fbclid on first load (before SPA nav strips them)

createRoot(document.getElementById("root")!).render(<App />);
