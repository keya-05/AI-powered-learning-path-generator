import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "reactflow/dist/style.css";
import "./index.css";

// recharts 3 calls Object.hasOwn, which browsers older than ~2021 (e.g. Edge 92) lack.
if (!Object.hasOwn) {
  Object.hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
