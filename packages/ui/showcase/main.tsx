import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@launchpp/ui-tokens/styles.css";
import "../styles.css";
import { ShowcaseApp } from "./showcase-app.js";
import "./showcase.css";

const root = document.getElementById("root");

if (root === null) throw new Error("The showcase root element is missing.");

createRoot(root).render(
  <StrictMode>
    <ShowcaseApp />
  </StrictMode>,
);
