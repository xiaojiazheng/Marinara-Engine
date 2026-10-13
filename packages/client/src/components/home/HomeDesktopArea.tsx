import { useCallback, useRef, useState, type CSSProperties } from "react";
import type { AchievementEvent } from "@marinara-engine/shared";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../stores/ui.store";
import { HomeDesktopContextMenu, type HomeDesktopContextMenuTarget } from "./HomeDesktopContextMenu";
import { HomeDesktopIconModals } from "./HomeDesktopIconModals";
import { HomeDesktopIcons, type HomeDesktopIconsProps } from "./HomeDesktopIcons";
import { HomeStarfield } from "./HomeStarfield";
import { MarinaraWordmark } from "./marinara-wordmark";
import {
  HOME_DESKTOP_ICON_LABEL_KEYS,
  type HomeDesktopChatModeIconId,
  type HomeDesktopIconId,
} from "./home-desktop-icons-state";
import {
  isHomeDesktopWindowIcon,
  useCharacterOfDay,
  useHomeDesktopIcons,
  type HomeDesktopIconWindowId,
} from "./use-home-desktop-icons";

export type HomeDesktopAreaProps = {
  versionLabel: string;
  achievementsEnabled: boolean;
  /** Right-click target, already gated on the shell's `desktop-context` panel being the open one. */
  contextTarget: HomeDesktopContextMenuTarget | null;
  onRequestContext: (target: HomeDesktopContextMenuTarget) => void;
  onDismissContext: () => void;
  onOpenProfessor: () => void;
  onOpenCredits: () => void;
  onOpenFaq: () => void;
  onOpenPersonalization: () => void;
  onTrackAction: (event: AchievementEvent) => void;
};

const HOME_DESKTOP_BACKGROUND =
  "radial-gradient(circle at 12% 8%, oklch(0.79 0.16 205 / 0.14), transparent 27%), radial-gradient(circle at 87% 12%, oklch(0.73 0.21 345 / 0.14), transparent 29%), radial-gradient(circle at 72% 76%, oklch(0.76 0.19 52 / 0.08), transparent 28%), var(--background)";

const CHAT_MODE_ICON_IDS: readonly HomeDesktopChatModeIconId[] = ["conversation", "roleplay", "game"];

/**
 * The Windows 11 desktop: the wallpaper, the Marinara wordmark, and the icon field. Icons open a
 * window or act on the shell; the taskbar and the shell panels are siblings owned by the orchestrator.
 */
export function HomeDesktopArea({
  versionLabel,
  achievementsEnabled,
  contextTarget,
  onRequestContext,
  onDismissContext,
  onOpenProfessor,
  onOpenCredits,
  onOpenFaq,
  onOpenPersonalization,
  onTrackAction,
}: HomeDesktopAreaProps) {
  const { t } = useTranslation();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const characterOfDay = useCharacterOfDay();
  const [activationSignals, setActivationSignals] = useState<Partial<Record<HomeDesktopIconId, number>>>({});
  const model = useHomeDesktopIcons({
    surfaceRef,
    achievementsEnabled,
    iconLabel: (id) => t(HOME_DESKTOP_ICON_LABEL_KEYS[id]),
  });

  const openIcon = useCallback(
    (id: HomeDesktopIconId) => {
      // The chat-mode icons reuse HomeNewChatLauncher; they ask it to run instead of copying its
      // create-chat pipeline, which owns connections, presets, and multiplayer.
      if ((CHAT_MODE_ICON_IDS as readonly string[]).includes(id)) {
        setActivationSignals((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
        return;
      }
      if (isHomeDesktopWindowIcon(id)) {
        model.setOpenWindowId(id as HomeDesktopIconWindowId);
        return;
      }
      const ui = useUIStore.getState();
      if (id === "character-library") ui.openCharacterLibrary();
      else if (id === "professor") onOpenProfessor();
      else if (id === "discovery") ui.openAgentCatalog();
      else if (characterOfDay) ui.openCharacterDetail(characterOfDay.id);
      else ui.openCharacterLibrary();
    },
    [characterOfDay, model, onOpenProfessor],
  );

  const iconContextMenu: HomeDesktopIconsProps["onIconContextMenu"] = useCallback(
    (id, point) => onRequestContext({ kind: "icon", id, x: point.x, y: point.y }),
    [onRequestContext],
  );

  return (
    <div
      className="mari-win11-desktop relative flex h-full min-h-0 flex-col overflow-hidden"
      style={{ backgroundImage: HOME_DESKTOP_BACKGROUND } as CSSProperties}
      data-component="HomeBrowserHub.HomePage"
      onContextMenu={(event) => {
        event.preventDefault();
        onRequestContext({ kind: "desktop", x: event.clientX, y: event.clientY });
      }}
    >
      <HomeStarfield />
      <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col gap-3 p-[clamp(0.65rem,1vw,1.25rem)]">
        <section
          className="mari-home-hero flex shrink-0 flex-col items-center gap-1 px-[clamp(0.35rem,0.8vw,0.9rem)] text-center"
          data-tour="home-hub"
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-[clamp(1.8rem,2.4vw,2.35rem)] w-auto object-contain"
          />
          <MarinaraWordmark className="block truncate text-[clamp(1.35rem,1.9vw,2.15rem)] leading-none" />
          <span className="block text-[0.5625rem] font-semibold tracking-[0.14em] text-[var(--muted-foreground)]">
            {versionLabel}
          </span>
        </section>
        <HomeDesktopIcons
          model={model}
          surfaceRef={surfaceRef}
          onOpenIcon={openIcon}
          onIconContextMenu={iconContextMenu}
          onClearSelection={() => model.selectIcon(null)}
          activationSignals={activationSignals}
        />
      </div>
      <HomeDesktopContextMenu
        target={contextTarget}
        size={model.size}
        onClose={onDismissContext}
        onSelectSize={model.setSize}
        onSortByName={model.sortByName}
        onRefresh={model.refresh}
        onPersonalize={onOpenPersonalization}
        onOpenIcon={openIcon}
      />
      <HomeDesktopIconModals
        openWindowId={model.openWindowId}
        onClose={() => model.setOpenWindowId(null)}
        onOpenCredits={onOpenCredits}
        onOpenFaq={onOpenFaq}
        onTrackAction={onTrackAction}
      />
    </div>
  );
}
