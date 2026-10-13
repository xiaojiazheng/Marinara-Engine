import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bot, RefreshCw, Star } from "lucide-react";
import { APP_VERSION, type SceneFullPlan } from "@marinara-engine/shared";
import { useTranslation } from "react-i18next";
import { useAgentConfigs } from "../../hooks/use-agents";
import { useChats } from "../../hooks/use-chats";
import { useAllCharacterCatalog, usePersonas } from "../../hooks/use-characters";
import { selectHomeBrowserPackages, useInstalledCapabilityPackages } from "../../hooks/use-capability-packages";
import { useLorebooks } from "../../hooks/use-lorebooks";
import { usePresets } from "../../hooks/use-presets";
import { achievementKeys, trackAchievementEvent } from "../../hooks/use-achievements";
import { api } from "../../lib/api-client";
import { resolveCapabilityPackageDisplay } from "../../lib/capability-package-localization";
import {
  PROFESSOR_MARI_NAVIGATOR_RESET_EVENT,
  resolveProfessorMariNavigation,
  type ProfessorMariBrowserTab,
  type ProfessorMariNavigationResource,
  type ProfessorMariNavigationTarget,
} from "../../lib/professor-mari-navigation";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui.store";
import { startSceneWithPromptPreferences } from "../../lib/scene-generation";
import { useChatStore } from "../../stores/chat.store";
import { CapabilityElement } from "../capabilities/CapabilityElement";
import { Modal } from "../ui/Modal";
import { HomeAchievements } from "./HomeAchievements";
import { HomeFaq } from "./HomeFaq";
import { HomeProfessorMariChat } from "./HomeProfessorMariChat";
import { FloatingProfessorMari } from "../home/FloatingProfessorMari";
import type { HomeDesktopContextMenuTarget } from "../home/HomeDesktopContextMenu";
import { HomeDesktopArea } from "../home/HomeDesktopArea";
import { HomeStarfield } from "../home/HomeStarfield";
import { HomeStartMenu, type HomeStartMenuEntry } from "../home/HomeStartMenu";
import { HomeSystemTray } from "../home/HomeSystemTray";
import { HomeTaskbar } from "../home/HomeTaskbar";
import { HomeTaskbarContextMenu } from "../home/HomeTaskbarContextMenu";
import { useHomeShellPanels } from "../home/useHomeShellPanels";

const HOME_BROWSER_PANEL_ID = "marinara-home-browser-panel";
const NOODLE_REFRESH_SEEN_STORAGE_KEY = "marinara:home:noodle-refresh-seen:v1";
const HOME_START_MENU_ENTRY_TONES = {
  discord: "#5865F2",
  support: "#ff6433",
  credits: "oklch(0.76 0.19 52)",
  documentation: "oklch(0.79 0.16 205)",
  tutorial: "oklch(0.76 0.19 52)",
  faq: "var(--marinara-chat-chrome-accent)",
  achievements: "oklch(0.76 0.19 52)",
} as const;

function homeBrowserTabId(tabId: string) {
  return `marinara-home-tab-${tabId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function readSeenNoodleRefreshMarker(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(NOODLE_REFRESH_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberSeenNoodleRefreshMarker(marker: string) {
  try {
    window.localStorage.setItem(NOODLE_REFRESH_SEEN_STORAGE_KEY, marker);
  } catch {
    /* Local storage is optional; the badge still clears for the current mount. */
  }
}

function capabilityPackageAssetUrl(packageId: string, version: string, assetPath: string): string {
  const encodedPath = assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/capability-packages/${encodeURIComponent(packageId)}/assets/${encodedPath}?v=${encodeURIComponent(version)}`;
}

function BrowserPackageTabIcon({
  packageId,
  version,
  iconPaths,
}: {
  packageId: string;
  version: string;
  iconPaths: readonly string[] | undefined;
}) {
  if (!iconPaths?.length) return <Bot size="0.8rem" className="mari-chrome-accent-icon mari-accent-animated" />;
  if (iconPaths.length === 1) {
    return (
      <img
        src={capabilityPackageAssetUrl(packageId, version, iconPaths[0]!)}
        alt=""
        draggable={false}
        className="h-4 w-5 shrink-0 object-contain"
      />
    );
  }
  return (
    <span aria-hidden="true" className="relative h-4 w-5 shrink-0">
      {iconPaths.slice(0, 2).map((iconPath, index) => (
        <img
          key={iconPath}
          src={capabilityPackageAssetUrl(packageId, version, iconPath)}
          alt=""
          draggable={false}
          className={cn(
            "absolute h-2.5 w-4 object-contain drop-shadow-[0_1px_1px_oklch(0_0_0/0.18)]",
            index === 0 ? "left-0 top-0" : "bottom-0 right-0",
          )}
        />
      ))}
    </span>
  );
}

type HomeBrowserHubProps = {
  pageActive: boolean;
  professorChatActive: boolean;
  professorChatOpen: boolean;
  onProfessorChatOpenChange: (open: boolean) => void;
  onProfessorChatExitComplete: () => void;
  onOpenCredits: () => void;
};

/**
 * Home shell orchestrator: the tab strip, the capability-package surfaces, the Windows 11 desktop
 * and taskbar, and the shell-level dialogs. The desktop's widget grid and the floating Professor Mari
 * navigator live in `components/home/`.
 */
export function HomeBrowserHub({
  pageActive,
  professorChatActive,
  professorChatOpen,
  onProfessorChatOpenChange,
  onProfessorChatExitComplete,
  onOpenCredits,
}: HomeBrowserHubProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const installedChannel = useQuery<{ channel: "stable" | "staging" }>({
    queryKey: ["update-channel"],
    queryFn: () => api.get("/updates/channel"),
    staleTime: 30_000,
  });
  const versionLabel = t(
    installedChannel.data?.channel === "staging" ? "home.browser.stagingVersion" : "home.browser.version",
    { version: APP_VERSION },
  );
  const installed = useInstalledCapabilityPackages();
  const characterCatalog = useAllCharacterCatalog();
  const personas = usePersonas();
  const presets = usePresets();
  const lorebooks = useLorebooks(undefined, { includeHidden: true });
  const agents = useAgentConfigs();
  const chats = useChats();
  const debugMode = useUIStore((state) => state.debugMode);
  const reviewImagePromptsBeforeSend = useUIStore((state) => state.reviewImagePromptsBeforeSend);
  const conversationTimeZone = useUIStore((state) => state.conversationTimeZone);
  const sceneOriginFocus = useUIStore((state) => state.sceneOriginFocus);
  const setSceneOriginFocus = useUIStore((state) => state.setSceneOriginFocus);
  const achievementsEnabled = useUIStore((state) => state.achievementsEnabled);
  const professorMariNavigationEnabled = useUIStore((state) => state.professorMariNavigationEnabled);
  const hasCompletedOnboarding = useUIStore((state) => state.hasCompletedOnboarding);
  const showHomeBrowserAddressBar = useUIStore((state) => state.showHomeBrowserAddressBar);
  const browserPackages = useMemo(() => selectHomeBrowserPackages(installed.data), [installed.data]);
  const localizedBrowserPackages = useMemo(
    () =>
      browserPackages.map((item) => ({
        item,
        display: resolveCapabilityPackageDisplay(item.manifest, i18n.resolvedLanguage ?? i18n.language),
      })),
    [browserPackages, i18n.language, i18n.resolvedLanguage],
  );
  const noodleBrowserPackage = useMemo(
    () => browserPackages.find((item) => item.id === "noodle") ?? null,
    [browserPackages],
  );
  const [activeTab, setActiveTab] = useState("home");
  const [seenNoodleRefreshMarker, setSeenNoodleRefreshMarker] = useState(readSeenNoodleRefreshMarker);
  const [faqOpen, setFaqOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [focusedPackagePost, setFocusedPackagePost] = useState<{ packageId: string; postId: string } | null>(null);
  const [taskbarMenuPoint, setTaskbarMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const [desktopMenuTarget, setDesktopMenuTarget] = useState<HomeDesktopContextMenuTarget | null>(null);
  const { activePanel, setPanel, togglePanel, closePanel } = useHomeShellPanels();
  const contentRef = useRef<HTMLElement | null>(null);
  const pendingProfessorExitTabRef = useRef<string | null>(null);
  const noodleRefreshIndicator = useQuery({
    queryKey: ["home-browser", "noodle-refresh-indicator", noodleBrowserPackage?.version ?? "unavailable"],
    queryFn: () => api.get<{ marker: string | null }>("/noodle/refresh-indicator"),
    enabled: pageActive && Boolean(noodleBrowserPackage),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  const latestNoodleRefreshMarker = noodleRefreshIndicator.data?.marker ?? null;
  const noodleRefreshUnread = Boolean(
    latestNoodleRefreshMarker && latestNoodleRefreshMarker !== seenNoodleRefreshMarker && activeTab !== "noodle",
  );

  useEffect(() => {
    if (activeTab === "home" || activeTab === "professor") return;
    if (!browserPackages.some((item) => item.id === activeTab)) setActiveTab("home");
  }, [activeTab, browserPackages]);

  // A scene that ended, or its Back button, asks for the package thread it started in.
  useEffect(() => {
    if (sceneOriginFocus && browserPackages.some((item) => item.id === sceneOriginFocus.packageId)) {
      setActiveTab(sceneOriginFocus.packageId);
    }
  }, [browserPackages, sceneOriginFocus]);

  useEffect(() => {
    if (activeTab !== "noodle" || !latestNoodleRefreshMarker) return;
    setSeenNoodleRefreshMarker((current) => {
      if (current === latestNoodleRefreshMarker) return current;
      rememberSeenNoodleRefreshMarker(latestNoodleRefreshMarker);
      return latestNoodleRefreshMarker;
    });
  }, [activeTab, latestNoodleRefreshMarker]);

  useEffect(() => {
    if (professorChatActive) setActiveTab("professor");
  }, [professorChatActive]);

  const address = `marinara/${activeTab}`;
  // The Win11 desktop owns its own navigation: the taskbar's Home/Professor entries replace the tab
  // strip, so the browser chrome only remains where package views still need tab-to-tab navigation
  // and a location readout.
  const showBrowserChrome = activeTab !== "home" && activeTab !== "professor";
  const selectTab = useCallback(
    (tab: string) => {
      setFocusedPackagePost((current) => (current?.packageId === tab ? current : null));
      if (sceneOriginFocus && sceneOriginFocus.packageId !== tab) setSceneOriginFocus(null);
      if (tab === "professor") {
        pendingProfessorExitTabRef.current = null;
        setActiveTab(tab);
        onProfessorChatOpenChange(true);
        return;
      }
      if (activeTab === "professor") {
        pendingProfessorExitTabRef.current = tab;
        onProfessorChatOpenChange(false);
        return;
      }
      setActiveTab(tab);
      onProfessorChatOpenChange(false);
    },
    [activeTab, onProfessorChatOpenChange, sceneOriginFocus, setSceneOriginFocus],
  );
  const completeProfessorExit = useCallback(() => {
    const target = pendingProfessorExitTabRef.current;
    pendingProfessorExitTabRef.current = null;
    onProfessorChatExitComplete();
    if (target) setActiveTab(target);
  }, [onProfessorChatExitComplete]);
  const openProfessor = useCallback(() => selectTab("professor"), [selectTab]);
  const openHome = useCallback(() => selectTab("home"), [selectTab]);
  const trackHomeAction = useCallback(
    (event: Parameters<typeof trackAchievementEvent>[0]) => {
      void trackAchievementEvent(event, { keepalive: true })
        .catch(() => undefined)
        .finally(() => void queryClient.invalidateQueries({ queryKey: achievementKeys.all }));
    },
    [queryClient],
  );
  const openDocumentation = useCallback(() => useUIStore.getState().openModal("docs-viewer"), []);
  const handleSearch = useCallback(() => {
    closePanel();
    const ui = useUIStore.getState();
    if (!ui.professorMariNavigationEnabled) {
      ui.setProfessorMariNavigationEnabled(true);
      return;
    }
    // Already enabled: reseat the navigator on screen instead of toggling a persisted preference twice.
    window.dispatchEvent(new CustomEvent(PROFESSOR_MARI_NAVIGATOR_RESET_EVENT));
  }, [closePanel]);
  const handleOpenAchievements = useCallback(() => setAchievementsOpen(true), []);
  const handleOpenTaskbarSettings = useCallback(() => {
    closePanel();
    const ui = useUIStore.getState();
    ui.setSettingsTab("appearance");
    ui.setSettingsTargetControlId(null);
    ui.openRightPanel("settings");
  }, [closePanel]);
  const handleTaskbarContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      setTaskbarMenuPoint({ x: event.clientX, y: event.clientY });
      setPanel("taskbar-context");
    },
    [setPanel],
  );
  // One panel slot covers both right-click menus, so opening the desk menu closes the taskbar's.
  const handleDesktopContextMenu = useCallback(
    (target: HomeDesktopContextMenuTarget) => {
      setDesktopMenuTarget(target);
      setPanel("desktop-context");
    },
    [setPanel],
  );
  const handleDesktopMenuDismiss = useCallback(() => {
    closePanel();
    setDesktopMenuTarget(null);
  }, [closePanel]);
  // Memoised so the taskbar's React.memo keeps holding: a fresh element every render would defeat it.
  // The achievements bell only mounts while the setting is on, so the tray never shows a dead entry.
  const tray = useMemo(
    () => (
      <HomeSystemTray
        activePanel={activePanel}
        togglePanel={togglePanel}
        closePanel={closePanel}
        onOpenAchievements={achievementsEnabled ? handleOpenAchievements : undefined}
      />
    ),
    [achievementsEnabled, activePanel, closePanel, handleOpenAchievements, togglePanel],
  );

  const startMenuEntries = useMemo<HomeStartMenuEntry[]>(() => {
    const entries: HomeStartMenuEntry[] = [
      {
        id: "discord",
        label: t("home.browser.bookmarks.discord"),
        tone: HOME_START_MENU_ENTRY_TONES.discord,
        iconSrc: "/home/tab-icons/discord.svg",
        href: "https://discord.com/invite/KdAkTg94ME",
        onClick: () => trackHomeAction("discord_clicked"),
      },
      {
        id: "support",
        label: t("home.actions.support"),
        tone: HOME_START_MENU_ENTRY_TONES.support,
        iconSrc: "/home/tab-icons/kofi.png",
        href: "https://ko-fi.com/marinara_spaghetti",
        onClick: () => trackHomeAction("kofi_clicked"),
      },
      {
        id: "credits",
        label: t("home.actions.credits"),
        tone: HOME_START_MENU_ENTRY_TONES.credits,
        iconSrc: "/home/tab-icons/credits.png",
        onClick: () => {
          trackHomeAction("credits_viewed");
          onOpenCredits();
        },
      },
      {
        id: "documentation",
        label: t("home.actions.documentation"),
        tone: HOME_START_MENU_ENTRY_TONES.documentation,
        iconSrc: "/home/tab-icons/documentation.png",
        onClick: () => useUIStore.getState().openModal("docs-viewer"),
        tourTarget: "home-documentation",
      },
      {
        id: "tutorial",
        label: t("home.browser.bookmarks.tutorial"),
        tone: HOME_START_MENU_ENTRY_TONES.tutorial,
        iconSrc: "/home/tab-icons/tutorial.png",
        onClick: () => useUIStore.getState().setHasCompletedOnboarding(false),
        tourTarget: "home-tutorial",
      },
      {
        id: "faq",
        label: t("home.browser.faqTab"),
        tone: HOME_START_MENU_ENTRY_TONES.faq,
        iconSrc: "/home/tab-icons/faq.png",
        onClick: () => setFaqOpen(true),
        tourTarget: "home-faq",
      },
    ];
    if (achievementsEnabled) {
      entries.splice(6, 0, {
        id: "achievements",
        label: t("home.browser.achievements"),
        tone: HOME_START_MENU_ENTRY_TONES.achievements,
        iconSrc: "/home/tab-icons/achievements.png",
        onClick: () => setAchievementsOpen(true),
      });
    }
    return entries;
  }, [achievementsEnabled, onOpenCredits, t, trackHomeAction]);

  const professorMariBrowserTabs = useMemo<ProfessorMariBrowserTab[]>(
    () =>
      localizedBrowserPackages.map(({ item, display }) => ({
        id: item.id,
        label: display.homeBrowserTab?.label ?? display.name,
        aliases: [item.manifest.name, display.name],
      })),
    [localizedBrowserPackages],
  );
  const professorMariResources = useMemo<ProfessorMariNavigationResource[]>(() => {
    const characterResources = (characterCatalog.data ?? []).flatMap((row) =>
      row.name.trim()
        ? [
            {
              kind: "character" as const,
              id: row.id,
              name: row.name,
              searchText: [
                row.summary,
                row.explicitSummary,
                row.creatorNotes,
                row.description,
                row.personality,
                row.scenario,
                row.firstMessage,
                row.creator,
                ...row.tags,
              ],
            },
          ]
        : [],
    );
    return [
      ...characterResources,
      ...(personas.data ?? []).map((persona) => ({ kind: "persona" as const, id: persona.id, name: persona.name })),
      ...(presets.data ?? []).map((preset) => ({ kind: "preset" as const, id: preset.id, name: preset.name })),
      ...(lorebooks.data ?? []).map((lorebook) => ({
        kind: "lorebook" as const,
        id: lorebook.id,
        name: lorebook.name,
      })),
      ...(agents.data ?? []).map((agent) => ({
        kind: "agent" as const,
        id: agent.type,
        name: agent.name,
        aliases: [agent.type],
      })),
    ];
  }, [agents.data, characterCatalog.data, lorebooks.data, personas.data, presets.data]);
  const openProfessorMariTarget = useCallback(
    (target: ProfessorMariNavigationTarget) => {
      const ui = useUIStore.getState();
      if (target.kind === "home") {
        selectTab("home");
        return;
      }
      if (target.kind === "professor") {
        selectTab("professor");
        return;
      }
      if (target.kind === "chats") {
        ui.closeRightPanel();
        ui.setSidebarOpen(true);
        return;
      }
      if (target.kind === "chat") {
        ui.closeRightPanel();
        ui.setSidebarOpen(true);
        useChatStore.getState().setActiveChatId(target.chatId);
        return;
      }
      if (target.kind === "panel") {
        ui.openRightPanel(target.panel);
        return;
      }
      if (target.kind === "settings") {
        ui.setSettingsTab(target.tab);
        ui.setSettingsTargetControlId(target.controlId ?? null);
        ui.openRightPanel("settings");
        return;
      }
      if (target.kind === "surface") {
        if (target.surface === "card-downloads") ui.openBotBrowser();
        else if (target.surface === "character-library") ui.openCharacterLibrary();
        else if (target.surface === "persona-library") ui.openPersonaLibrary();
        else if (target.surface === "agent-catalog") ui.openAgentCatalog();
        else ui.openGameAssetsBrowser();
        return;
      }
      if (target.kind === "resource") {
        if (target.resource === "character") ui.openCharacterDetail(target.id);
        else if (target.resource === "persona") ui.openPersonaDetail(target.id);
        else if (target.resource === "preset") ui.openPresetDetail(target.id);
        else if (target.resource === "lorebook") ui.openLorebookDetail(target.id);
        else ui.openAgentDetail(target.id);
        return;
      }
      if (target.kind === "window") {
        if (target.window === "discord") {
          trackHomeAction("discord_clicked");
          window.open("https://discord.com/invite/KdAkTg94ME", "_blank", "noopener,noreferrer");
        } else if (target.window === "support") {
          trackHomeAction("kofi_clicked");
          window.open("https://ko-fi.com/marinara_spaghetti", "_blank", "noopener,noreferrer");
        } else if (target.window === "documentation") ui.openModal("docs-viewer");
        else if (target.window === "faq") setFaqOpen(true);
        else if (target.window === "tutorial") ui.setHasCompletedOnboarding(false);
        else {
          trackHomeAction("credits_viewed");
          onOpenCredits();
        }
        return;
      }
      selectTab(target.packageId);
    },
    [onOpenCredits, selectTab, trackHomeAction],
  );
  const resolveWithProfessorMari = useCallback(
    (query: string) =>
      resolveProfessorMariNavigation(query, professorMariBrowserTabs, professorMariResources, chats.data ?? []),
    [chats.data, professorMariBrowserTabs, professorMariResources],
  );

  return (
    <div
      className="mari-chrome-token-scope relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--background)]"
      data-component="HomeBrowserHub"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border border-[var(--border)]/75 bg-[var(--card)]/65 shadow-2xl shadow-black/25 sm:rounded-xl">
        {showBrowserChrome ? (
          <header className="mari-home-browser-chrome relative z-40 shrink-0 border-b border-[var(--marinara-topbar-border)] bg-[var(--marinara-topbar-surface)] shadow-[0_8px_28px_-26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div
              className="flex h-10 min-w-0 items-end gap-0.5 overflow-hidden border-b border-[var(--border)]/45 px-2 sm:gap-1 sm:overflow-x-auto sm:px-3"
              role="tablist"
              aria-label={t("home.browser.tabsLabel")}
              data-component="HomeBrowserHub.TabList"
            >
              <button
                id={homeBrowserTabId("home")}
                type="button"
                role="tab"
                aria-controls={HOME_BROWSER_PANEL_ID}
                aria-label={t("home.browser.homeTab")}
                aria-selected={activeTab === "home"}
                onClick={openHome}
                className={cn(
                  "flex min-h-9 min-w-0 items-center justify-center rounded-t-lg border border-b-0 text-[0.65rem] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[oklch(0.79_0.16_205)] sm:min-w-[6.5rem] sm:w-auto sm:flex-none sm:gap-1.5 sm:px-3 sm:text-xs",
                  activeTab === "home" ? "flex-1 gap-1 px-2" : "w-9 flex-none gap-0 px-0",
                  activeTab === "home"
                    ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                )}
              >
                <img src="/home/tab-icons/home.png" alt="" className="h-[1.125rem] w-[1.125rem] object-contain" />
                <span className={cn("min-w-0 truncate", activeTab === "home" ? "block" : "hidden sm:block")}>
                  {t("home.browser.homeTab")}
                </span>
              </button>
              <button
                id={homeBrowserTabId("professor")}
                type="button"
                role="tab"
                aria-controls={HOME_BROWSER_PANEL_ID}
                aria-label={t("home.browser.professorTab")}
                aria-selected={activeTab === "professor"}
                onClick={openProfessor}
                className={cn(
                  "flex min-h-9 min-w-0 items-center justify-center rounded-t-lg border border-b-0 text-[0.65rem] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--marinara-chat-chrome-focus-ring)] sm:min-w-[6.5rem] sm:w-auto sm:flex-none sm:gap-1.5 sm:px-3 sm:text-xs",
                  activeTab === "professor" ? "flex-1 gap-1 px-2" : "w-9 flex-none gap-0 px-0",
                  activeTab === "professor"
                    ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                )}
              >
                <img src="/sprites/mari/Mari_profile.png" alt="" className="h-4 w-4 rounded-sm object-cover" />
                <span className={cn("min-w-0 truncate", activeTab === "professor" ? "block" : "hidden sm:block")}>
                  {t("home.browser.professorTab")}
                </span>
              </button>
              {localizedBrowserPackages.map(({ item, display }) => {
                const tab = display.homeBrowserTab;
                const tabActive = activeTab === item.id;
                const hasUnreadRefresh = item.id === "noodle" && noodleRefreshUnread;
                const activityDescriptionId = `${homeBrowserTabId(item.id)}-activity`;
                return (
                  <button
                    key={item.id}
                    id={homeBrowserTabId(item.id)}
                    type="button"
                    role="tab"
                    aria-controls={HOME_BROWSER_PANEL_ID}
                    aria-label={tab?.ariaLabel ?? tab?.label ?? display.name}
                    aria-describedby={hasUnreadRefresh ? activityDescriptionId : undefined}
                    aria-selected={tabActive}
                    onClick={() => selectTab(item.id)}
                    className={cn(
                      "relative flex min-h-9 min-w-0 items-center justify-center rounded-t-lg border border-b-0 text-[0.65rem] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--marinara-chat-chrome-focus-ring)] sm:min-w-[6.5rem] sm:w-auto sm:flex-none sm:gap-1.5 sm:px-3 sm:text-xs",
                      tabActive ? "flex-1 gap-1 px-2" : "w-9 flex-none gap-0 px-0",
                      tabActive
                        ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                    )}
                  >
                    <BrowserPackageTabIcon packageId={item.id} version={item.version} iconPaths={tab?.iconPaths} />
                    <span className={cn("min-w-0 truncate", tabActive ? "block" : "hidden sm:block")}>
                      {tab?.label ?? display.name}
                    </span>
                    {hasUnreadRefresh ? (
                      <span
                        id={activityDescriptionId}
                        aria-label={t("home.browser.newTimelineRefresh")}
                        data-component="HomeBrowserHub.NoodleRefreshBadge"
                        className="mari-chrome-accent-tile mari-accent-animated absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.58rem] font-black leading-none ring-1 ring-[var(--marinara-chat-chrome-button-border-active)]"
                      >
                        <span aria-hidden="true">1</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {showHomeBrowserAddressBar ? (
              <div
                className="mari-home-browser-address-row hidden h-8 shrink-0 items-center gap-1.5 px-2 py-0.5 sm:flex sm:h-10 sm:gap-2 sm:px-3"
                data-component="HomeBrowserHub.AddressRow"
              >
                <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
                  <button
                    type="button"
                    onClick={openHome}
                    disabled={activeTab === "home"}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.79_0.16_205)] disabled:opacity-30"
                    aria-label={t("home.browser.back")}
                  >
                    <ArrowLeft size="0.9rem" />
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] opacity-30"
                    aria-label={t("home.browser.forward")}
                  >
                    <ArrowRight size="0.9rem" />
                  </button>
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] opacity-70"
                    data-component="HomeBrowserHub.DecorativeRefresh"
                  >
                    <RefreshCw size="0.88rem" />
                  </span>
                </div>
                <div
                  className="mari-home-browser-address flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--marinara-app-accent-solid)_44%,var(--border))] px-2.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent),0_0_18px_-14px_var(--marinara-app-accent-solid)] sm:h-9 sm:px-3"
                  role="status"
                  aria-label={t("home.browser.addressLabel", { address })}
                  data-component="HomeBrowserHub.Address"
                >
                  <img
                    src="/favicon.png"
                    alt=""
                    className="h-[0.9rem] w-[0.9rem] shrink-0 object-contain sm:h-[1.05rem] sm:w-[1.05rem]"
                  />
                  <span className="truncate font-mono text-[0.67rem] text-[var(--foreground)] sm:text-[0.72rem]">
                    {address}
                  </span>
                  <Star
                    size="0.72rem"
                    className="ml-auto shrink-0 text-[var(--marinara-app-accent-solid)]"
                    aria-hidden="true"
                  />
                </div>
              </div>
            ) : null}
          </header>
        ) : null}

        <main
          id={HOME_BROWSER_PANEL_ID}
          ref={contentRef}
          role="tabpanel"
          aria-labelledby={homeBrowserTabId(activeTab)}
          tabIndex={0}
          className={cn("min-h-0 flex-1", activeTab === "professor" ? "overflow-hidden" : "overflow-y-auto")}
          data-component="HomeBrowserHub.Content"
        >
          {activeTab !== "home" && activeTab !== "professor" ? (
            <CapabilityElement
              key={activeTab}
              packageId={activeTab}
              view="browser"
              className="block h-full min-h-0 w-full"
              capabilityProps={{
                style: { display: "block", width: "100%", height: "100%" },
                conversationTimeZone,
                debugMode,
                onClose: openHome,
                reviewImagePromptsBeforeSend,
                focusPostId: focusedPackagePost?.packageId === activeTab ? focusedPackagePost.postId : null,
                onFocusPostHandled: () =>
                  setFocusedPackagePost((current) => (current === focusedPackagePost ? null : current)),
                // Capability API 1.66: a package with the `scenes` permission starts scenes from its own
                // threads and is shown the thread a scene came back to. The host binds the package id.
                focusSceneOriginId: sceneOriginFocus?.packageId === activeTab ? sceneOriginFocus.originId : null,
                onFocusSceneOriginHandled: () => {
                  if (useUIStore.getState().sceneOriginFocus === sceneOriginFocus) setSceneOriginFocus(null);
                },
                startScene: (options: {
                  originId: string;
                  prompt?: string;
                  planHint?: string | null;
                  plan?: SceneFullPlan | null;
                  data?: Record<string, unknown> | null;
                  initiatorCharacterId?: string | null;
                  initiatorName?: string | null;
                }) =>
                  startSceneWithPromptPreferences({
                    packageOrigin: { packageId: activeTab, originId: String(options?.originId ?? "") },
                    prompt: typeof options?.prompt === "string" ? options.prompt : "",
                    planHint: typeof options?.planHint === "string" ? options.planHint : null,
                    plan: options?.plan && typeof options.plan === "object" ? options.plan : null,
                    packageData: options?.data && typeof options.data === "object" ? options.data : null,
                    initiatorCharId:
                      typeof options?.initiatorCharacterId === "string" ? options.initiatorCharacterId : null,
                    initiatorCharName: typeof options?.initiatorName === "string" ? options.initiatorName : null,
                  }).then((response) => (response ? { chatId: response.chatId } : null)),
                // Go to a chat, such as the scene a package thread is waiting on.
                openChat: (chatId: string) => {
                  if (typeof chatId === "string" && chatId) useChatStore.getState().setActiveChatId(chatId);
                },
              }}
            />
          ) : activeTab === "professor" ? (
            <div className="relative h-full min-h-0 bg-[radial-gradient(circle_at_18%_14%,oklch(0.79_0.16_205/0.12),transparent_30%),radial-gradient(circle_at_82%_18%,oklch(0.73_0.21_345/0.15),transparent_32%),var(--background)] p-0 sm:p-3">
              <HomeStarfield />
              <div className="relative z-[1] h-full min-h-0">
                <HomeProfessorMariChat
                  pageActive={pageActive}
                  attachedFooter={false}
                  chatWindowOpen={professorChatOpen}
                  embeddedTab
                  launchHidden
                  onChatWindowOpenChange={(open) => (open ? onProfessorChatOpenChange(true) : selectTab("home"))}
                  onChatWindowExitComplete={completeProfessorExit}
                />
              </div>
            </div>
          ) : (
            <HomeDesktopArea
              versionLabel={versionLabel}
              achievementsEnabled={achievementsEnabled}
              contextTarget={activePanel === "desktop-context" ? desktopMenuTarget : null}
              onRequestContext={handleDesktopContextMenu}
              onDismissContext={handleDesktopMenuDismiss}
              onOpenProfessor={openProfessor}
              onOpenCredits={onOpenCredits}
              onOpenFaq={() => setFaqOpen(true)}
              onOpenPersonalization={handleOpenTaskbarSettings}
              onTrackAction={trackHomeAction}
            />
          )}
        </main>

        <div className="relative z-30 shrink-0">
          <HomeStartMenu
            open={activePanel === "start-menu"}
            onClose={closePanel}
            entries={startMenuEntries}
            versionLabel={versionLabel}
          />
          <HomeTaskbar
            activePanel={activePanel}
            activeTab={activeTab}
            togglePanel={togglePanel}
            closePanel={closePanel}
            onSearch={handleSearch}
            onSelectHome={openHome}
            onOpenProfessor={openProfessor}
            tray={tray}
            onContextMenu={handleTaskbarContextMenu}
          />
          <HomeTaskbarContextMenu
            open={activePanel === "taskbar-context"}
            onClose={closePanel}
            onOpenTaskbarSettings={handleOpenTaskbarSettings}
            x={taskbarMenuPoint?.x}
            y={taskbarMenuPoint?.y}
          />
        </div>
      </div>
      {!professorChatActive && activeTab === "home" ? (
        <FloatingProfessorMari
          pageActive={pageActive}
          enabled={professorMariNavigationEnabled || !hasCompletedOnboarding}
          boundaryRef={contentRef}
          onResolve={resolveWithProfessorMari}
          onNavigate={openProfessorMariTarget}
          onOpenProfessor={openProfessor}
          onOpenDocumentation={openDocumentation}
          onMeaningfulDrag={() => trackHomeAction("prof_mari_dragged")}
        />
      ) : null}
      {achievementsEnabled ? (
        <HomeAchievements open={achievementsOpen} onOpenChange={setAchievementsOpen} showLauncher={false} />
      ) : null}
      <Modal
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        title={t("home.browser.faqWindowTitle")}
        width="max-w-5xl"
      >
        <HomeFaq headerless faqOnly expanded className="max-w-none" />
      </Modal>
    </div>
  );
}
