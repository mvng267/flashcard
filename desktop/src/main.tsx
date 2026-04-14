import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { UiPreferencesProvider } from "./contexts/UiPreferencesContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <UiPreferencesProvider>
      <App />
    </UiPreferencesProvider>
  </AuthProvider>,
);
