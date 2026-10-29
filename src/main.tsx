import React from "react";
import { createRoot } from "react-dom/client";
import { BenchmarkApp } from "./benchmark-app";
import { runIfcWasmProtocol } from "./ifc-wasm-benchmark";
import type { BenchmarkRunner } from "./ui-contracts";

// The preview bundles only the WASM differ. Overlay v1 needs the production
// host and the commercial renderer; `npm start` serves that runner.
const runner: BenchmarkRunner = (container, pair, options, signal, progress, onReport) =>
  options.diffMethod === "ifc-wasm-v1"
    ? runIfcWasmProtocol(container, pair, options, signal, progress, onReport)
    : Promise.reject(
        new Error(
          "Overlay v1 доступен в production runner: npm start. В предпросмотре выберите IFC WASM · Zig.",
        ),
      );

createRoot(document.getElementById("root")!).render(
  <BenchmarkApp runProtocol={runner} />,
);
