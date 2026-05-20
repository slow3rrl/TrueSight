import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--app-surface-strong)",
            border: "1px solid color-mix(in srgb, var(--app-border) 32%, transparent)",
            borderRadius: "12px",
            color: "var(--app-text)",
            padding: "12px 16px",
            fontSize: "14px",
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);
