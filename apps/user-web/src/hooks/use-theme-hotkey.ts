import { useTheme } from "@workspace/ui/components/theme-provider";
import { useEffect } from "react";

export function useThemeHotkey() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("contenteditable") === "true")
      ) {
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
}
