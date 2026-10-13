import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { MarinaraWordmark } from "./marinara-wordmark";
import { HomeStartMenuPinned, type HomeStartMenuEntry } from "./HomeStartMenuPinned";
import { HomeStartMenuRecommended } from "./HomeStartMenuRecommended";

export type { HomeStartMenuEntry } from "./HomeStartMenuPinned";

export type HomeStartMenuProps = {
  /** Owned by the shell orchestrator; the menu never mounts while this is false. */
  open: boolean;
  onClose: () => void;
  entries: HomeStartMenuEntry[];
  versionLabel: string;
};

const CREDITS_ENTRY_ID = "credits";

/**
 * Windows 11 start menu: pinned grid, recommended chats, and the account bar, floating above the taskbar.
 * Surfaces and mutual exclusion belong to the shell, which drives `open`/`onClose`.
 */
export function HomeStartMenu({ open, onClose, entries, versionLabel }: HomeStartMenuProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedAmbientEffects();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (menuRef.current?.contains(target)) return;
      // The taskbar's start button owns its own toggle; a pointer there must not close-then-reopen.
      if (target?.closest('[data-component="HomeBrowserHub.TaskbarStart"]')) return;
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

  // Credits lives in the bottom bar rather than the pinned grid, matching Windows 11's account slot.
  const { pinnedEntries, creditsEntry } = useMemo(() => {
    const pinned: HomeStartMenuEntry[] = [];
    let credits: HomeStartMenuEntry | null = null;
    for (const entry of entries) {
      if (entry.id === CREDITS_ENTRY_ID) credits = entry;
      else pinned.push(entry);
    }
    return { pinnedEntries: pinned, creditsEntry: credits };
  }, [entries]);

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          ref={menuRef}
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={reduceMotion ? { opacity: 0, x: "-50%" } : { opacity: 0, y: 18, scale: 0.99, x: "-50%" }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
          role="menu"
          aria-label={t("home.startMenu.label")}
          data-component="HomeBrowserHub.StartMenu"
          className="mari-win11-start-menu absolute bottom-[calc(100%+0.5rem)] left-1/2 z-40 flex max-h-[min(36rem,70vh)] w-[min(40rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-[var(--marinara-home-acrylic-border)] bg-marinara-acrylic shadow-[var(--marinara-home-acrylic-shadow)] backdrop-blur-xl"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <HomeStartMenuPinned entries={pinnedEntries} onDismiss={onClose} />
            <HomeStartMenuRecommended onDismiss={onClose} />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--marinara-taskbar-divider)] px-4 py-2">
            <span className="flex min-w-0 items-baseline gap-2">
              <MarinaraWordmark className="truncate text-sm leading-none" />
              <span className="shrink-0 text-[0.62rem] font-semibold text-[var(--muted-foreground)]">
                {versionLabel}
              </span>
            </span>
            {creditsEntry ? (
              <button
                type="button"
                className="shrink-0 rounded px-1.5 py-1 text-[0.68rem] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--marinara-taskbar-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]"
                onClick={() => {
                  onClose();
                  creditsEntry.onClick?.();
                }}
              >
                {creditsEntry.label}
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
