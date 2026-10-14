// ──────────────────────────────────────────────
// Window shell: the one frame every window renders through
//
// The two side panes, a centre-area surface and every dialog wrap their content in this element, so
// one title bar, one set of keys and one acrylic surface exist. It marks its surface with
// `[data-window-shell-variant]` and `[data-window-shell-chrome]`; globals.css §4a2 paints it (the
// Windows 11 acrylic, the shared corner, the title bar and the keys). A chat floating window
// (`<FloatingWindow>`) renders the same `.mari-window` family without those attributes, so it keeps
// the chat-panel paint it had.
//
// It renders as a motion element so a caller that animates its window in passes the motion props
// straight through; with none, it is a plain element.
// ──────────────────────────────────────────────
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode, Ref } from "react";
import { cn } from "../../lib/utils";
import {
  WINDOW_SHELL_BASE_CLASS,
  WINDOW_SHELL_COMPONENT,
  WINDOW_SHELL_VARIANT_CLASS,
  type WindowShellChrome,
  type WindowShellVariant,
} from "./window-chrome";

export type WindowShellProps = Omit<HTMLMotionProps<"div">, "ref" | "children"> & {
  /**
   * The window's content. Narrowed to ReactNode: framer-motion's own `children` also allows a motion
   * value, and the app's translation typing has to stay the only `children` shape here.
   */
  children?: ReactNode;
  /** How the window is placed. Defaults to `fixed`: its own layer centres it under the top bar. */
  variant?: WindowShellVariant;
  /** Which bar the window draws. Both draw the title and the close key. */
  chrome?: WindowShellChrome;
  /** The surface's `data-component`, naming the role this window plays ("Modal", "DetailEditor"). */
  dataComponent?: string;
  /** The window's own bar: a <WindowTitleBar>, or the pane's own header. */
  titleBar?: ReactNode;
  /** The scrolling body's classes; the body itself is the shell's `.mari-window__body`. */
  bodyClassName?: string;
  bodyRef?: Ref<HTMLDivElement | null>;
  /** Panel footer, outside the scrolling body so its actions stay reachable. */
  footer?: ReactNode;
  surfaceRef?: Ref<HTMLDivElement | null>;
};

export function WindowShell({
  variant = "fixed",
  chrome = "window",
  dataComponent,
  titleBar,
  bodyClassName,
  bodyRef,
  footer,
  surfaceRef,
  className,
  children,
  ...surface
}: WindowShellProps) {
  return (
    <motion.div
      {...surface}
      ref={surfaceRef}
      data-component={dataComponent ?? WINDOW_SHELL_COMPONENT}
      data-window-shell-variant={variant}
      data-window-shell-chrome={chrome}
      className={cn(WINDOW_SHELL_BASE_CLASS, WINDOW_SHELL_VARIANT_CLASS[variant], className)}
    >
      {titleBar}
      <div ref={bodyRef} className={cn("mari-window__body flex min-h-0 flex-1 flex-col", bodyClassName)}>
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </motion.div>
  );
}
