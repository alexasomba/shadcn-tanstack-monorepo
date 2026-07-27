import { EventClient } from "@tanstack/devtools-event-client";
import { useEffect, useState } from "react";

type AppDevtoolsEvents = {
  "user-action": { action: string; timestamp: number; payload?: unknown };
  "system-event": { event: string; status: "success" | "warning" | "error" };
};

class AppDevtoolsClient extends EventClient<AppDevtoolsEvents> {
  constructor() {
    super({ pluginId: "app-devtools-inspector" });
  }
}

export const appDevtoolsClient = new AppDevtoolsClient();

interface AppDevtoolsPanelProps {
  theme?: "light" | "dark";
}

export function AppDevtoolsPanel({ theme }: AppDevtoolsPanelProps) {
  const [logs, setLogs] = useState<
    Array<{ id: string; type: string; details: string; time: string }>
  >([]);

  useEffect(() => {
    const unsubUser = appDevtoolsClient.on("user-action", (e) => {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          type: `User: ${e.payload.action}`,
          details: JSON.stringify(e.payload.payload ?? {}),
          time: new Date(e.payload.timestamp).toLocaleTimeString(),
        },
        ...prev.slice(0, 49),
      ]);
    });

    const unsubSystem = appDevtoolsClient.on("system-event", (e) => {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          type: `System: ${e.payload.event} (${e.payload.status})`,
          details: `Status ${e.payload.status}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 49),
      ]);
    });

    return () => {
      unsubUser();
      unsubSystem();
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <div
      style={{
        padding: "16px",
        fontFamily: "monospace",
        fontSize: "13px",
        height: "100%",
        overflowY: "auto",
        backgroundColor: isDark ? "#121212" : "#f8f9fa",
        color: isDark ? "#e0e0e0" : "#212529",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "12px",
          borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}`,
          paddingBottom: "8px",
        }}
      >
        <strong>Application Activity Inspector</strong>
        <span>{logs.length} Events Recorded</span>
      </div>

      {logs.length === 0 ? (
        <div
          style={{ color: isDark ? "#888" : "#6c757d", fontStyle: "italic", paddingTop: "12px" }}
        >
          No application events emitted yet. Activity will stream here in real time.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                padding: "8px",
                borderRadius: "4px",
                backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                border: `1px solid ${isDark ? "#333" : "#e9ecef"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: isDark ? "#4fb8b2" : "#0d6efd",
                }}
              >
                <span>{log.type}</span>
                <span style={{ fontSize: "11px", color: isDark ? "#888" : "#6c757d" }}>
                  {log.time}
                </span>
              </div>
              <div
                style={{ marginTop: "4px", color: isDark ? "#aaa" : "#495057", fontSize: "12px" }}
              >
                {log.details}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Devtools plugin panel entry
 */
export const AppDevtoolsPluginEntry = {
  name: "App Inspector",
  render: <AppDevtoolsPanel />,
};
