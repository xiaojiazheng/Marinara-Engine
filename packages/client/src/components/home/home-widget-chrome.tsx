import { HomeShortcutIcon } from "./HomeShortcutIcon";

/**
 * The list row used inside the desktop's Learn and Community windows. It survives the retired widget
 * grid because those windows read as the same shortcut list the cards used to show.
 */
export function HomeWidgetShortcut({
  href,
  onClick,
  icon,
  title,
  description,
  tone = "var(--home-module-accent)",
}: {
  href?: string;
  onClick?: () => void;
  icon: string;
  title: string;
  description: string;
  /** Accent for the Win11 shortcut plate; defaults to the host window's accent variable. */
  tone?: string;
}) {
  const className =
    "mari-home-widget-shortcut flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--home-module-accent)_10%,var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--home-module-accent)]";
  const content = (
    <>
      <HomeShortcutIcon tone={tone} className="mari-home-widget-shortcut__icon shrink-0">
        <img src={icon} alt="" className="h-4 w-4 object-contain" />
      </HomeShortcutIcon>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span className="mari-home-widget-shortcut__description line-clamp-2 text-xs text-[var(--muted-foreground)]">
          {description}
        </span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
