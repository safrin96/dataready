import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { AppSessionProvider } from "./session/AppSessionContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppSessionProvider>
        <App />
      </AppSessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
