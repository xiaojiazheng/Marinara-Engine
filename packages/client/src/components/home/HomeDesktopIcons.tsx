import { memo, type ReactNode, type RefObject } from "react";
import {
  BookOpen,
  Clock3,
  Compass,
  Heart,
  LibraryBig,
  MessageCircle,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatModeIcon } from "../chat/ChatModeIcon";
import { HomeNewChatLauncher } from "../chat/HomeNewChatLauncher";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";
import { cn } from "../../lib/utils";
import { HomeShortcutIcon } from "./HomeShortcutIcon";
import {
  HOME_DESKTOP_ICON_LABEL_KEYS,
  type HomeDesktopChatModeIconId,
  type HomeDesktopIconId,
} from "./home-desktop-icons-state";
import type { HomeDesktopIconsModel } from "./use-home-desktop-icons";

export type HomeDesktopIconsProps = {
  model: HomeDesktopIconsModel;
  /** The field the hook measures; the same node is the drag surface. */
  surfaceRef: RefObject<HTMLDivElement | null>;
  /** Runs the icon's open behaviour: a shell action, or the icon's own window. */
  onOpenIcon: (id: HomeDesktopIconId) => void;
  onIconContextMenu: (id: HomeDesktopIconId, point: { x: number; y: number }) => void;
  onClearSelection: () => void;
  /** Bumped per chat-mode icon when the icon's own click cannot run (the context menu's Open). */
  activationSignals: Partial<Record<HomeDesktopIconId, number>>;
};

const CHAT_MODE_ICON_IDS: readonly HomeDesktopChatModeIconId[] = ["conversation", "roleplay", "game"];

/** Captions sit on the wallpaper, so they carry their own contrast instead of relying on the theme. */
const LABEL_CLASS =
  "line-clamp-2 w-full text-center text-[0.72rem] font-semibold leading-tight text-[var(--foreground)] [text-shadow:0_1px_2px_color-mix(in_srgb,var(--background)_88%,transparent)]";

const GLYPH_CLASS = "h-[46%] w-[46%]";

/**
 * One icon's square. `HomeNewChatLauncher` already owns the three chat-mode launches, so those cells
 * make the launcher their click surface; every other icon is a plain button.
 */
const ICON_SURFACE_CLASS =
  "flex h-full w-full min-w-0 flex-col items-center gap-1.5 rounded-lg border border-transparent px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]";

/** The launcher carries chrome-control defaults, so the icon look has to override them explicitly. */
const LAUNCHER_SURFACE_CLASS = cn(
  ICON_SURFACE_CLASS,
  "!h-full !w-full !gap-1.5 !border-transparent !bg-transparent !px-1 !py-1.5 !text-[var(--foreground)] !shadow-none",
);

const BUILT_IN_GLYPHS: Record<
  Exclude<HomeDesktopIconId, HomeDesktopChatModeIconId>,
  { Glyph: LucideIcon | null; sprite?: string; tone: string }
> = {
  recent: { Glyph: MessageCircle, tone: "var(--marinara-chat-chrome-accent)" },
  "character-library": { Glyph: LibraryBig, tone: "oklch(0.79 0.16 205)" },
  professor: { Glyph: null, sprite: "/sprites/mari/Mari_profile.png", tone: "oklch(0.73 0.21 345)" },
  "whats-new": { Glyph: Sparkles, tone: "oklch(0.76 0.19 52)" },
  learn: { Glyph: BookOpen, tone: "oklch(0.79 0.16 205)" },
  community: { Glyph: Heart, tone: "var(--marinara-chat-chrome-accent)" },
  discovery: { Glyph: Compass, tone: "oklch(0.72 0.17 303)" },
  character: { Glyph: Star, tone: "var(--marinara-chat-chrome-accent)" },
  clock: { Glyph: Clock3, tone: "oklch(0.79 0.16 205)" },
  achievements: { Glyph: Trophy, tone: "oklch(0.76 0.19 52)" },
};

function isChatModeIcon(id: HomeDesktopIconId): id is HomeDesktopChatModeIconId {
  return (CHAT_MODE_ICON_IDS as readonly string[]).includes(id);
}

/**
 * The Windows 11 icon field: a fixed grid of built-in icons the user can select, rearrange by
 * dragging, and open. All state and gestures come from `use-home-desktop-icons`; this file is the
 * presentation and the icon glyph catalogue.
 */
export const HomeDesktopIcons = memo(function HomeDesktopIcons({
  model,
  surfaceRef,
  onOpenIcon,
  onIconContextMenu,
  onClearSelection,
  activationSignals,
}: HomeDesktopIconsProps) {
  const { t } = useTranslation();
  const { icons, positions, selectedId, draggingId } = model;

  return (
    <div
      ref={surfaceRef}
      role="grid"
      aria-label={t("home.desktop.label")}
      className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
      data-component="HomeDesktopIcons"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClearSelection();
      }}
    >
      <div className="mari-home-desktop-grid grid content-start gap-0" style={model.gridStyle}>
        {icons.map((id) => {
          const position = positions[id] ?? { col: 0, row: 0 };
          const selected = selectedId === id;
          const label = t(HOME_DESKTOP_ICON_LABEL_KEYS[id]);
          return (
            <div
              key={id}
              role="gridcell"
              aria-selected={selected}
              data-home-desktop-icon={id}
              data-home-desktop-icon-selected={selected ? "true" : undefined}
              className={cn(
                "mari-home-desktop-icon group relative flex items-center justify-center",
                draggingId === id && "mari-home-desktop-icon--dragging",
              )}
              style={{ gridColumnStart: position.col + 1, gridRowStart: position.row + 1 }}
              onPointerDown={(event) => model.beginDrag(id, event)}
              onPointerMove={model.moveDrag}
              onPointerUp={model.endDrag}
              onPointerCancel={model.endDrag}
              onClickCapture={(event) => model.handleIconClickCapture(event, id)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                model.selectIcon(id);
                onIconContextMenu(id, { x: event.clientX, y: event.clientY });
              }}
            >
              {isChatModeIcon(id) ? (
                <HomeNewChatLauncher
                  mode={id}
                  ariaLabel={label}
                  activationSignal={activationSignals[id]}
                  className={LAUNCHER_SURFACE_CLASS}
                >
                  <DesktopIconPlate tone={HOME_CHAT_MODE_ACCENTS[id]}>
                    <ChatModeIcon mode={id} className={cn(GLYPH_CLASS, "mari-rgb-static-icon")} />
                  </DesktopIconPlate>
                  <span className={LABEL_CLASS}>{label}</span>
                </HomeNewChatLauncher>
              ) : (
                <button
                  type="button"
                  aria-label={label}
                  className={ICON_SURFACE_CLASS}
                  onDoubleClick={() => onOpenIcon(id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenIcon(id);
                    }
                  }}
                >
                  <DesktopIconPlate tone={BUILT_IN_GLYPHS[id].tone}>
                    <DesktopIconGlyph id={id} />
                  </DesktopIconPlate>
                  <span className={LABEL_CLASS}>{label}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function DesktopIconPlate({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <HomeShortcutIcon tone={tone} className="h-(--mari-desktop-tile-size) w-(--mari-desktop-tile-size) rounded-xl">
      {children}
    </HomeShortcutIcon>
  );
}

/** Professor Mari is a sprite rather than a line icon, exactly as she appears on the taskbar. */
function DesktopIconGlyph({ id }: { id: Exclude<HomeDesktopIconId, HomeDesktopChatModeIconId> }) {
  const { Glyph, sprite } = BUILT_IN_GLYPHS[id];
  if (sprite) {
    return <img src={sprite} alt="" draggable={false} className={cn(GLYPH_CLASS, "rounded-md object-cover")} />;
  }
  if (!Glyph) return null;
  return <Glyph className={GLYPH_CLASS} aria-hidden="true" />;
}
