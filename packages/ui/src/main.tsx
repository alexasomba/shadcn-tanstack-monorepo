import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { Toaster } from "./components/sonner";
import { ThemeProvider } from "./components/theme-provider";

export const metadata = {
  title: "UI Design System Shell",
  description: "A comprehensive modern accessible design system component library.",
};

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <App />
        <Toaster />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
