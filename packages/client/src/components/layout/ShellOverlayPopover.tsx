// ──────────────────────────────────────────────
// Shell overlay popover — the layer the desktop chat list sidebar and the right settings panel are
// shown in.
//
// The shell here is a *layer*: it owns the placement under the top bar, the backdrop, the modal
// semantics (Escape, focus trap, inert while closed) and the reveal; the window inside it is the
// shared <WindowShell>, so the two panes are the same acrylic window as every other surface. The pane
// keeps owning its header, its scrolling and its state.
//
// Two properties make it safe to reuse for both panes:
//   - It is mounted once and never unmounted, so pane-local state survives a close
//     (RightPanel's `mountedPanels`, scroll offsets). `open` only drives the animated
//     opacity/scale and the `inert`/`aria-hidden` switch.
//   - It renders in place instead of `createPortal`, so `.mari-app` theme scoping and
//     existing `document.querySelector` e2e selectors keep working.
//
// Wiring caveat: the shell is `position: fixed`, so the pane that renders it must not
// sit under an ancestor that establishes a containing block for fixed descendants
// (`transform`, `filter`, `contain: paint`).
// ──────────────────────────────────────────────
import { useEffect, useRef, type ReactNode } from "react";
import { useBackdropDismiss } from "../../hooks/use-backdrop-dismiss";
import { useDialogFocusScope } from "../../hooks/use-dialog-focus-scope";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { registerModalOverlay, type ModalOverlayRegistration } from "../../lib/modal-overlay-registry";
import { Z_PANEL_OVERLAY } from "../../lib/z-layers";
import { WindowBackdrop } from "../window/WindowBackdrop";
import { WindowShell } from "../window/WindowShell";

export type ShellOverlayPopoverProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. The caller passes an already-localized string. */
  label: string;
  /** Surface width in px. The caller passes `sidebarWidth` / `rightPanelWidth`. */
  width: number;
  /** Content owns its own scrolling; the shell wraps it in no scroll container. */
  children: ReactNode;
};

/** Gutter the surface keeps against the viewport, in both axes. */
const SURFACE_VIEWPORT_GUTTER = "2rem";
const SURFACE_MAX_WIDTH = `calc(100vw - ${SURFACE_VIEWPORT_GUTTER})`;
/**
 * Height of the shell's top bar: `TopBar` renders `h-12`. The layer starts below it rather than at the
 * viewport top, so the top bar keeps taking clicks and is never dimmed while a panel is open — a
 * Windows 11 Start menu does not dim the taskbar either. Because the layer and the top bar never
 * overlap, no z-index is raised and `Z_PANEL_OVERLAY` alone still decides what covers what.
 *
 * This is the only place the top bar's height is written; `TopBar`'s `h-12` has to change with it.
 */
const SHELL_OVERLAY_TOP_INSET = "3rem";
// The surface is centered inside the layer and never taller than what is left under the top bar.
// 40rem keeps it a Windows 11 window rather than a full-height drawer on tall viewports.
const SURFACE_MAX_HEIGHT = `min(40rem, calc(100dvh - ${SHELL_OVERLAY_TOP_INSET} - ${SURFACE_VIEWPORT_GUTTER}))`;

/**
 * How long the closed wrapper stays `visible` after `open` flips false, so the exit
 * transition is actually seen. Keep it at or above the motion duration below.
 */
const EXIT_VISIBILITY_DELAY_MS = 200;
const MOTION_DURATION_S = 0.18;
const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The layer the two shell panes are shown in. It renders `children` inside the shared window shell:
 * Escape and a backdrop press close it, Tab is trapped inside it, and while closed it is `inert`,
 * `aria-hidden` and non-interactive.
 */
export function ShellOverlayPopover({ open, onClose, label, width, children }: ShellOverlayPopoverProps) {
  const reduceMotion = useReducedAmbientEffects();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const overlayRegistrationRef = useRef<ModalOverlayRegistration | null>(null);
  const backdropDismiss = useBackdropDismiss(onClose);

  // Register as an open overlay while open, so Escape only reaches the topmost layer and
  // the pane's own `usePanelKeyboardFocus` Escape yields to us (`isModalOverlayOpen()`).
  useEffect(() => {
    if (!open) return;
    const registration = registerModalOverlay();
    overlayRegistrationRef.current = registration;
    return () => {
      registration.release();
      overlayRegistrationRef.current = null;
    };
  }, [open]);

  // Escape here closes the popover only when no inner control has claimed the key. Owners claim it
  // two ways and both must stay respected:
  //   - `preventDefault()`  — reaches this listener with `defaultPrevented` set (chat search box,
  //                           the activity input, inline renames).
  //   - `stopPropagation()` — never reaches this listener at all (folder / background renames).
  // Keep this listener out of the `window` capture phase: the touch-drag cancel hook in
  // `use-touch-folder-drag.ts` (line ~493) listens on `window` capture and marks the key handled;
  // same target + same phase runs in registration order, so a popover that registered first would
  // close on an Escape the drag cancel already claimed (`e2e/drag-list-scroll.e2e.ts` turns red —
  // fix the implementation, not the test). Capture on `document`, and bubbling on either target,
  // all run later and stay safe.
  // Do not reuse the panel-side `ownsEscape`: a panel surface is itself `role="dialog"`, so that
  // predicate matches every target inside the popover and Escape would never close it.
  // Close only while this layer is the topmost one (`isTopmost`): a confirm opened over it must not
  // take it down on the same press.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      // Escape while an IME is composing cancels the composition first.
      if (event.isComposing) return;
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (!overlayRegistrationRef.current?.isTopmost()) return;
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Tab trap plus the focus fallback. No initial focus is forced: the pane moves focus into
  // itself (`usePanelKeyboardFocus`) and this scope fills in when it did not.
  useDialogFocusScope(
    open,
    surfaceRef,
    undefined,
    undefined,
    undefined,
    () => overlayRegistrationRef.current?.isTopmost() ?? true,
  );

  const motionTarget = reduceMotion
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 }, transition: { duration: 0 } }
    : {
        hidden: { opacity: 0, scale: 0.98, y: 8 },
        shown: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: MOTION_DURATION_S, ease: MOTION_EASE },
      };

  return (
    <div
      data-component="ShellOverlayPopover"
      aria-hidden={!open}
      inert={!open}
      // Below the top bar, not over it: the backdrop and the centering area start under the top bar's
      // bottom edge, so the top bar stays reachable (one click switches panels) and stays undimmed.
      className={`fixed inset-x-0 bottom-0 ${open ? "visible" : "invisible pointer-events-none"}`}
      style={{
        top: SHELL_OVERLAY_TOP_INSET,
        zIndex: Z_PANEL_OVERLAY,
        // Hold `visible` until the exit transition has played. The open state carries no
        // transition, so the reveal stays instant.
        transition: open ? undefined : `visibility 0s linear ${EXIT_VISIBILITY_DELAY_MS}ms`,
      }}
      {...backdropDismiss}
    >
      {/* Backdrop. `useBackdropDismiss` (attached to the wrapper above) dismisses only when the press
          starts and ends on this surface, or on the wrapper itself. */}
      <WindowBackdrop
        dismissible
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={motionTarget.transition}
      />

      {/* Centering layer. It never takes pointer events itself, so a press in the gutter
          around the surface reaches the backdrop and dismisses, exactly like `Modal`. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <WindowShell
          surfaceRef={surfaceRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          // Deliberately not focusable: the pane moves focus into itself (`usePanelKeyboardFocus`) and
          // catches the first paint of a lazily loaded pane. If this container could take focus, the
          // focus-trap fallback would grab it while a pane is still suspending, and the pane's own
          // focus move would then be skipped because the active element is no longer its opener.
          // The surface only takes presses while open. The wrapper stops taking them immediately on
          // close but stays `visible` for the exit transition, so without this the fading panel would
          // swallow a press made in that window instead of letting it reach the chat behind it.
          className={`${open ? "pointer-events-auto" : "pointer-events-none"} outline-none`}
          style={{ width: `min(${width}px, ${SURFACE_MAX_WIDTH})`, height: SURFACE_MAX_HEIGHT }}
          initial={motionTarget.hidden}
          animate={open ? motionTarget.shown : motionTarget.hidden}
          transition={motionTarget.transition}
        >
          {children}
        </WindowShell>
      </div>
    </div>
  );
}
