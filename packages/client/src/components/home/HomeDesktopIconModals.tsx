import { type CSSProperties, type ReactNode } from "react";
import { APP_VERSION, type AchievementEvent } from "@marinara-engine/shared";
import { BookOpen, Clock3, ExternalLink, Heart, MessageCircle, Sparkles, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HomeAchievements } from "../chat/HomeAchievements";
import { HomeCalendarBody, useHomeCalendarClock } from "../chat/HomeClockCalendar";
import { RecentChats } from "../chat/RecentChats";
import { Modal } from "../ui/Modal";
import { HomeWidgetShortcut } from "./home-widget-chrome";
import { useUIStore } from "../../stores/ui.store";
import type { HomeDesktopIconWindowId } from "./use-home-desktop-icons";

export type HomeDesktopIconModalsProps = {
  openWindowId: HomeDesktopIconWindowId | null;
  onClose: () => void;
  onOpenCredits: () => void;
  onOpenFaq: () => void;
  onTrackAction: (event: AchievementEvent) => void;
};

const ENGINE_RELEASE_URL = `https://github.com/Pasta-Devs/Marinara-Engine/releases/tag/v${encodeURIComponent(APP_VERSION)}`;

/** The retired widget cards set `--home-module-accent`; standalone windows need their own value. */
const SHORTCUT_SCOPE = { "--home-module-accent": "var(--primary)" } as CSSProperties;

/**
 * The acrylic windows a desktop icon opens: recent chats, What's New, Learn, Community, the clock, and
 * the achievements preview. The remaining icons act directly on the shell (character library,
 * Professor Mari, agent catalog), so they need no window here.
 *
 * Every window draws Modal's Windows 11 shell — `chrome="window"`, spelled out per window even though
 * it is the default — so the six windows share one surface, corner and shadow definition (§26) with
 * the §24 taskbar instead of carrying window-local styles.
 */

/** Each window repeats the glyph of the desk icon that opened it, at the title bar's 16px. */
const TITLE_ICONS = {
  recent: <MessageCircle size="1rem" />,
  "whats-new": <Sparkles size="1rem" />,
  learn: <BookOpen size="1rem" />,
  community: <Heart size="1rem" />,
  clock: <Clock3 size="1rem" />,
  achievements: <Trophy size="1rem" />,
} as const satisfies Record<HomeDesktopIconWindowId, ReactNode>;

export function HomeDesktopIconModals({
  openWindowId,
  onClose,
  onOpenCredits,
  onOpenFaq,
  onTrackAction,
}: HomeDesktopIconModalsProps) {
  const { t } = useTranslation();
  const now = useHomeCalendarClock();

  return (
    <>
      <Modal
        open={openWindowId === "recent"}
        onClose={onClose}
        title={t("home.desktop.window.recentChats")}
        titleIcon={TITLE_ICONS.recent}
        chrome="window"
        width="max-w-4xl"
        mobileFullscreen
      >
        <RecentChats />
      </Modal>

      <Modal
        open={openWindowId === "whats-new"}
        onClose={onClose}
        title={t("home.whatsNew.title", { version: APP_VERSION })}
        titleIcon={TITLE_ICONS["whats-new"]}
        chrome="window"
        width="max-w-2xl"
      >
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{t("home.whatsNew.description")}</p>
        <a
          href={ENGINE_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {t("home.whatsNew.releaseNotes")} <ExternalLink size="0.7rem" />
        </a>
      </Modal>

      <Modal
        open={openWindowId === "learn"}
        onClose={onClose}
        title={t("home.learn.title")}
        titleIcon={TITLE_ICONS.learn}
        chrome="window"
        width="max-w-2xl"
        mobileFullscreen
      >
        <div className="flex flex-col gap-2" style={SHORTCUT_SCOPE}>
          <HomeWidgetShortcut
            onClick={() => useUIStore.getState().openModal("docs-viewer")}
            icon="/home/tab-icons/documentation.png"
            title={t("home.learn.docsTitle")}
            description={t("home.learn.docsDescription")}
          />
          <HomeWidgetShortcut
            onClick={() => useUIStore.getState().setHasCompletedOnboarding(false)}
            icon="/home/tab-icons/tutorial.png"
            title={t("home.learn.tutorialTitle")}
            description={t("home.learn.tutorialDescription")}
          />
          <HomeWidgetShortcut
            onClick={onOpenFaq}
            icon="/home/tab-icons/faq.png"
            title={t("home.learn.faqTitle")}
            description={t("home.learn.faqDescription")}
          />
        </div>
      </Modal>

      <Modal
        open={openWindowId === "community"}
        onClose={onClose}
        title={t("home.community.title")}
        titleIcon={TITLE_ICONS.community}
        chrome="window"
        width="max-w-2xl"
        mobileFullscreen
      >
        <div className="flex flex-col gap-2" style={SHORTCUT_SCOPE}>
          <HomeWidgetShortcut
            href="https://discord.com/invite/KdAkTg94ME"
            onClick={() => onTrackAction("discord_clicked")}
            icon="/home/tab-icons/discord.svg"
            title={t("home.community.discordTitle")}
            description={t("home.community.discordDescription")}
          />
          <HomeWidgetShortcut
            href="https://ko-fi.com/marinara_spaghetti"
            onClick={() => onTrackAction("kofi_clicked")}
            icon="/home/tab-icons/kofi.png"
            title={t("home.community.supportTitle")}
            description={t("home.community.supportDescription")}
          />
          <HomeWidgetShortcut
            onClick={() => {
              onTrackAction("credits_viewed");
              onOpenCredits();
            }}
            icon="/home/tab-icons/credits.png"
            title={t("home.community.creditsTitle")}
            description={t("home.community.creditsDescription")}
          />
        </div>
      </Modal>

      <Modal
        open={openWindowId === "clock"}
        onClose={onClose}
        title={t("home.clock.title")}
        titleIcon={TITLE_ICONS.clock}
        chrome="window"
        width="max-w-xl"
        mobileFullscreen
      >
        <div className="flex min-h-40 flex-col" data-component="HomeDesktopIconModals.Clock">
          <HomeCalendarBody now={now} />
        </div>
      </Modal>

      <Modal
        open={openWindowId === "achievements"}
        onClose={onClose}
        title={t("home.achievements.title")}
        titleIcon={TITLE_ICONS.achievements}
        chrome="window"
        width="max-w-4xl"
        mobileFullscreen
      >
        {/* The compact preview keeps its own "Open Achievements" entry, which opens the full list. */}
        <div className="flex flex-col" style={SHORTCUT_SCOPE}>
          <HomeAchievements compact className="!h-auto !w-full !border-0 !px-2" />
        </div>
      </Modal>
    </>
  );
}
