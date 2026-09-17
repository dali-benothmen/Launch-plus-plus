import { connectFixtureBridge, proveCsp, proveNavigationConfinement } from "./fixture-bridge.js";
import "./surface.css";

const bridge = await connectFixtureBridge();
document.documentElement.setAttribute("data-surface-id", bridge.context.surfaceId);

const root = document.querySelector("#root");
if (!(root instanceof HTMLElement)) throw new Error("Vanilla fixture root is missing.");

root.innerHTML = `
  <main>
    <p class="badge">Vanilla artifact</p>
    <h1>Isolated vanilla</h1>
    <p data-testid="theme">Theme: ${document.documentElement.getAttribute("data-launch-theme")}</p>
    <button type="button" id="call-host">Call host</button>
    <button type="button" id="check-isolation">Check isolation</button>
    <output aria-live="polite" id="result">Ready</output>
    <output aria-live="polite" id="security">Not checked</output>
  </main>
`;

root.querySelector("#call-host")?.addEventListener("click", async () => {
  const { result } = bridge.invoke("proof.echo", { framework: "vanilla" });
  const value = (await result) as { servedBy: string };
  const output = root.querySelector("#result");
  if (output) output.textContent = `Echo from ${value.servedBy}`;
});

root.querySelector("#check-isolation")?.addEventListener("click", async () => {
  const navigation = proveNavigationConfinement();
  const csp = await proveCsp();
  const output = root.querySelector("#security");
  if (output) output.textContent = `Navigation ${navigation}; CSP ${csp}`;
});
