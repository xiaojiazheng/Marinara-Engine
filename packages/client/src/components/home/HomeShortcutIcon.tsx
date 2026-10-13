import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Windows 11 shortcut plate: a rounded square tinted with the entry's accent, holding a line icon or a
 * small bitmap. Shared by the desktop shortcuts, the taskbar's pinned entries, and the widget card
 * titles, so every Home icon reads as one family.
 */
export function HomeShortcutIcon({
  tone,
  className,
  children,
}: {
  tone: string;
  className?: string;
  children: ReactNode;
}) {
  const style = { "--shortcut-tone": tone } as CSSProperties;
  return (
    <span
      style={style}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--shortcut-tone)_42%,var(--border))] bg-[color-mix(in_srgb,var(--shortcut-tone)_16%,var(--card))] text-[var(--shortcut-tone)] shadow-[0_12px_24px_-20px_color-mix(in_srgb,var(--shortcut-tone)_82%,transparent)] transition-[transform,box-shadow,background-color] duration-200 group-hover:-translate-y-0.5 group-hover:bg-[color-mix(in_srgb,var(--shortcut-tone)_23%,var(--card))] group-hover:shadow-[0_16px_28px_-18px_color-mix(in_srgb,var(--shortcut-tone)_86%,transparent)] group-focus-visible:-translate-y-0.5 motion-reduce:transform-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
