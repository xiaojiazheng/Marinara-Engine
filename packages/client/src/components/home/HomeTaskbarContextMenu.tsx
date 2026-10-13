import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { cn } from "../../lib/utils";

export type HomeTaskbarContextMenuProps = {
  open: boolean;
  onClose: () => void;
  /** "Taskbar settings" entry — opens the app appearance settings. */
  onOpenTaskbarSettings: () => void;
  /** Pointer coordinates from the originating contextmenu event. Without them the menu anchors above the taskbar's right end. */
  x?: number;
  y?: number;
};

const MENU_WIDTH = 208; // w-52
const MENU_HEIGHT = 48; // one 2.25rem row + the container's padding
const VIEWPORT_MARGIN = 8;

const ITEM_CLASS =
  "flex h-9 w-full items-center gap-2.5 rounded-[3px] px-2.5 text-left text-xs font-semibold text-[var(--foreground)] outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]";

/**
 * Anchors a pointer-positioned menu inside the viewport. Shared with the desk's context menu so both
 * menus clamp their own size the same way.
 */
export function clampMenuToViewport(x: number, y: number, menuWidth: number, menuHeight: number) {
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(x, viewportWidth - menuWidth - VIEWPORT_MARGIN)),
    top: Math.max(VIEWPORT_MARGIN, Math.min(y, viewportHeight - menuHeight - VIEWPORT_MARGIN)),
  };
}

/**
 * Windows 11 taskbar context menu: a 7px acrylic menu with the taskbar settings entry. The shell owns
 * `open`; the callback is injected by integration so the menu reads no HomeBrowserHub state.
 */
export function HomeTaskbarContextMenu({ open, onClose, onOpenTaskbarSettings, x, y }: HomeTaskbarContextMenuProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedAmbientEffects();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const positioned = x !== undefined && y !== undefined;
  const entries = [
    {
      id: "taskbar-settings",
      label: t("home.taskbarContext.settings"),
      Icon: SlidersHorizontal,
      onSelect: onOpenTaskbarSettings,
    },
  ];

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          ref={menuRef}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
          role="menu"
          aria-label={t("home.taskbarContext.label")}
          style={{
            ...(positioned ? clampMenuToViewport(x, y, MENU_WIDTH, MENU_HEIGHT) : null),
            transformOrigin: "top left",
          }}
          className={cn(
            "fixed z-50 flex w-52 flex-col gap-0.5 rounded-[7px] border border-[var(--marinara-home-acrylic-border)] bg-marinara-acrylic p-1 shadow-[var(--marinara-home-acrylic-shadow)] backdrop-blur-xl",
            !positioned && "bottom-14 right-3",
          )}
          data-component="HomeTaskbarContextMenu"
        >
          {entries.map(({ id, label, Icon, onSelect }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onSelect();
              }}
              className={ITEM_CLASS}
            >
              <Icon size="0.9rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
