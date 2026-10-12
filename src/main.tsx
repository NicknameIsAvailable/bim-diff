import React from "react";
import { createRoot } from "react-dom/client";
import { BenchmarkApp } from "./benchmark-app";

// UI preview only; no renderer or benchmark implementation is bundled.
createRoot(document.getElementById("root")!).render(<BenchmarkApp />);
