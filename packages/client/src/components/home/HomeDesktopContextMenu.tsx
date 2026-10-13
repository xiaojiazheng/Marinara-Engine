import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpAZ, Check, Palette, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { cn } from "../../lib/utils";
import { clampMenuToViewport } from "./HomeTaskbarContextMenu";
import {
  HOME_DESKTOP_ICON_SIZE_ORDER,
  type HomeDesktopIconId,
  type HomeDesktopIconSize,
} from "./home-desktop-icons-state";

/** Where the right-click landed: blank desk, or one of the icons on it. */
export type HomeDesktopContextMenuTarget =
  { kind: "desktop"; x: number; y: number } | { kind: "icon"; id: HomeDesktopIconId; x: number; y: number };

export type HomeDesktopContextMenuProps = {
  target: HomeDesktopContextMenuTarget | null;
  size: HomeDesktopIconSize;
  onClose: () => void;
  onSelectSize: (size: HomeDesktopIconSize) => void;
  onSortByName: () => void;
  onRefresh: () => void;
  onPersonalize: () => void;
  onOpenIcon: (id: HomeDesktopIconId) => void;
};

const MENU_WIDTH = 224;
/** Taller of the two menus (View group + Sort by + Refresh + Personalize); the clamp only needs a bound. */
const MENU_HEIGHT = 280;

const SIZE_LABEL_KEYS: Record<HomeDesktopIconSize, string> = {
  large: "home.desktop.contextMenu.view.large",
  medium: "home.desktop.contextMenu.view.medium",
  small: "home.desktop.contextMenu.view.small",
};

const ITEM_CLASS =
  "flex h-9 w-full items-center gap-2.5 rounded-[3px] px-2.5 text-left text-xs font-semibold text-[var(--foreground)] outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]";

const MENU_CLASS =
  "fixed z-50 flex w-56 flex-col gap-0.5 rounded-[7px] border border-[var(--marinara-home-acrylic-border)] bg-marinara-acrylic p-1 shadow-[var(--marinara-home-acrylic-shadow)] backdrop-blur-xl";

const DIVIDER_CLASS = "mx-1 my-0.5 h-px shrink-0 bg-[var(--marinara-taskbar-divider)]";

/**
 * The desk's right-click menus, sharing the taskbar menu's acrylic surface and viewport clamping.
 * Blank-desktop right-click offers View / Sort by / Refresh / Personalize; right-clicking an icon
 * offers the shorter Open / Refresh pair, anchored at the pointer by the icon itself.
 */
export function HomeDesktopContextMenu({
  target,
  size,
  onClose,
  onSelectSize,
  onSortByName,
  onRefresh,
  onPersonalize,
  onOpenIcon,
}: HomeDesktopContextMenuProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedAmbientEffects();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!target) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [target, onClose]);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <AnimatePresence initial={false}>
      {target ? (
        <motion.div
          ref={menuRef}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
          role="menu"
          aria-label={t(
            target.kind === "desktop" ? "home.desktop.contextMenu.label" : "home.desktop.contextMenu.iconLabel",
          )}
          style={{
            ...clampMenuToViewport(target.x, target.y, MENU_WIDTH, MENU_HEIGHT),
            transformOrigin: "top left",
          }}
          className={MENU_CLASS}
          data-component="HomeDesktopContextMenu"
        >
          {target.kind === "icon" ? (
            <>
              <button
                type="button"
                role="menuitem"
                className={cn(ITEM_CLASS, "font-bold")}
                onClick={run(() => onOpenIcon(target.id))}
              >
                <span className="truncate">{t("home.desktop.contextMenu.open")}</span>
              </button>
              <span className={DIVIDER_CLASS} aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                className={ITEM_CLASS}
                title={t("home.desktop.contextMenu.refreshHint")}
                onClick={run(onRefresh)}
              >
                <RefreshCw size="0.9rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
                <span className="truncate">{t("home.desktop.contextMenu.refresh")}</span>
              </button>
            </>
          ) : (
            <>
              <p className="px-2.5 pb-0.5 pt-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {t("home.desktop.contextMenu.view")}
              </p>
              {HOME_DESKTOP_ICON_SIZE_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={option === size}
                  className={ITEM_CLASS}
                  onClick={run(() => onSelectSize(option))}
                >
                  <Check
                    size="0.9rem"
                    className={cn("shrink-0", option === size ? "text-[var(--foreground)]" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{t(SIZE_LABEL_KEYS[option])}</span>
                </button>
              ))}
              <span className={DIVIDER_CLASS} aria-hidden="true" />
              <button type="button" role="menuitem" className={ITEM_CLASS} onClick={run(onSortByName)}>
                <ArrowUpAZ size="0.9rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
                <span className="truncate">
                  {t("home.desktop.contextMenu.sort")}: {t("home.desktop.contextMenu.sort.name")}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={ITEM_CLASS}
                title={t("home.desktop.contextMenu.refreshHint")}
                onClick={run(onRefresh)}
              >
                <RefreshCw size="0.9rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
                <span className="truncate">{t("home.desktop.contextMenu.refresh")}</span>
              </button>
              <span className={DIVIDER_CLASS} aria-hidden="true" />
              <button type="button" role="menuitem" className={ITEM_CLASS} onClick={run(onPersonalize)}>
                <Palette size="0.9rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
                <span className="truncate">{t("home.desktop.contextMenu.personalize")}</span>
              </button>
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
