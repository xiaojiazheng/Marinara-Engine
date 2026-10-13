import type { CSSProperties, ReactNode } from "react";
import { LibraryBig } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatModeIcon } from "../chat/ChatModeIcon";
import { HomeNewChatLauncher } from "../chat/HomeNewChatLauncher";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";
import { useUIStore } from "../../stores/ui.store";

/**
 * One pinned tile. `iconSrc`/`href` keep the relocated bookmark-bar entries working unchanged;
 * everything the orchestrator passes in already matches this shape.
 */
export type HomeStartMenuEntry = {
  id: string;
  label: string;
  tone: string;
  iconSrc?: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  tourTarget?: string;
};

const TILE_CLASS =
  "group flex min-w-0 flex-col items-center gap-1 rounded px-1 py-1.5 text-center text-[var(--foreground)] transition-colors hover:bg-[var(--marinara-taskbar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]";

/** The launch buttons bring their own chrome; this flattens them into the pinned tile look. */
const LAUNCHER_TILE_CLASS =
  "!h-auto !w-full !flex-col !gap-1 !rounded !border-transparent !bg-transparent !px-1 !py-1.5 !text-[var(--foreground)] hover:!bg-[var(--marinara-taskbar-hover)]";

const TILE_LABEL_CLASS = "line-clamp-2 w-full text-[0.75rem] font-medium leading-tight";

const CHAT_MODE_TILES = [
  { mode: "conversation", labelKey: "home.recentChats.mode.conversation", ariaKey: "home.shortcuts.newConversation" },
  { mode: "roleplay", labelKey: "home.recentChats.mode.roleplay", ariaKey: "home.shortcuts.newRoleplay" },
  { mode: "game", labelKey: "home.recentChats.mode.game", ariaKey: "home.shortcuts.newGame" },
] as const;

function TilePlate({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      style={{ "--start-menu-tile-tone": tone } as CSSProperties}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--start-menu-tile-tone)_8%,transparent)] text-[var(--start-menu-tile-tone)] ring-1 ring-[color-mix(in_srgb,var(--start-menu-tile-tone)_16%,transparent)]"
    >
      {children}
    </span>
  );
}

function Tile({ entry, onDismiss }: { entry: HomeStartMenuEntry; onDismiss: () => void }) {
  const content = (
    <>
      <TilePlate tone={entry.tone}>
        {entry.iconSrc ? <img src={entry.iconSrc} alt="" className="h-6 w-6 object-contain" /> : entry.icon}
      </TilePlate>
      <span className={TILE_LABEL_CLASS}>{entry.label}</span>
    </>
  );

  if (entry.href) {
    return (
      <a
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
        className={TILE_CLASS}
        onClick={onDismiss}
        data-tour={entry.tourTarget}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={TILE_CLASS}
      data-tour={entry.tourTarget}
      onClick={() => {
        onDismiss();
        entry.onClick?.();
      }}
    >
      {content}
    </button>
  );
}

/** Pinned grid: the three chat modes and the character library, then the entries the shell hands over. */
export function HomeStartMenuPinned({ entries, onDismiss }: { entries: HomeStartMenuEntry[]; onDismiss: () => void }) {
  const { t } = useTranslation();

  return (
    <section aria-label={t("home.startMenu.pinnedHeading")} data-component="HomeBrowserHub.StartMenuPinned">
      <p className="px-1 pb-1.5 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {t("home.startMenu.pinnedHeading")}
      </p>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {CHAT_MODE_TILES.map(({ mode, labelKey, ariaKey }) => (
          <HomeNewChatLauncher key={mode} mode={mode} ariaLabel={t(ariaKey)} className={LAUNCHER_TILE_CLASS}>
            <TilePlate tone={HOME_CHAT_MODE_ACCENTS[mode]}>
              <ChatModeIcon mode={mode} size="1.5rem" className="mari-rgb-static-icon" aria-hidden="true" />
            </TilePlate>
            <span className={TILE_LABEL_CLASS}>{t(labelKey)}</span>
          </HomeNewChatLauncher>
        ))}
        <Tile
          entry={{
            id: "character-library",
            label: t("home.widgets.characterLibrary"),
            tone: "var(--primary)",
            icon: <LibraryBig size="1.5rem" aria-hidden="true" />,
            onClick: () => useUIStore.getState().openCharacterLibrary(),
          }}
          onDismiss={onDismiss}
        />
        {entries.map((entry) => (
          <Tile key={entry.id} entry={entry} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  );
}
