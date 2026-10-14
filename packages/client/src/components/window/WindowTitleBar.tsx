// ──────────────────────────────────────────────
// Window title bar: the one bar every window draws
//
// It carries the window's heading, its icon and the keys that really exist. A window with no second
// state renders no second key: the bar never shows a minimize or maximize button that does nothing.
// The bar's geometry (height, key size and place) is the frame's and is not themeable; the acrylic
// paint comes from the shell in globals.css §4a2.
//
// A centre-area surface renders it in tile mode (a rounded gradient icon tile, the heading and its
// subtitle, for the windows that own their own title). A dialog or a shell window renders it plain
// (a 16px icon and the heading), which is what the modal shell uses.
// ──────────────────────────────────────────────
import { X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { WINDOW_CLOSE_KEY_CLASS, WINDOW_TITLE_BAR_COMPONENT, WINDOW_TITLE_BAR_ICON_COMPONENT } from "./window-chrome";

/** The neutral icon tile a centre-area surface gets when it passes no gradient. */
const DEFAULT_ICON_TILE_CLASS = "bg-gradient-to-br from-slate-400 to-slate-500 text-white";

export interface WindowTitleBarProps {
  /** The window's heading, rendered as the window's `h1` (tile) or `h2` (plain). */
  title: ReactNode;
  /** A secondary line under the heading, such as the surface's own name. */
  subtitle?: ReactNode;
  /** The window's icon: 16px plain, or the tile's glyph in tile mode. */
  icon?: ReactNode;
  /** Draws the icon in a rounded gradient tile (the centre-area browse windows). */
  iconTile?: boolean;
  /** Gradient classes for that tile; defaults to the neutral tile. */
  iconClassName?: string;
  /** Rendered after the title, inside `.mari-window__title-row` (a help tip, a state dot). */
  titleAccessory?: ReactNode;
  /** Keys the window really has, before the close key. */
  actions?: ReactNode;
  /** Omitting it renders no close key at all. */
  onClose?: () => void;
  /** Localized accessible name and tooltip for the close key. */
  closeLabel?: string;
  closeDisabled?: boolean;
  /**
   * The id the title element carries, so a window can point `aria-labelledby` at it. A window that names
   * itself this way is the only way a dialog keeps its accessible name (a chat window is found by tests
   * and screen readers as `getByRole("dialog", { name: "Chat Settings" })`), so the id must land on the
   * heading itself rather than on the bar.
   */
  titleId?: string;
  className?: string;
  titleClassName?: string;
  /**
   * Extra attributes for the bar row itself: a movable window's `role`/`tabIndex`/`aria-label`, its
   * pointer handlers, and its drag cursor class. `className` is merged after this component's own,
   * never replaced.
   */
  rowProps?: HTMLAttributes<HTMLDivElement>;
}

export function WindowTitleBar({
  title,
  subtitle,
  icon,
  iconTile = false,
  iconClassName,
  titleAccessory,
  actions,
  onClose,
  closeLabel,
  closeDisabled = false,
  titleId,
  className,
  titleClassName,
  rowProps,
}: WindowTitleBarProps) {
  const { className: rowClassName, ...row } = rowProps ?? {};
  return (
    // `marinara-chat-popover__header` is the hook the chat-widget themes anchor on, so the row always
    // carries it. The keys are grouped in `.mari-window__controls`, so a theme that wants to paint a
    // window's keys targets `.mari-window__control`, not this row's `> button`.
    <div
      {...row}
      data-component={WINDOW_TITLE_BAR_COMPONENT}
      className={cn(
        "mari-window__header marinara-chat-popover__header flex shrink-0 items-center justify-between gap-2 py-0 pl-3 pr-0",
        className,
        rowClassName,
      )}
    >
      <span className="mari-window__title-row flex min-w-0 items-center gap-1.5">
        {icon ? (
          iconTile ? (
            <span
              data-component={WINDOW_TITLE_BAR_ICON_COMPONENT}
              className={cn(
                "mari-window__title-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-sm",
                iconClassName ?? DEFAULT_ICON_TILE_CLASS,
              )}
            >
              {icon}
            </span>
          ) : (
            icon
          )
        ) : null}
        {iconTile ? (
          <span className="flex min-w-0 flex-col">
            <h1 id={titleId} className={cn("mari-chrome-text-strong truncate text-sm font-semibold", titleClassName)}>
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                {subtitle}
              </p>
            ) : null}
          </span>
        ) : (
          <h2
            id={titleId}
            className={cn(
              "mari-window__title marinara-chat-popover__title min-w-0 truncate text-xs font-semibold leading-tight",
              titleClassName,
            )}
          >
            {title}
          </h2>
        )}
        {titleAccessory}
      </span>
      <div className="mari-window__controls flex shrink-0 items-center">
        {actions}
        {onClose ? (
          <button
            type="button"
            data-window-control="close"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={closeLabel}
            title={closeLabel}
            className={cn(WINDOW_CLOSE_KEY_CLASS, closeDisabled && "disabled:cursor-wait disabled:opacity-40")}
          >
            <X size="1rem" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
