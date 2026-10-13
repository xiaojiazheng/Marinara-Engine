// ──────────────────────────────────────────────
// Reusable animated modal shell
// Uses CSS animations instead of framer-motion to
// avoid double-animation under React.StrictMode.
// ──────────────────────────────────────────────
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Minus, Square, X } from "lucide-react";
import {
  NEUTRAL_PANEL_HEADER,
  NEUTRAL_PANEL_SCROLL_AREA,
  NEUTRAL_PANEL_SHELL,
  NEUTRAL_PANEL_TITLE,
  WIN11_WINDOW_PANEL_SHELL,
} from "./neutral-surface-styles";
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
   * Shell chrome. "window" (default) is a Windows 11 window: an acrylic surface with a
   * 32px title bar holding the window keys. "dialog" keeps the plain title-and-close bar
   * for confirmations, which are answered rather than managed.
   */
  chrome?: "window" | "dialog";
  /** 16px icon shown before the title in a "window" title bar. */
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

// Tailwind's `max-sm`: below it the title bar and one key are all a phone-width window fits.
const NARROW_TITLEBAR_QUERY = "(max-width: 39.99rem)";
// Window keys (globals.css §26): geometry, hover feedback and the red close hover.
const WINDOW_CONTROL_CLASS = "mari-win11-window__control";
const WINDOW_CLOSE_CONTROL_CLASS = "mari-win11-window__control mari-win11-window__control--close";
// The dialog bar keeps the neutral panel close button it always had.
const DIALOG_CLOSE_CLASS =
  "flex shrink-0 items-center justify-center rounded-lg p-1.5 text-[var(--marinara-chat-chrome-panel-muted)] transition-colors max-md:h-9 max-md:w-9 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 hover:bg-[var(--marinara-chat-chrome-highlight-bg-hover)] hover:text-[var(--marinara-chat-chrome-highlight-text)] disabled:cursor-wait disabled:opacity-40";

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
  const isWindowChrome = chrome === "window";
  // A 320px title bar holds the title and one key, so a narrow window renders Close only.
  const narrowTitlebar = useMatchMedia(NARROW_TITLEBAR_QUERY);
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
      <div
        data-backdrop-dismiss-surface="true"
        className="mari-modal-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        style={{
          opacity: isEntering ? 1 : 0,
          transition: "opacity 150ms ease-out",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        data-modal-chrome={chrome}
        className={`mari-modal-panel ${isWindowChrome ? WIN11_WINDOW_PANEL_SHELL : NEUTRAL_PANEL_SHELL} relative flex w-full flex-col ${dragThrough ? "pointer-events-auto" : ""} ${width} max-h-[calc(100dvh-1.5rem)] sm:max-h-[min(90dvh,52rem)]${
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
        {/* Header. A window title bar keeps its keys as direct children of the header row:
            the chat-widget themes paint action-window header buttons through
            `.mari-chat-action-panel > .marinara-chat-popover__header > button`
            (styles/themes/chat-widget-surfaces.css), so a wrapper group would drop them. */}
        <div
          className={`${NEUTRAL_PANEL_HEADER} ${
            isWindowChrome ? "mari-win11-window__titlebar mari-win11-window__controls " : ""
          }shrink-0 flex items-center justify-between`}
        >
          <h2 className={`${NEUTRAL_PANEL_TITLE}${isWindowChrome ? " mari-win11-window__title" : ""}`}>
            {isWindowChrome && titleIcon ? <span className="mari-win11-window__title-icon">{titleIcon}</span> : null}
            {isWindowChrome ? <span className="min-w-0 truncate">{localizedTitle}</span> : localizedTitle}
          </h2>
          {isWindowChrome && !narrowTitlebar ? (
            <>
              {/* Minimize and maximize are the shell's shape, not a promise: the modal has no
                  window state to collapse or restore, so both keys are inert. */}
              <button
                type="button"
                data-modal-control="minimize"
                aria-disabled="true"
                tabIndex={-1}
                aria-label={localizeUi("window.controls.minimize")}
                title={localizeUi("window.controls.minimize")}
                className={WINDOW_CONTROL_CLASS}
              >
                <Minus size="1rem" />
              </button>
              <button
                type="button"
                data-modal-control="maximize"
                aria-disabled="true"
                tabIndex={-1}
                aria-label={localizeUi("window.controls.maximize")}
                title={localizeUi("window.controls.maximize")}
                className={WINDOW_CONTROL_CLASS}
              >
                <Square size="1rem" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            data-modal-control={isWindowChrome ? "close" : undefined}
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={closeLabelText}
            title={isWindowChrome ? closeLabelText : undefined}
            className={isWindowChrome ? WINDOW_CLOSE_CONTROL_CLASS : DIALOG_CLOSE_CLASS}
          >
            <X size="1rem" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className={`${isWindowChrome ? "mari-win11-window__body " : ""}min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 ${NEUTRAL_PANEL_SCROLL_AREA} ${contentClassName ?? ""}`}
        >
          {children}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
