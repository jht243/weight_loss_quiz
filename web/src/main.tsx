import React from "react";
import { createRoot } from "react-dom/client";

import RentalPropertyHelloWorld from "./component";

const container = document.getElementById("auto-loan-calculator-root");

if (!container) {
  throw new Error("auto-loan-calculator-root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <RentalPropertyHelloWorld />
  </React.StrictMode>
);
