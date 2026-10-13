export const NEUTRAL_SURFACE_VARIABLES =
  "[--accent:var(--marinara-chat-chrome-highlight-bg)] [--accent-foreground:var(--marinara-chat-chrome-highlight-text)] [--background:var(--marinara-chat-chrome-panel-bg)] [--border:var(--marinara-chat-chrome-panel-border)] [--card:var(--marinara-chat-chrome-panel-bg)] [--foreground:var(--marinara-chat-chrome-panel-text)] [--input:var(--marinara-chat-chrome-input-border)] [--muted:var(--marinara-chat-chrome-highlight-bg)] [--muted-foreground:var(--marinara-chat-chrome-panel-muted)] [--popover:var(--marinara-chat-chrome-panel-bg)] [--popover-foreground:var(--marinara-chat-chrome-panel-text)] [--primary:var(--marinara-chat-chrome-highlight-text)] [--primary-foreground:var(--marinara-chat-chrome-panel-bg)] [--ring:var(--marinara-chat-chrome-focus-ring)] [--secondary:var(--marinara-chat-chrome-highlight-bg)]";

export const NEUTRAL_PANEL_SHELL = `marinara-chat-popover rounded-xl border border-[var(--marinara-chat-chrome-panel-border)] bg-[var(--marinara-chat-chrome-panel-bg)] text-[var(--marinara-chat-chrome-panel-text)] shadow-2xl shadow-black/40 backdrop-blur-md animate-message-in ${NEUTRAL_SURFACE_VARIABLES}`;

// Windows 11 window shell (Modal chrome="window"): acrylic surface, the --marinara-win11-radius
// corner (8px at the default 16px root, the same DWM value the notification cards use), and the title
// bar geometry from globals.css §26. Paint and radius stay in Tailwind utilities on purpose: the
// chat-widget theme rules that repaint an action window are unlayered CSS, so a preset still outranks
// this shell — and a §26 border-radius rule would outrank the utilities' own `max-sm:rounded-none` on a
// full-screen phone window.
export const WIN11_WINDOW_PANEL_SHELL = `marinara-chat-popover mari-win11-window rounded-[var(--marinara-win11-radius)] border border-[var(--marinara-home-acrylic-border)] bg-[var(--marinara-home-acrylic-surface)] text-[var(--marinara-chat-chrome-panel-text)] shadow-[var(--marinara-home-acrylic-shadow)] backdrop-blur-xl backdrop-saturate-[1.3] animate-message-in ${NEUTRAL_SURFACE_VARIABLES}`;

export const NEUTRAL_PANEL_HEADER =
  "marinara-chat-popover__header border-b border-[var(--marinara-chat-chrome-panel-divider)] px-3 py-2.5";

export const NEUTRAL_PANEL_TITLE =
  "marinara-chat-popover__title flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-tight text-[var(--marinara-chat-chrome-panel-title)]";

export const NEUTRAL_PANEL_SUBTITLE =
  "marinara-chat-popover__subtitle mt-0.5 text-[0.625rem] leading-snug text-[var(--marinara-chat-chrome-panel-muted)]";

export const NEUTRAL_PANEL_SCROLL_AREA =
  "marinara-chat-popover__scroll scrollbar-thin scrollbar-thumb-[var(--marinara-chat-chrome-panel-scrollbar)] scrollbar-track-transparent";

export const NEUTRAL_PANEL_CLOSE_BUTTON =
  "rounded-lg p-1.5 text-[var(--muted-foreground)] transition-all hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export const NEUTRAL_PANEL_CLOSE_ICON_SIZE = "1rem";
