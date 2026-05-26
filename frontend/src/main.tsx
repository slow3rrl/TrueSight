import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RuntimeGoogleOAuthProvider } from "./context/GoogleAuthProvider";
import { Toaster } from "react-hot-toast";
import { registerPwa } from "./pwa";
import "./index.css";

registerPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RuntimeGoogleOAuthProvider>
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
    </RuntimeGoogleOAuthProvider>
  </React.StrictMode>
);
