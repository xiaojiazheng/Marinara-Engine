import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, MoonStar, Volume2, Wifi } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui.store";
import { HomeCalendarBody, useHomeCalendarClock } from "../chat/HomeClockCalendar";
import type { HomeShellPanelProps } from "./useHomeShellPanels";

/** "quick-settings" and "clock-flyout" are the only panels this tray consumes. */
export type HomeSystemTrayProps = HomeShellPanelProps & {
  /**
   * Achievements entry, injected by integration. Optional: the shell passes it only while the
   * Achievements setting is on, and the tray hides the bell instead of showing a dead button.
   */
  onOpenAchievements?: () => void;
};

const TRAY_BUTTON_CLASS =
  "mari-win11-taskbar__button group relative flex h-10 items-center justify-center gap-1.5 rounded px-2 text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]";

/** Win11 flyout: 8px radius acrylic surface rising from the taskbar's right end. */
const TRAY_PANEL_CLASS =
  "absolute bottom-[calc(100%+0.55rem)] right-0 z-40 flex flex-col gap-3 rounded-lg border border-[var(--marinara-home-acrylic-border)] bg-marinara-acrylic p-3 shadow-[var(--marinara-home-acrylic-shadow)] backdrop-blur-xl";

const QUICK_SETTING_IDS = ["wifi", "nightLight"] as const;
type QuickSettingId = (typeof QUICK_SETTING_IDS)[number];

const QUICK_SETTING_ICONS = { wifi: Wifi, nightLight: MoonStar } as const;
const QUICK_SETTING_LABEL_KEYS: Record<QuickSettingId, string> = {
  wifi: "home.tray.quickSettings.wifi",
  nightLight: "home.tray.quickSettings.nightLight",
};

/** Spring rise shared by both flyouts; ambient-effects-off gets the same instant swap the start menu uses. */
function panelMotion(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 14, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 14, scale: 0.97 },
    transition: { type: "spring" as const, stiffness: 340, damping: 30, mass: 0.7 },
  };
}

/**
 * Windows 11 system tray: a decorative volume entry that opens the quick-settings flyout, a live
 * HH:MM clock that opens the calendar flyout, and the achievements bell. Panel state is owned by the
 * shell orchestrator and only consumed here; the tray merely requests the close on Escape or an
 * outside pointer. Mounting into the taskbar's reserved tray slot is handled by integration.
 */
export function HomeSystemTray({ activePanel, togglePanel, closePanel, onOpenAchievements }: HomeSystemTrayProps) {
  const { i18n, t } = useTranslation();
  const reduceMotion = useReducedAmbientEffects();
  const timeZone = useUIStore((state) => state.conversationTimeZone);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const now = useHomeCalendarClock();
  const [toggles, setToggles] = useState<Record<QuickSettingId, boolean>>({ wifi: true, nightLight: false });

  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }),
    [locale, timeZone],
  );

  const quickSettingsOpen = activePanel === "quick-settings";
  const clockOpen = activePanel === "clock-flyout";

  useEffect(() => {
    if (!quickSettingsOpen && !clockOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      closePanel();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [quickSettingsOpen, clockOpen, closePanel]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5" data-component="HomeSystemTray">
      <button
        type="button"
        onClick={() => togglePanel("quick-settings")}
        className={cn(
          TRAY_BUTTON_CLASS,
          // Narrow phones keep the informative entries (clock, achievements); volume is decorative.
          "max-sm:!hidden",
          quickSettingsOpen && "mari-win11-taskbar__button--active",
        )}
        aria-label={t("home.tray.quickSettings.title")}
        title={t("home.tray.quickSettings.title")}
        aria-expanded={quickSettingsOpen}
        aria-haspopup="dialog"
        data-component="HomeSystemTray.Volume"
      >
        <Volume2 size="0.95rem" className="mari-win11-taskbar__icon" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => togglePanel("clock-flyout")}
        className={cn(TRAY_BUTTON_CLASS, clockOpen && "mari-win11-taskbar__button--active")}
        aria-label={t("home.tray.clock")}
        title={t("home.tray.clock")}
        aria-expanded={clockOpen}
        aria-haspopup="dialog"
        data-component="HomeSystemTray.Clock"
      >
        <span className="text-xs font-semibold leading-none tabular-nums">{timeFormatter.format(now)}</span>
      </button>

      {onOpenAchievements ? (
        <button
          type="button"
          onClick={onOpenAchievements}
          className={TRAY_BUTTON_CLASS}
          aria-label={t("home.achievements.open")}
          title={t("home.achievements.open")}
          data-component="HomeSystemTray.Achievements"
        >
          <Bell size="0.95rem" className="mari-win11-taskbar__icon" aria-hidden="true" />
          <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" aria-hidden="true" />
        </button>
      ) : null}

      <AnimatePresence initial={false}>
        {quickSettingsOpen ? (
          <motion.div
            {...panelMotion(reduceMotion)}
            key="quick-settings"
            role="dialog"
            aria-label={t("home.tray.quickSettings.title")}
            className={cn(TRAY_PANEL_CLASS, "w-[min(19rem,calc(100vw-1.5rem))]")}
            data-component="HomeSystemTray.QuickSettings"
          >
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {t("home.tray.quickSettings.title")}
            </p>

            <div className="flex items-center gap-2">
              <Volume2 size="0.95rem" className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={42}
                aria-label={t("home.tray.quickSettings.volume")}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)] accent-[var(--primary)] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_SETTING_IDS.map((id) => {
                const pressed = toggles[id];
                const Icon = QUICK_SETTING_ICONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setToggles((current) => ({ ...current, [id]: !current[id] }))}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-semibold transition-colors",
                      pressed
                        ? "border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--foreground)]"
                        : "border-[var(--marinara-home-acrylic-border)] bg-[var(--marinara-taskbar-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <Icon size="0.9rem" className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{t(QUICK_SETTING_LABEL_KEYS[id])}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}

        {clockOpen ? (
          <motion.div
            {...panelMotion(reduceMotion)}
            key="clock-flyout"
            role="dialog"
            aria-label={t("home.tray.clock")}
            className={cn(TRAY_PANEL_CLASS, "w-[min(20rem,calc(100vw-1.5rem))] pb-4")}
            data-component="HomeSystemTray.ClockFlyout"
          >
            <HomeCalendarBody now={now} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
