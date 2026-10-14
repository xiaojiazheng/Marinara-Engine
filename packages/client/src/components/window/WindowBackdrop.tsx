// ──────────────────────────────────────────────
// Window backdrop: the dimmed layer a window floats on
//
// It swallows presses, so the page behind a window stays inert. Two owners pass it in: the desktop
// shell layer (`ShellOverlayPopover`, which also dismisses on a press here) and the centre-area
// surfaces in `AppShell`. It renders as a motion element so a caller can fade it exactly like the
// surface above it.
// ──────────────────────────────────────────────
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";
import { WINDOW_BACKDROP_COMPONENT } from "./window-chrome";

export type WindowBackdropProps = HTMLMotionProps<"div"> & {
  /** Marks it `data-backdrop-dismiss-surface`: the owner's press handler closes on a press here. */
  dismissible?: boolean;
};

export function WindowBackdrop({ dismissible = false, className, ...backdrop }: WindowBackdropProps) {
  return (
    <motion.div
      {...backdrop}
      data-component={WINDOW_BACKDROP_COMPONENT}
      data-backdrop-dismiss-surface={dismissible ? "true" : undefined}
      aria-hidden="true"
      className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm", className)}
    />
  );
}
