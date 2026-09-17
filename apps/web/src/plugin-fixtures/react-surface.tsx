import { useState } from "react";
import { createRoot } from "react-dom/client";

import { connectFixtureBridge, proveCsp, proveNavigationConfinement } from "./fixture-bridge.js";
import "./surface.css";

function ReactProof() {
  const [result, setResult] = useState("Ready");
  const [security, setSecurity] = useState("Not checked");

  return (
    <main>
      <p className="badge">React artifact</p>
      <h1>Isolated React</h1>
      <p data-testid="theme">Theme: {document.documentElement.getAttribute("data-launch-theme")}</p>
      <button
        type="button"
        onClick={async () => {
          const { result } = bridge.invoke("proof.echo", { framework: "react" });
          const value = (await result) as { servedBy: string };
          setResult(`Echo from ${value.servedBy}`);
        }}
      >
        Call host
      </button>
      <button
        type="button"
        onClick={async () => {
          const request = bridge.invoke("proof.wait", {});
          bridge.cancel(request.requestId);
          try {
            await request.result;
          } catch (error) {
            setResult(`Cancelled: ${(error as { code: string }).code}`);
          }
        }}
      >
        Cancel request
      </button>
      <button
        type="button"
        onClick={async () => {
          const navigation = proveNavigationConfinement();
          const csp = await proveCsp();
          setSecurity(`Navigation ${navigation}; CSP ${csp}`);
        }}
      >
        Check isolation
      </button>
      <button
        type="button"
        onClick={() =>
          window.setTimeout(() => {
            throw new Error("Intentional plugin fixture failure");
          })
        }
      >
        Crash plugin
      </button>
      <output aria-live="polite">{result}</output>
      <output aria-live="polite">{security}</output>
    </main>
  );
}

const bridge = await connectFixtureBridge();
document.documentElement.setAttribute("data-surface-id", bridge.context.surfaceId);
const root = document.querySelector("#root");
if (!(root instanceof HTMLElement)) throw new Error("React fixture root is missing.");
createRoot(root).render(<ReactProof />);
