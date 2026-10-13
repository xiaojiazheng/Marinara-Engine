import { memo, type MouseEventHandler, type ReactNode } from "react";
import { Home as HomeIcon, LayoutGrid, LibraryBig, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatModeIcon } from "../chat/ChatModeIcon";
import { HomeNewChatLauncher } from "../chat/HomeNewChatLauncher";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui.store";
import { HomeShortcutIcon } from "./HomeShortcutIcon";
import type { HomeShellPanelId } from "./useHomeShellPanels";

export type HomeTaskbarProps = {
  activePanel: HomeShellPanelId | null;
  activeTab: string;
  togglePanel: (id: HomeShellPanelId) => void;
  closePanel: () => void;
  onSearch: () => void;
  onSelectHome: () => void;
  onOpenProfessor: () => void;
  /** Reserved right-hand slot where HomeSystemTray mounts during integration. */
  tray?: ReactNode;
  /** Reserved slot for extra pinned entries injected during integration. */
  extraEntries?: ReactNode;
  /** Reserved hook for HomeTaskbarContextMenu's trigger during integration. */
  onContextMenu?: MouseEventHandler<HTMLElement>;
};

const ENTRY_BUTTON_CLASS =
  "mari-win11-taskbar__button group relative flex h-10 w-10 shrink-0 items-center justify-center rounded text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]";

function TaskbarEntryButton({
  label,
  active,
  onClick,
  testId,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(ENTRY_BUTTON_CLASS, active && "mari-win11-taskbar__button--active")}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      data-component={testId}
    >
      {children}
    </button>
  );
}

/** Start button: owns the `start-menu` panel, which the orchestrator renders above the taskbar. */
function TaskbarStartButton({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(ENTRY_BUTTON_CLASS, open && "mari-win11-taskbar__button--active")}
      aria-label={label}
      title={label}
      aria-expanded={open}
      aria-haspopup="menu"
      data-component="HomeBrowserHub.TaskbarStart"
    >
      <LayoutGrid size="1.35rem" className="mari-win11-taskbar__icon" aria-hidden="true" />
    </button>
  );
}

function TaskbarSearchButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(ENTRY_BUTTON_CLASS, "mari-win11-taskbar__search !w-auto justify-start gap-2 rounded-full px-3")}
      aria-label={label}
      title={label}
      data-component="HomeBrowserHub.TaskbarSearch"
    >
      <Search size="1rem" className="shrink-0" aria-hidden="true" />
      <span className="mari-win11-taskbar__search-label truncate text-xs">{label}</span>
    </button>
  );
}

function TaskbarDivider() {
  return <span className="mari-win11-taskbar__divider mx-0.5 h-6 w-1 shrink-0 rounded-full" aria-hidden="true" />;
}

function TaskbarModeEntry({
  mode,
  label,
  onOpen,
}: {
  mode: "conversation" | "roleplay" | "game";
  label: string;
  onOpen: () => void;
}) {
  return (
    // The wrapper only listens for the launcher's click (including keyboard activation) to dismiss
    // whichever shell panel was open; it adds no interactive element of its own.
    <span className="flex max-sm:hidden" onClick={onOpen}>
      <HomeNewChatLauncher
        mode={mode}
        className="!h-10 !w-10 !gap-0 !rounded !border-transparent !bg-transparent !px-0 !py-0 hover:!bg-[var(--marinara-taskbar-hover)]"
        ariaLabel={label}
      >
        <HomeShortcutIcon tone={HOME_CHAT_MODE_ACCENTS[mode]}>
          <ChatModeIcon mode={mode} size="1rem" className="mari-rgb-static-icon" />
        </HomeShortcutIcon>
      </HomeNewChatLauncher>
    </span>
  );
}

/**
 * Windows 11 taskbar: a 48px acrylic bar with a centred entry group and a reserved right-hand tray
 * slot. The start button drives the `start-menu` panel; the widget toggle opens the widget manager
 * through an injected callback, so no shell surface reads HomeBrowserHub state directly.
 */
export const HomeTaskbar = memo(function HomeTaskbar({
  activePanel,
  activeTab,
  togglePanel,
  closePanel,
  onSearch,
  onSelectHome,
  onOpenProfessor,
  tray,
  extraEntries,
  onContextMenu,
}: HomeTaskbarProps) {
  const { t } = useTranslation();
  const startOpen = activePanel === "start-menu";
  const closeThen = (action: () => void) => () => {
    closePanel();
    action();
  };

  return (
    <footer
      className="mari-win11-taskbar relative z-30 flex h-[var(--marinara-taskbar-height)] shrink-0 items-center gap-1 px-2"
      data-component="HomeBrowserHub.Taskbar"
      aria-label={t("home.taskbar.label")}
      onContextMenu={onContextMenu}
    >
      {/* The start menu and tray flyouts rise from this bar; the footer itself stays in the flow so the
          desktop keeps a stable scroll area above it. */}
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="mari-win11-taskbar__group flex h-11 min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-lg px-1.5">
          <TaskbarStartButton
            open={startOpen}
            onToggle={() => togglePanel("start-menu")}
            label={t("home.taskbar.start")}
          />
          <TaskbarSearchButton onClick={onSearch} label={t("home.taskbar.search")} />
          <TaskbarDivider />

          <TaskbarEntryButton
            label={t("home.browser.homeTab")}
            active={activeTab === "home"}
            testId="HomeBrowserHub.TaskbarHome"
            onClick={closeThen(onSelectHome)}
          >
            <HomeIcon size="1.15rem" className="mari-win11-taskbar__icon" aria-hidden="true" />
          </TaskbarEntryButton>
          <TaskbarEntryButton
            label={t("home.browser.professorTab")}
            active={activeTab === "professor"}
            testId="HomeBrowserHub.TaskbarProfessor"
            onClick={closeThen(onOpenProfessor)}
          >
            <img
              src="/sprites/mari/Mari_profile.png"
              alt=""
              className="mari-win11-taskbar__icon h-5 w-5 rounded-sm object-cover"
            />
          </TaskbarEntryButton>
          <TaskbarEntryButton
            label={t("home.widgets.characterLibrary")}
            onClick={closeThen(() => useUIStore.getState().openCharacterLibrary())}
          >
            <LibraryBig size="1.15rem" className="mari-win11-taskbar__icon" aria-hidden="true" />
          </TaskbarEntryButton>
          <TaskbarDivider />

          <TaskbarModeEntry
            mode="conversation"
            label={t("home.shortcuts.newConversation")}
            onOpen={() => closePanel()}
          />
          <TaskbarModeEntry mode="roleplay" label={t("home.shortcuts.newRoleplay")} onOpen={() => closePanel()} />
          <TaskbarModeEntry mode="game" label={t("home.shortcuts.newGame")} onOpen={() => closePanel()} />
          {extraEntries}
        </div>
      </div>
      {tray ? (
        <div className="mari-win11-taskbar__tray flex h-11 shrink-0 items-center gap-1 rounded-lg px-1.5">{tray}</div>
      ) : null}
    </footer>
  );
});
