import { useEffect, useMemo, useState } from "react";
import { Loader2, Plug } from "lucide-react";
import { useConnections } from "../../hooks/use-connections";
import { useCreateChat } from "../../hooks/use-chats";
import { useChatPresets, useApplyChatPreset } from "../../hooks/use-chat-presets";
import { useChatStore } from "../../stores/chat.store";
import { isMobileShellViewport, useUIStore } from "../../stores/ui.store";
import { useSidecarStore } from "../../stores/sidecar.store";
import { appendLocalSidecarConnectionOption } from "../../lib/connection-filters";
import { cn } from "../../lib/utils";
import { useTranslation as useUiTranslation } from "react-i18next";
import { ChatModeIcon } from "./ChatModeIcon";
import { Modal } from "../ui/Modal";

type Mode = "conversation" | "roleplay" | "game";

const MODE_META: Record<Mode, { label: string; icon: React.ReactNode }> = {
  conversation: { label: "Conversation", icon: <ChatModeIcon mode="conversation" size="0.875rem" /> },
  roleplay: { label: "Roleplay", icon: <ChatModeIcon mode="roleplay" size="0.875rem" /> },
  game: { label: "Game", icon: <ChatModeIcon mode="game" size="0.875rem" /> },
};

interface NewChatConnectionGateProps {
  mode: Mode;
  onClose: () => void;
}

export function NewChatConnectionGate({ mode, onClose }: NewChatConnectionGateProps) {
  const { t: localizeUi } = useUiTranslation();
  const { data: connections, isLoading } = useConnections();
  const createChat = useCreateChat();
  const { data: chatPresetsData } = useChatPresets();
  const applyChatPreset = useApplyChatPreset();
  const openRightPanel = useUIStore((s) => s.openRightPanel);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const pendingNewChatOrigin = useChatStore((s) => s.pendingNewChatOrigin);
  const sidecarModelDownloaded = useSidecarStore((state) => state.modelDownloaded);
  const sidecarModelDisplayName = useSidecarStore((state) => state.modelDisplayName);
  const [connectionId, setConnectionId] = useState<string>("");

  const connectionRows = useMemo(
    () =>
      appendLocalSidecarConnectionOption(
        (connections ?? []) as Array<{ id: string; name: string; provider?: string; isDefault?: boolean | string }>,
        mode !== "game" && sidecarModelDownloaded,
        sidecarModelDisplayName,
      ),
    [connections, mode, sidecarModelDisplayName, sidecarModelDownloaded],
  );

  useEffect(() => {
    if (connectionRows.length === 0) {
      setConnectionId("");
      return;
    }
    const isDefault = (row: { isDefault?: boolean | string }) => row.isDefault === true || row.isDefault === "true";
    const preferred = connectionRows.find(isDefault) ?? connectionRows[0]!;
    setConnectionId((current) => current || preferred.id);
  }, [connectionRows]);

  const handleCreate = () => {
    if (!connectionId) return;
    const label = MODE_META[mode].label;
    const presets = chatPresetsData ?? [];
    const presetMode = mode === "conversation" || mode === "roleplay" ? mode : null;
    const starred = presetMode
      ? (presets.find((p) => p.mode === presetMode && p.isActive && !p.isDefault) ?? null)
      : null;
    createChat.mutate(
      {
        name: `New ${label}`,
        mode,
        characterIds: [],
        connectionId,
        promptPresetId: starred?.settings.promptPresetId ?? undefined,
      },
      {
        onSuccess: (chat) => {
          const store = useChatStore.getState();
          store.setPendingNewChatMode(null);
          if (pendingNewChatOrigin === "home") {
            setSidebarOpen(true);
          } else if (isMobileShellViewport()) {
            setSidebarOpen(false);
          }
          store.setActiveChatId(chat.id);
          store.setShouldOpenSettings(true);
          store.setShouldOpenWizard(true);
          if (starred) {
            void applyChatPreset.mutateAsync({ presetId: starred.id, chatId: chat.id, connectionId }).catch(() => {
              /* non-fatal — chat still opens with system defaults */
            });
          }
        },
      },
    );
  };

  const showEmptyState = !isLoading && connectionRows.length === 0;

  const handleOpenConnections = () => {
    onClose();
    openRightPanel("connections");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={localizeUi("ui.chat.scheduletimeline.value1Value2", {
        value1: localizeUi("ui.chat.newchatconnectiongate.setUp"),
        value2: MODE_META[mode].label,
      })}
      titleIcon={<Plug size="1rem" />}
      chrome="window"
      width="max-w-sm"
    >
      {/* The e2e hook and the accent scope share this element: the spec resolves
          `var(--marinara-chat-chrome-accent)` from inside it. */}
      <div
        data-new-chat-connection-gate={mode}
        className="mari-chrome-token-scope mari-chrome-text-accent-scope space-y-4"
      >
        <p className="text-[0.6875rem] text-[var(--muted-foreground)]">
          {localizeUi("ui.chat.newchatconnectiongate.chooseAConnectionBeforeWeCreateTheChat")}
        </p>
        {showEmptyState ? (
          <div
            data-new-chat-connection-empty
            className="rounded-xl border border-[var(--marinara-chat-chrome-button-border-active)] bg-[var(--marinara-chat-chrome-highlight-bg)] p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Plug size="0.875rem" className="mari-chrome-accent-icon" />
              {localizeUi("ui.chat.newchatconnectiongate.noConnectionsFound")}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {localizeUi("ui.chat.newchatconnectiongate.createAConnectionFirstThenComeBackHereAnd")}
            </p>
            <button
              data-new-chat-open-connections
              onClick={handleOpenConnections}
              className="mari-chrome-control mari-chrome-control--primary mt-3 w-full text-xs"
            >
              <Plug size="0.75rem" />
              {localizeUi("ui.chat.newchatconnectiongate.openConnections")}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              {localizeUi("ui.chat.conversationquicksetup.connection")}
            </label>
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              disabled={createChat.isPending}
              className="mari-chrome-field w-full px-3 py-2.5 text-xs"
            >
              <option value="">{localizeUi("ui.chat.customemojiselectionsettings.selectAConnection")}</option>
              {connectionRows.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
          >
            {localizeUi("chat.delete.dialog.cancel")}
          </button>
          <button
            onClick={handleCreate}
            disabled={showEmptyState || !connectionId || createChat.isPending}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium shadow-sm transition-all active:scale-95",
              showEmptyState || !connectionId || createChat.isPending
                ? "cursor-not-allowed bg-[var(--secondary)] text-[var(--muted-foreground)] opacity-60"
                : "mari-chrome-accent-surface border",
            )}
          >
            {createChat.isPending ? <Loader2 size="0.75rem" className="animate-spin" /> : MODE_META[mode].icon}
            {localizeUi("ui.chat.newchatconnectiongate.createChat")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
