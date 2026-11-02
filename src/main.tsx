import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AfterRain from "./AfterRain";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <AfterRain />
  </StrictMode>,
);
