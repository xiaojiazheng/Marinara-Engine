/**
 * The shell breakpoint shared by the UI store and the chat floating-UI helpers.
 * Kept in a dependency-free module, because `stores/ui.store.ts` already imports
 * `lib/chat-floating-ui-events.ts`, so the store cannot be the shared source.
 * Phones, and touch tablets up to 1440px, get the mobile drawer shell.
 */
export const MOBILE_SHELL_MEDIA_QUERY =
  "(max-width: 767px), (max-width: 1440px) and (hover: none) and (any-pointer: coarse)";
