import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installApiKeyFetch } from "./lib/apiKey";

installApiKeyFetch();

createRoot(document.getElementById("root")!).render(<App />);
