import * as React from "react";

import { useTheme } from "./theme-provider";

function isEditableNode(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  if ((element as HTMLElement).isContentEditable) {
    return true;
  }
  return (
    element.getAttribute("contenteditable") === "true" ||
    Boolean(element.closest("input, textarea, select, [contenteditable='true']"))
  );
}

export function ThemeHotkey() {
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableNode(event.target as Element | null)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isPlainD = key === "d" && !event.ctrlKey && !event.metaKey && !event.altKey;
      const isCmdShiftD = key === "d" && (event.metaKey || event.ctrlKey) && event.shiftKey;

      if (isPlainD || isCmdShiftD) {
        event.preventDefault();
        const isDark =
          theme === "dark" ||
          (theme === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        setTheme(isDark ? "light" : "dark");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  return null;
}
