// ──────────────────────────────────────────────
// Reusable animated modal shell
// Uses CSS animations instead of framer-motion to
// avoid double-animation under React.StrictMode.
//
// The window itself is the shared <WindowShell>, so a dialog is the same acrylic frame, title bar and
// close key as every other window. `chrome` only says what the window means: a `dialog` is answered
// rather than managed, so it renders no key beyond close — and neither does a `window`, which has no
// second state either.
// ──────────────────────────────────────────────
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from "react";
import { createPortal } from "react-dom";
import { NEUTRAL_PANEL_SCROLL_AREA, NEUTRAL_SURFACE_VARIABLES } from "./neutral-surface-styles";
import { WindowBackdrop } from "../window/WindowBackdrop";
import { WindowShell } from "../window/WindowShell";
import { WindowTitleBar } from "../window/WindowTitleBar";
import { useDialogFocusScope } from "../../hooks/use-dialog-focus-scope";
import { useMatchMedia } from "../../hooks/use-match-media";
import { useBackdropDismiss } from "../../hooks/use-backdrop-dismiss";
import { useBackDismiss } from "../../hooks/use-back-dismiss";
import { registerModalOverlay, type ModalOverlayRegistration } from "../../lib/modal-overlay-registry";
import { useLocalizedUiText } from "../../localization/use-localized-ui-text";
import { useTranslation as useUiTranslation } from "react-i18next";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Width class, e.g. "max-w-md", "max-w-lg" */
  width?: string;
  contentRef?: Ref<HTMLDivElement>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  focusScopePortalSelector?: string;
  chatFloatingPanel?: boolean;
  /** Below the sm breakpoint, fill the viewport edge-to-edge like a window instead of floating as a padded bubble. */
  mobileFullscreen?: boolean;
  /** Optional feature-local classes applied to the full panel, including its header. */
  panelClassName?: string;
  /** Optional feature-local classes applied to the scrollable content area. */
  contentClassName?: string;
  /** Optional feature-local style variables applied to the full panel. */
  panelStyle?: CSSProperties;
  closeDisabled?: boolean;
  /** Let drag hit-testing reach content behind the modal while keeping the panel interactive. */
  dragThrough?: boolean;
  /**
   * What the window means. A `dialog` (default `window`) is answered rather than managed: confirmations
   * and prompts keep the same acrylic frame and close key as every other window.
   */
  chrome?: "window" | "dialog";
  /** 16px icon shown before the title in the title bar. */
  titleIcon?: ReactNode;
  /**
   * Accessible name for the close key. A caller whose window answers a narrower question than the
   * title says — a setup wizard still closes "setup", not "Game" — can name the key itself.
   */
  closeLabel?: string;
  /**
   * Panel footer, rendered outside the scrollable body so its actions stay reachable while the
   * content above them scrolls. The caller owns the footer's own chrome (border, padding).
   */
  footer?: ReactNode;
}

/** The `sm` breakpoint: below it a `mobileFullscreen` window fills the viewport as a sheet. */
const NARROW_WINDOW_QUERY = "(max-width: 39.99rem)";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
  contentRef,
  initialFocusRef,
  restoreFocusRef,
  focusScopePortalSelector,
  chatFloatingPanel = false,
  mobileFullscreen = false,
  panelClassName,
  contentClassName,
  panelStyle,
  closeDisabled = false,
  dragThrough = false,
  chrome = "window",
  titleIcon,
  closeLabel,
  footer,
}: ModalProps) {
  const { t: localizeUi } = useUiTranslation();
  const localize = useLocalizedUiText();
  const localizedTitle = localize(title);
  // A full-screen phone window is the shell's `sheet` variant; every other window is the centred one.
  const narrowWindow = useMatchMedia(NARROW_WINDOW_QUERY);
  const sheetWindow = mobileFullscreen && narrowWindow;
  const closeLabelText =
    closeLabel === undefined
      ? localizeUi("ui.ui.modal.value1Value2", { value1: localize("Close"), value2: localizedTitle })
      : localize(closeLabel);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Track mounted state separately so we can play the exit animation
  // before actually removing the DOM nodes.
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState<"enter" | "exit" | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const backdropDismiss = useBackdropDismiss(onClose, closeDisabled);
  const overlayRegistrationRef = useRef<ModalOverlayRegistration | null>(null);
  useDialogFocusScope(
    open && mounted,
    panelRef,
    initialFocusRef,
    restoreFocusRef,
    focusScopePortalSelector,
    () => overlayRegistrationRef.current?.isTopmost() ?? true,
  );
  // Hardware / gesture back closes the topmost modal. While closing is disabled
  // the press is absorbed rather than ignored, matching Escape: an in-flight
  // operation must not be interrupted by backgrounding the app.
  useBackDismiss(open, () => {
    if (!closeDisabled) onClose();
  });

  useEffect(() => {
    if (enterRafRef.current !== null) {
      cancelAnimationFrame(enterRafRef.current);
      enterRafRef.current = null;
    }

    if (open) {
      setMounted(true);
      // Start enter animation on next frame so the DOM is present
      enterRafRef.current = requestAnimationFrame(() => {
        setAnimating("enter");
      });
    } else if (mounted) {
      // Reduced motion has no fade (globals.css), so there is no transitionend to wait for.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMounted(false);
        setAnimating(null);
      } else {
        setAnimating("exit");
      }
    }

    return () => {
      if (enterRafRef.current !== null) {
        cancelAnimationFrame(enterRafRef.current);
        enterRafRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register as an open overlay, in opening order. Two readers: screens that
  // draw their own full-page shell learn that a dialog is stacked above them,
  // and the Escape listener below asks whether THIS dialog is the topmost one,
  // since every open Modal hears the same keypress and none stops propagation.
  useEffect(() => {
    if (!open) return;
    const registration = registerModalOverlay();
    overlayRegistrationRef.current = registration;
    return () => {
      registration.release();
      overlayRegistrationRef.current = null;
    };
  }, [open]);

  // Close on Escape, but only the topmost open dialog: a confirm opened over a
  // settings dialog must not take the settings dialog down with it.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Escape while an IME is composing cancels the composition first.
      if (e.isComposing) return;
      if (e.key !== "Escape" || closeDisabled) return;
      if (!overlayRegistrationRef.current?.isTopmost()) return;
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, closeDisabled]);

  // Remove from DOM after exit animation completes
  const handleAnimationEnd = () => {
    if (animating === "exit") {
      setMounted(false);
      setAnimating(null);
    }
  };

  // Fallback: browsers skip CSS transitions in hidden tabs, so transitionend
  // may never fire when a modal is closed programmatically while the tab is
  // backgrounded (e.g. a game starting auto-closes its setup). Without this
  // the overlay stays mounted forever and blocks clicks.
  useEffect(() => {
    if (animating !== "exit") return;
    const timer = setTimeout(() => {
      setMounted(false);
      setAnimating(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [animating]);

  if (!mounted) return null;

  const isEntering = animating === "enter";

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={localizedTitle}
      data-chat-floating-panel={chatFloatingPanel ? "true" : undefined}
      data-component="Modal"
      className={`mari-modal fixed inset-0 z-[10000] flex items-center justify-center ${dragThrough ? "pointer-events-none" : ""} ${
        mobileFullscreen
          ? "p-0 sm:p-4"
          : "p-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] max-md:pb-[max(0.75rem,var(--mari-safe-area-inset-bottom,env(safe-area-inset-bottom)))] sm:p-4"
      }`}
      style={{
        opacity: isEntering ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
      onTransitionEnd={handleAnimationEnd}
      {...backdropDismiss}
    >
      {/* Backdrop */}
      <WindowBackdrop
        className="mari-modal-backdrop bg-black/55 backdrop-blur-[2px]"
        style={{
          opacity: isEntering ? 1 : 0,
          transition: "opacity 150ms ease-out",
        }}
      />

      {/* Panel */}
      <WindowShell
        surfaceRef={panelRef}
        variant={sheetWindow ? "sheet" : "fixed"}
        chrome={chrome}
        tabIndex={-1}
        titleBar={
          <WindowTitleBar
            title={localizedTitle}
            icon={titleIcon}
            onClose={onClose}
            closeLabel={closeLabelText}
            closeDisabled={closeDisabled}
          />
        }
        bodyClassName={`overflow-y-auto overscroll-contain px-5 py-4 ${NEUTRAL_PANEL_SCROLL_AREA} ${contentClassName ?? ""}`}
        bodyRef={contentRef}
        footer={footer}
        className={`mari-modal-panel marinara-chat-popover animate-message-in ${NEUTRAL_SURFACE_VARIABLES} relative flex w-full ${dragThrough ? "pointer-events-auto" : ""} ${width} max-h-[calc(100dvh-1.5rem)] sm:max-h-[min(90dvh,52rem)]${
          mobileFullscreen
            ? " max-sm:h-full max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:pt-[env(safe-area-inset-top)] max-sm:pb-[var(--mari-safe-area-inset-bottom,env(safe-area-inset-bottom))]"
            : ""
        } ${panelClassName ?? ""}`}
        style={{
          ...panelStyle,
          opacity: isEntering ? 1 : 0,
          // Settle at `none`: an identity transform keeps the entire image library in a composited layer.
          transform: isEntering ? undefined : "scale(0.97) translateY(6px)",
          transition: "opacity 150ms ease-out, transform 150ms ease-out",
        }}
      >
        {children}
      </WindowShell>
    </div>,
    document.body,
  );
}
