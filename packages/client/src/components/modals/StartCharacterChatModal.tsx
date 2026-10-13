import { useStartChatFromCharacter } from "../../hooks/use-start-chat-from-character";
import { useUIStore } from "../../stores/ui.store";
import { ChatModeSelectorModal, type ChatLaunchMode } from "../chat/ChatModeSelectorModal";

interface StartCharacterChatModalProps {
  open: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
}

export function StartCharacterChatModal({ open, onClose, characterId, characterName }: StartCharacterChatModalProps) {
  const closeAllDetails = useUIStore((state) => state.closeAllDetails);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const { startChatFromCharacter, isStartingChat } = useStartChatFromCharacter();

  const selectMode = (mode: ChatLaunchMode) => {
    startChatFromCharacter({
      characterId,
      characterName,
      mode,
      shortcutMode: false,
      onSuccess: () => {
        closeAllDetails();
        // The settings panel is a modal layer on every viewport now, so it would cover the chat that
        // was just started. `closeAllDetails` is a plain state reset — it never reopens the panel —
        // so both calls land in one batched render and there is no visible open-then-close.
        closeRightPanel();
        onClose();
      },
    });
  };

  return <ChatModeSelectorModal open={open} onClose={onClose} onSelectMode={selectMode} isPending={isStartingChat} />;
}
