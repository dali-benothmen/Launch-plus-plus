import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient } from "@launchpp/api-client";
import { App, createAppRouter } from "./app.js";

const container = document.querySelector("#root");
if (!(container instanceof HTMLElement)) throw new Error("Launch++ root element is missing");

createRoot(container).render(
  <StrictMode>
    <App apiClient={createApiClient()} router={createAppRouter()} />
  </StrictMode>,
);
