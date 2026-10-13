import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeAvatarCrop, type AvatarCrop } from "@marinara-engine/shared";
import { useCharacterSummaries } from "../../hooks/use-characters";
import { useHomeFeed } from "../../hooks/use-home-feed";
import { getAvatarCropStyle } from "../../lib/utils";
import { useChatStore } from "../../stores/chat.store";

const MAX_RECOMMENDED_CHATS = 6;

const ITEM_CLASS =
  "flex min-w-0 items-center gap-2 rounded px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--marinara-taskbar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-taskbar-ring)]";

/** Mirrors the recent-chats widget preview: the user's own line is prefixed, empty bodies fall back. */
function messagePreview(role: string, content: string, fallback: string, youLabel: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return role === "user" ? `${youLabel}: ${normalized}` : normalized;
}

/** Recommended area of the start menu: the six most recent chats, click to resume. */
export function HomeStartMenuRecommended({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();
  const feed = useHomeFeed();
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);
  const recentChats = useMemo(
    () => (feed.data?.recentChats ?? []).slice(0, MAX_RECOMMENDED_CHATS),
    [feed.data?.recentChats],
  );
  const characterIds = useMemo(
    () => Array.from(new Set(recentChats.flatMap(({ chat }) => chat.characterIds))),
    [recentChats],
  );
  const summaries = useCharacterSummaries(characterIds);
  const avatars = useMemo(() => {
    const map = new Map<string, { url: string; crop: AvatarCrop | null }>();
    for (const character of summaries.data ?? []) {
      if (character.avatarUrl)
        map.set(character.id, { url: character.avatarUrl, crop: normalizeAvatarCrop(character.avatarCrop) });
    }
    return map;
  }, [summaries.data]);

  return (
    <section className="mt-3 min-w-0" data-component="HomeBrowserHub.StartMenuRecommended">
      <p className="px-1 pb-1.5 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {t("home.startMenu.recommendedHeading")}
      </p>
      {feed.isPending ? (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="status" aria-label={t("home.recentChats.loading")}>
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="h-11 animate-pulse rounded bg-[var(--muted)]/45" />
          ))}
        </div>
      ) : recentChats.length === 0 ? (
        <p className="px-1 text-xs text-[var(--muted-foreground)]">{t("home.recentChats.empty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {recentChats.map(({ chat, latestMessage }) => {
            const avatar = chat.characterIds
              .map((characterId) => avatars.get(characterId))
              .find((candidate) => candidate !== undefined);
            return (
              <li key={chat.id} className="min-w-0">
                <button
                  type="button"
                  className={ITEM_CLASS}
                  onClick={() => {
                    onDismiss();
                    setActiveChatId(chat.id);
                  }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--muted-foreground)]">
                    {avatar ? (
                      <img
                        src={avatar.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        style={getAvatarCropStyle(avatar.crop)}
                      />
                    ) : (
                      <MessageSquare size="0.95rem" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[var(--foreground)]">{chat.name}</span>
                    <span className="block truncate text-[0.68rem] text-[var(--muted-foreground)]">
                      {latestMessage
                        ? messagePreview(
                            latestMessage.role,
                            latestMessage.content,
                            t("home.recentChats.noPreview"),
                            t("home.recentChats.you"),
                          )
                        : t("home.recentChats.noPreview")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
