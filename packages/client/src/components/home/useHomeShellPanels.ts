import { useCallback, useState } from "react";

/** Windows 11 shell surfaces that share the taskbar and must never stack on each other. */
export type HomeShellPanelId =
  | "start-menu"
  | "clock-flyout"
  | "quick-settings"
  | "taskbar-context"
  /** The desk's own right-click menu; single-slot mutual exclusion keeps it clear of the taskbar menu. */
  | "desktop-context";

/** Shape handed to a shell surface so it only reflects panel state; the orchestrator owns the state. */
export type HomeShellPanelProps = {
  activePanel: HomeShellPanelId | null;
  togglePanel: (id: HomeShellPanelId) => void;
  closePanel: () => void;
};

/**
 * Single-slot panel state for the Home shell: opening one surface closes whichever was open.
 * The value holds at most one panel, so mutual exclusion is structural rather than enforced per panel.
 * Consuming components receive this through props and must not import the hook themselves.
 */
export function useHomeShellPanels() {
  const [activePanel, setActivePanel] = useState<HomeShellPanelId | null>(null);

  const togglePanel = useCallback((id: HomeShellPanelId) => {
    setActivePanel((current) => (current === id ? null : id));
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const isPanelOpen = useCallback((id: HomeShellPanelId) => activePanel === id, [activePanel]);

  return { activePanel, setPanel: setActivePanel, togglePanel, closePanel, isPanelOpen };
}
