import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { ArrowLeft, GripVertical, Search, X } from "lucide-react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import {
  PROFESSOR_MARI_NAVIGATOR_POSITION_STORAGE_KEY,
  PROFESSOR_MARI_NAVIGATOR_RESET_EVENT,
  professorMariNavigatorRuntime,
  type ProfessorMariNavigationTarget,
} from "../../lib/professor-mari-navigation";
import { cn } from "../../lib/utils";

const MARI_ASSISTANT_ARRIVAL_SHEET = "/sprites/mari/generated/professor-mari-assistant-sheet.png";
const MARI_ASSISTANT_IDLE = "/sprites/mari/generated/professor-mari-assistant-idle.png";
const MARI_ASSISTANT_BLINK = "/sprites/mari/generated/professor-mari-assistant-blink-v3.png";
const MARI_ASSISTANT_MAP = "/sprites/mari/generated/professor-mari-assistant-map.png";
const MARI_ASSISTANT_SHRUG = "/sprites/mari/generated/professor-mari-assistant-shrug.png";
const MARI_ASSISTANT_DRAG_SHEET = "/sprites/mari/generated/professor-mari-assistant-drag-sheet-v3.png";
const MARINARA_EFFECTS_PAUSED_EVENT = "marinara:effects-paused";
const PROFESSOR_ASSISTANT_EDGE_MARGIN = 16;
const PROFESSOR_ASSISTANT_HANDLE_CLEARANCE = 12;
const PROFESSOR_ASSISTANT_HOOD_GRAB_X = 0.45;
const PROFESSOR_ASSISTANT_HOOD_GRAB_Y = 0.09;

function readMarinaraEffectsPaused() {
  return typeof document !== "undefined" && document.documentElement.dataset.marinaraEffectsPaused === "true";
}

function useMarinaraEffectsPaused() {
  const [paused, setPaused] = useState(readMarinaraEffectsPaused);
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ paused?: boolean }>).detail;
      setPaused(typeof detail?.paused === "boolean" ? detail.paused : readMarinaraEffectsPaused());
    };
    window.addEventListener(MARINARA_EFFECTS_PAUSED_EVENT, sync);
    return () => window.removeEventListener(MARINARA_EFFECTS_PAUSED_EVENT, sync);
  }, []);
  return paused;
}

type ProfessorAssistantPosition = { x: number; y: number };

type ProfessorAssistantDragLayout = {
  boundaryLeft: number;
  boundaryTop: number;
  boundaryRight: number;
  boundaryBottom: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  spriteWidth: number;
  spriteHeight: number;
  bubbleWidth: number;
  bubbleHeight: number;
};

function getProfessorAssistantBubblePlacement(
  layout: ProfessorAssistantDragLayout,
  position: ProfessorAssistantPosition,
) {
  const overlap = 12;
  const availableRight = layout.boundaryRight - (position.x + layout.spriteWidth);
  const preferBubbleOnLeft = availableRight < layout.bubbleWidth - overlap;
  const preferredLeft = preferBubbleOnLeft
    ? position.x - layout.bubbleWidth + overlap
    : position.x + layout.spriteWidth - overlap;
  const maxBubbleLeft = Math.max(layout.boundaryLeft, layout.boundaryRight - layout.bubbleWidth);
  const left = Math.max(layout.boundaryLeft, Math.min(maxBubbleLeft, preferredLeft));
  const preferredTop = position.y + layout.spriteHeight * 0.6 - layout.bubbleHeight / 2;
  const maxBubbleTop = Math.max(layout.boundaryTop, layout.boundaryBottom - layout.bubbleHeight);
  return {
    bubbleOnLeft: left + layout.bubbleWidth / 2 < position.x + layout.spriteWidth / 2,
    left,
    top: Math.max(layout.boundaryTop, Math.min(maxBubbleTop, preferredTop)),
  };
}

function clampProfessorAssistantPosition(value: number) {
  return Math.max(0, Math.min(1, value));
}

function readProfessorAssistantPosition(): ProfessorAssistantPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFESSOR_MARI_NAVIGATOR_POSITION_STORAGE_KEY) ?? "null") as {
      x?: unknown;
      y?: unknown;
    } | null;
    if (
      !parsed ||
      typeof parsed.x !== "number" ||
      !Number.isFinite(parsed.x) ||
      typeof parsed.y !== "number" ||
      !Number.isFinite(parsed.y)
    )
      return null;
    return {
      x: clampProfessorAssistantPosition(parsed.x),
      y: clampProfessorAssistantPosition(parsed.y),
    };
  } catch {
    return null;
  }
}

function rememberProfessorAssistantPosition(position: ProfessorAssistantPosition) {
  try {
    window.localStorage.setItem(PROFESSOR_MARI_NAVIGATOR_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    /* Local storage is optional; dragging still works for the current mount. */
  }
}

export function FloatingProfessorMari({
  pageActive,
  enabled,
  boundaryRef,
  onResolve,
  onNavigate,
  onOpenProfessor,
  onOpenDocumentation,
  onMeaningfulDrag,
}: {
  pageActive: boolean;
  enabled: boolean;
  boundaryRef: RefObject<HTMLElement | null>;
  onResolve: (query: string) => ProfessorMariNavigationTarget | null;
  onNavigate: (target: ProfessorMariNavigationTarget) => void;
  onOpenProfessor: () => void;
  onOpenDocumentation: () => void;
  onMeaningfulDrag: () => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedAmbientEffects();
  const effectsPaused = useMarinaraEffectsPaused();
  const [visible, setVisible] = useState(
    () =>
      pageActive && enabled && professorMariNavigatorRuntime.hasAppeared && !professorMariNavigatorRuntime.minimized,
  );
  const [minimized, setMinimized] = useState(professorMariNavigatorRuntime.minimized);
  const [phase, setPhase] = useState<"arriving" | "idle" | "map" | "shrug">(
    professorMariNavigatorRuntime.hasAppeared ? "idle" : "arriving",
  );
  const [mode, setMode] = useState<"input" | "success" | "failure">("input");
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const appearanceTimerRef = useRef<number | null>(null);
  const arrivalCompleteTimerRef = useRef<number | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const pendingNavigationTargetRef = useRef<ProfessorMariNavigationTarget | null>(null);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const focusFrameRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragAnimationRef = useRef<HTMLSpanElement | null>(null);
  const dragMoveFrameRef = useRef<number | null>(null);
  const pendingDragPositionRef = useRef<ProfessorAssistantPosition | null>(null);
  const normalizedPositionRef = useRef<ProfessorAssistantPosition | null>(readProfessorAssistantPosition());
  const positionRef = useRef<ProfessorAssistantPosition | null>(null);
  const dragLayoutRef = useRef<ProfessorAssistantDragLayout | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    meaningful: boolean;
  } | null>(null);
  const [desktopDragEnabled, setDesktopDragEnabled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px) and (pointer: fine)").matches,
  );
  const [dragSpriteReady, setDragSpriteReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<ProfessorAssistantPosition | null>(null);
  const [dragLayout, setDragLayout] = useState<ProfessorAssistantDragLayout | null>(null);

  const clearTimers = useCallback(() => {
    if (appearanceTimerRef.current !== null) window.clearTimeout(appearanceTimerRef.current);
    if (arrivalCompleteTimerRef.current !== null) window.clearTimeout(arrivalCompleteTimerRef.current);
    if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    appearanceTimerRef.current = null;
    arrivalCompleteTimerRef.current = null;
    navigationTimerRef.current = null;
    resetTimerRef.current = null;
  }, []);

  const returnToIdle = useCallback(() => {
    clearTimers();
    pendingNavigationTargetRef.current = null;
    setMode("input");
    setPhase("idle");
    setQuery("");
  }, [clearTimers]);

  useEffect(() => {
    const reset = () => {
      clearTimers();
      pendingNavigationTargetRef.current = null;
      normalizedPositionRef.current = null;
      positionRef.current = null;
      dragLayoutRef.current = null;
      setDragPosition(null);
      setDragLayout(null);
      setDragging(false);
      setMinimized(false);
      setMode("input");
      setPhase("idle");
      setQuery("");
      setVisible(pageActive);
    };
    window.addEventListener(PROFESSOR_MARI_NAVIGATOR_RESET_EVENT, reset);
    return () => window.removeEventListener(PROFESSOR_MARI_NAVIGATOR_RESET_EVENT, reset);
  }, [clearTimers, pageActive]);

  const queueInputFocus = useCallback(() => {
    if (focusFrameRef.current !== null) window.cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = null;
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const syncMobile = () => setMobile(mediaQuery.matches);
    syncMobile();
    mediaQuery.addEventListener("change", syncMobile);
    return () => mediaQuery.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px) and (pointer: fine)");
    const syncDesktopDrag = () => setDesktopDragEnabled(mediaQuery.matches);
    syncDesktopDrag();
    mediaQuery.addEventListener("change", syncDesktopDrag);
    return () => mediaQuery.removeEventListener("change", syncDesktopDrag);
  }, []);

  useEffect(() => {
    if (!pageActive || !enabled || minimized || !desktopDragEnabled || dragSpriteReady) return;
    let active = true;
    let settled = false;
    const image = new Image();
    const markReady = () => {
      if (settled) return;
      settled = true;
      if (active) setDragSpriteReady(true);
    };
    const decode = () => {
      if (typeof image.decode === "function") void image.decode().then(markReady, markReady);
      else markReady();
    };
    image.addEventListener("load", decode, { once: true });
    image.src = MARI_ASSISTANT_DRAG_SHEET;
    if (image.complete) decode();
    return () => {
      active = false;
      image.removeEventListener("load", decode);
    };
  }, [desktopDragEnabled, dragSpriteReady, enabled, minimized, pageActive]);

  const syncDragLayout = useCallback(() => {
    if (!desktopDragEnabled || dragRef.current) return;
    const overlay = overlayRef.current;
    const boundary = boundaryRef.current;
    const sprite = spriteRef.current;
    const bubble = bubbleRef.current;
    if (!overlay || !boundary || !sprite || !bubble) return;
    const overlayBounds = overlay.getBoundingClientRect();
    const boundaryBounds = boundary.getBoundingClientRect();
    const spriteBounds = sprite.getBoundingClientRect();
    const bubbleBounds = bubble.getBoundingClientRect();
    const boundaryLeft = boundaryBounds.left - overlayBounds.left + PROFESSOR_ASSISTANT_EDGE_MARGIN;
    const boundaryTop = boundaryBounds.top - overlayBounds.top + PROFESSOR_ASSISTANT_EDGE_MARGIN;
    const boundaryRight = boundaryBounds.right - overlayBounds.left - PROFESSOR_ASSISTANT_EDGE_MARGIN;
    const boundaryBottom = boundaryBounds.bottom - overlayBounds.top - PROFESSOR_ASSISTANT_EDGE_MARGIN;
    const minX = boundaryLeft;
    const minY = boundaryTop + PROFESSOR_ASSISTANT_HANDLE_CLEARANCE;
    const maxX = Math.max(minX, boundaryRight - spriteBounds.width);
    const maxY = Math.max(minY, boundaryBottom - spriteBounds.height);
    let normalized = normalizedPositionRef.current;
    if (!normalized) {
      normalized = {
        x: 0,
        y: 1,
      };
      normalizedPositionRef.current = normalized;
    }
    const nextLayout = {
      boundaryLeft,
      boundaryTop,
      boundaryRight,
      boundaryBottom,
      minX,
      minY,
      maxX,
      maxY,
      spriteWidth: spriteBounds.width,
      spriteHeight: spriteBounds.height,
      bubbleWidth: bubbleBounds.width,
      bubbleHeight: bubbleBounds.height,
    };
    const nextPosition = {
      x: minX + normalized.x * (maxX - minX),
      y: minY + normalized.y * (maxY - minY),
    };
    dragLayoutRef.current = nextLayout;
    positionRef.current = nextPosition;
    setDragLayout(nextLayout);
    setDragPosition(nextPosition);
  }, [boundaryRef, desktopDragEnabled]);

  useLayoutEffect(() => {
    if (!visible || minimized || !desktopDragEnabled) return;
    syncDragLayout();
    const observer = new ResizeObserver(syncDragLayout);
    if (overlayRef.current) observer.observe(overlayRef.current);
    if (boundaryRef.current) observer.observe(boundaryRef.current);
    if (spriteRef.current) observer.observe(spriteRef.current);
    if (bubbleRef.current) observer.observe(bubbleRef.current);
    return () => observer.disconnect();
  }, [boundaryRef, desktopDragEnabled, minimized, mode, syncDragLayout, visible]);

  useEffect(
    () => () => {
      clearTimers();
      if (focusFrameRef.current !== null) window.cancelAnimationFrame(focusFrameRef.current);
      if (dragMoveFrameRef.current !== null) window.cancelAnimationFrame(dragMoveFrameRef.current);
      focusFrameRef.current = null;
      dragMoveFrameRef.current = null;
      pendingDragPositionRef.current = null;
      dragRef.current = null;
      document.documentElement.classList.remove("mari-home-professor-drag-active");
    },
    [clearTimers],
  );

  useEffect(() => {
    if (effectsPaused) {
      clearTimers();
      if (focusFrameRef.current !== null) window.cancelAnimationFrame(focusFrameRef.current);
      if (dragMoveFrameRef.current !== null) window.cancelAnimationFrame(dragMoveFrameRef.current);
      const activeDrag = dragRef.current;
      if (activeDrag && spriteRef.current?.hasPointerCapture(activeDrag.pointerId)) {
        spriteRef.current.releasePointerCapture(activeDrag.pointerId);
      }
      focusFrameRef.current = null;
      dragMoveFrameRef.current = null;
      pendingDragPositionRef.current = null;
      dragRef.current = null;
      document.documentElement.classList.remove("mari-home-professor-drag-active");
      setDragging(false);
      if (reduceMotion && pageActive && enabled && !professorMariNavigatorRuntime.minimized) {
        professorMariNavigatorRuntime.hasAppeared = true;
        setMinimized(false);
        setPhase("idle");
        setVisible(true);
      }
      return;
    }
    if (!pageActive || !enabled) {
      clearTimers();
      if (dragMoveFrameRef.current !== null) window.cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
      pendingDragPositionRef.current = null;
      dragRef.current = null;
      document.documentElement.classList.remove("mari-home-professor-drag-active");
      setDragging(false);
      setVisible(false);
      return;
    }
    if (professorMariNavigatorRuntime.minimized) {
      setMinimized(true);
      setVisible(false);
      return;
    }
    if (professorMariNavigatorRuntime.hasAppeared) {
      setMinimized(false);
      setVisible(true);
      if (phase === "arriving" && !reduceMotion) {
        arrivalCompleteTimerRef.current = window.setTimeout(() => {
          arrivalCompleteTimerRef.current = null;
          setPhase("idle");
        }, 1_600);
      }
      return;
    }
    appearanceTimerRef.current = window.setTimeout(
      () => {
        appearanceTimerRef.current = null;
        professorMariNavigatorRuntime.hasAppeared = true;
        setPhase(reduceMotion ? "idle" : "arriving");
        setVisible(true);
        if (!reduceMotion) {
          arrivalCompleteTimerRef.current = window.setTimeout(() => {
            arrivalCompleteTimerRef.current = null;
            setPhase("idle");
          }, 1_600);
        }
      },
      reduceMotion ? 0 : 1_150,
    );
    return clearTimers;
  }, [clearTimers, effectsPaused, enabled, pageActive, phase, reduceMotion]);

  useEffect(() => {
    if (effectsPaused || !pageActive || !enabled || mode !== "success" || phase !== "map") return;
    const target = pendingNavigationTargetRef.current;
    if (target) {
      navigationTimerRef.current = window.setTimeout(() => {
        navigationTimerRef.current = null;
        pendingNavigationTargetRef.current = null;
        onNavigateRef.current(target);
        resetTimerRef.current = window.setTimeout(returnToIdle, reduceMotion ? 1_250 : 1_400);
      }, 650);
    } else {
      resetTimerRef.current = window.setTimeout(returnToIdle, reduceMotion ? 1_250 : 1_400);
    }
    return () => {
      if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      navigationTimerRef.current = null;
      resetTimerRef.current = null;
    };
  }, [effectsPaused, enabled, mode, pageActive, phase, reduceMotion, returnToIdle]);

  const applyProfessorDragPosition = useCallback((position: ProfessorAssistantPosition) => {
    const sprite = spriteRef.current;
    const bubble = bubbleRef.current;
    const layout = dragLayoutRef.current;
    if (!sprite || !bubble || !layout) return;
    const placement = getProfessorAssistantBubblePlacement(layout, position);
    sprite.style.left = `${position.x}px`;
    sprite.style.top = `${position.y}px`;
    bubble.style.left = `${placement.left}px`;
    bubble.style.top = `${placement.top}px`;
    bubble.dataset.tailSide = placement.bubbleOnLeft ? "right" : "left";
  }, []);

  const beginProfessorDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!desktopDragEnabled || !dragSpriteReady || !dragLayoutRef.current || !positionRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.target instanceof HTMLElement)
      event.target.closest<HTMLElement>("[role=button]")?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const spriteBounds = spriteRef.current?.getBoundingClientRect();
    if (!spriteBounds) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: spriteBounds.width * PROFESSOR_ASSISTANT_HOOD_GRAB_X,
      offsetY: spriteBounds.height * PROFESSOR_ASSISTANT_HOOD_GRAB_Y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      meaningful: false,
    };
    if (dragMoveFrameRef.current !== null) window.cancelAnimationFrame(dragMoveFrameRef.current);
    dragMoveFrameRef.current = null;
    pendingDragPositionRef.current = null;
    for (const animation of dragAnimationRef.current?.getAnimations() ?? []) animation.currentTime = 0;
    document.documentElement.classList.add("mari-home-professor-drag-active");
    flushSync(() => setDragging(true));
  };

  const moveProfessorDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const layout = dragLayoutRef.current;
    const overlay = overlayRef.current;
    if (!drag || !layout || !overlay || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (!drag.meaningful && Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) >= 8) {
      drag.meaningful = true;
    }
    const overlayBounds = overlay.getBoundingClientRect();
    const nextPosition = {
      x: Math.max(layout.minX, Math.min(layout.maxX, event.clientX - overlayBounds.left - drag.offsetX)),
      y: Math.max(layout.minY, Math.min(layout.maxY, event.clientY - overlayBounds.top - drag.offsetY)),
    };
    positionRef.current = nextPosition;
    pendingDragPositionRef.current = nextPosition;
    if (dragMoveFrameRef.current !== null) return;
    dragMoveFrameRef.current = window.requestAnimationFrame(() => {
      dragMoveFrameRef.current = null;
      const pendingPosition = pendingDragPositionRef.current;
      pendingDragPositionRef.current = null;
      if (pendingPosition) applyProfessorDragPosition(pendingPosition);
    });
  };

  const finishProfessorDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const layout = dragLayoutRef.current;
    const position = positionRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (dragMoveFrameRef.current !== null) window.cancelAnimationFrame(dragMoveFrameRef.current);
    dragMoveFrameRef.current = null;
    pendingDragPositionRef.current = null;
    if (position) applyProfessorDragPosition(position);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    document.documentElement.classList.remove("mari-home-professor-drag-active");
    setDragging(false);
    if (drag.meaningful) onMeaningfulDrag();
    if (!layout || !position) return;
    setDragPosition(position);
    const normalized = {
      x: layout.maxX === layout.minX ? 0 : (position.x - layout.minX) / (layout.maxX - layout.minX),
      y: layout.maxY === layout.minY ? 0 : (position.y - layout.minY) / (layout.maxY - layout.minY),
    };
    normalizedPositionRef.current = normalized;
    rememberProfessorAssistantPosition(normalized);
  };

  const nudgeProfessor = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (!desktopDragEnabled || !dragLayout || !dragPosition) return;
    const directions: Record<string, ProfessorAssistantPosition> = {
      ArrowLeft: { x: -16, y: 0 },
      ArrowRight: { x: 16, y: 0 },
      ArrowUp: { x: 0, y: -16 },
      ArrowDown: { x: 0, y: 16 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const nextPosition = {
      x: Math.max(dragLayout.minX, Math.min(dragLayout.maxX, dragPosition.x + direction.x)),
      y: Math.max(dragLayout.minY, Math.min(dragLayout.maxY, dragPosition.y + direction.y)),
    };
    const normalized = {
      x:
        dragLayout.maxX === dragLayout.minX
          ? 0
          : (nextPosition.x - dragLayout.minX) / (dragLayout.maxX - dragLayout.minX),
      y:
        dragLayout.maxY === dragLayout.minY
          ? 0
          : (nextPosition.y - dragLayout.minY) / (dragLayout.maxY - dragLayout.minY),
    };
    normalizedPositionRef.current = normalized;
    positionRef.current = nextPosition;
    setDragPosition(nextPosition);
    rememberProfessorAssistantPosition(normalized);
  };

  const renderedDragPosition = dragging ? positionRef.current : dragPosition;
  const desktopSpriteStyle = useMemo<CSSProperties | undefined>(() => {
    if (!desktopDragEnabled) return undefined;
    if (!renderedDragPosition) return { visibility: "hidden" };
    return { left: renderedDragPosition.x, top: renderedDragPosition.y };
  }, [desktopDragEnabled, renderedDragPosition]);

  const desktopBubblePlacement = useMemo(() => {
    if (!desktopDragEnabled || !dragLayout || !renderedDragPosition) return null;
    const placement = getProfessorAssistantBubblePlacement(dragLayout, renderedDragPosition);
    return {
      bubbleOnLeft: placement.bubbleOnLeft,
      style: {
        left: placement.left,
        top: placement.top,
      } satisfies CSSProperties,
    };
  }, [desktopDragEnabled, dragLayout, renderedDragPosition]);

  if (!pageActive || !enabled) return null;
  if (!visible) {
    if (!minimized) return null;
    return (
      <button
        type="button"
        data-tour="home-navigation"
        onClick={() => {
          clearTimers();
          professorMariNavigatorRuntime.minimized = false;
          setMinimized(false);
          setMode("input");
          setPhase("idle");
          setQuery("");
          setVisible(true);
          queueInputFocus();
        }}
        aria-label={t("home.assistant.navigate")}
        title={t("home.assistant.navigate")}
        className="mari-chrome-accent-frame mari-chrome-accent-panel mari-accent-animated mari-home-professor-recall absolute bottom-[calc(var(--marinara-taskbar-height)_+_max(0.65rem,var(--mari-safe-area-inset-bottom,env(safe-area-inset-bottom))))] right-[max(0.75rem,env(safe-area-inset-right))] z-[30] flex h-14 w-14 items-end justify-center overflow-hidden rounded-full border p-0.5 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[var(--marinara-chat-chrome-highlight-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-chat-chrome-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-95 motion-reduce:transition-none sm:bottom-[calc(var(--marinara-taskbar-height)_+_1rem)] sm:right-4"
      >
        <img
          src={MARI_ASSISTANT_IDLE}
          alt=""
          aria-hidden="true"
          className="h-[92%] w-[92%] object-contain [image-rendering:pixelated]"
          style={{ objectPosition: "calc(50% + 1.5px) bottom" }}
        />
      </button>
    );
  }
  const minimize = () => {
    clearTimers();
    pendingNavigationTargetRef.current = null;
    professorMariNavigatorRuntime.minimized = true;
    setMinimized(true);
    setVisible(false);
  };
  const returnToSearch = () => {
    clearTimers();
    pendingNavigationTargetRef.current = null;
    setMode("input");
    setPhase("idle");
    setQuery("");
    queueInputFocus();
  };
  const submitNavigation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    clearTimers();
    const target = onResolve(query);
    if (target) {
      pendingNavigationTargetRef.current = target;
      setMode("success");
      setPhase("map");
      return;
    }
    setMode("failure");
    setPhase("shrug");
  };
  return (
    <aside
      ref={overlayRef}
      className={cn(
        "mari-home-professor-popup pointer-events-none absolute z-[30]",
        desktopDragEnabled
          ? "inset-0"
          : "bottom-[calc(var(--marinara-taskbar-height)_+_max(0rem,var(--mari-safe-area-inset-bottom,env(safe-area-inset-bottom))))] left-2 right-2 flex items-end justify-end sm:left-5 sm:right-5",
      )}
      aria-label={t("home.assistant.landmark")}
      data-dragging={dragging ? "true" : "false"}
    >
      <div
        ref={spriteRef}
        className={cn(
          "mari-home-professor-popup__sprite group relative z-[2] h-[11.5rem] w-[7.65rem] shrink-0 sm:h-[14rem] sm:w-[9.3rem]",
          desktopDragEnabled &&
            "pointer-events-auto absolute cursor-grab touch-none select-none active:cursor-grabbing",
        )}
        style={desktopSpriteStyle}
        data-component="HomeBrowserHub.ProfessorAssistantSprite"
        onPointerDown={beginProfessorDrag}
        onPointerMove={moveProfessorDrag}
        onPointerUp={finishProfessorDrag}
        onPointerCancel={finishProfessorDrag}
        onLostPointerCapture={finishProfessorDrag}
      >
        {desktopDragEnabled && dragSpriteReady ? (
          <span
            role="button"
            tabIndex={0}
            aria-grabbed={dragging}
            aria-label={t("home.assistant.drag")}
            title={t("home.assistant.drag")}
            data-component="HomeBrowserHub.ProfessorDragHandle"
            className={cn(
              "pointer-events-auto absolute left-[45%] top-[-0.45rem] z-[8] flex h-7 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center text-[var(--muted-foreground)] opacity-0 drop-shadow-[0_2px_4px_var(--background)] transition-[opacity,color,transform] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:text-[var(--marinara-app-accent-solid)] focus-visible:opacity-100 [@media(pointer:fine)]:group-hover:opacity-100",
              dragging && "!cursor-grabbing !text-[var(--marinara-app-accent-solid)] !opacity-100",
            )}
            onKeyDown={nudgeProfessor}
          >
            <GripVertical size="0.9rem" />
          </span>
        ) : null}
        {desktopDragEnabled && dragSpriteReady ? (
          <span
            ref={dragAnimationRef}
            className="mari-home-professor-popup__drag-frame absolute z-[5] bg-no-repeat [background-size:400%_100%]"
            style={{ backgroundImage: `url(${MARI_ASSISTANT_DRAG_SHEET})` }}
            aria-hidden="true"
            data-component="HomeBrowserHub.ProfessorDragAnimation"
          />
        ) : null}
        <div className="mari-home-professor-popup__rest-frame absolute inset-0" aria-hidden="true">
          <span
            className={cn(
              "mari-home-professor-popup__arrival-frame absolute inset-0 z-[2] bg-no-repeat opacity-0 [background-size:400%_100%]",
              phase === "arriving" && "opacity-100",
            )}
            style={{ backgroundImage: `url(${MARI_ASSISTANT_ARRIVAL_SHEET})` }}
          />
          <span
            className={cn(
              "mari-home-professor-popup__idle-stage absolute inset-0 z-[1] opacity-0",
              phase === "idle" && "mari-home-professor-popup__idle-stage--active opacity-100",
            )}
          >
            <img
              src={MARI_ASSISTANT_IDLE}
              alt=""
              draggable={false}
              className="mari-home-professor-popup__idle absolute inset-0 h-full w-full object-contain object-bottom"
            />
            <img
              src={MARI_ASSISTANT_BLINK}
              alt=""
              draggable={false}
              className="mari-home-professor-popup__blink absolute inset-0 h-full w-full object-contain object-bottom"
            />
          </span>
          {phase === "map" || phase === "shrug" ? (
            <img
              src={phase === "map" ? MARI_ASSISTANT_MAP : MARI_ASSISTANT_SHRUG}
              alt=""
              draggable={false}
              className={cn(
                "mari-home-professor-popup__state-image absolute inset-0 z-[3] h-full w-full object-contain object-bottom",
                phase === "map"
                  ? "mari-home-professor-popup__state-image--map"
                  : "mari-home-professor-popup__state-image--shrug",
              )}
            />
          ) : null}
        </div>
      </div>
      <div
        ref={bubbleRef}
        className={cn(
          "mari-chrome-accent-frame mari-chrome-accent-panel mari-accent-animated mari-home-professor-popup__bubble pointer-events-auto z-[3] rounded-2xl border px-4 py-3.5 pr-10",
          desktopDragEnabled
            ? "absolute w-[min(22rem,calc(100%_-_2rem))]"
            : "relative mb-[5.5rem] -ml-2 w-[min(22rem,calc(100%_-_6.5rem))] sm:mb-[6.5rem] sm:-ml-3",
          desktopDragEnabled && !desktopBubblePlacement && "invisible",
          dragging && desktopDragEnabled && "pointer-events-none",
        )}
        style={desktopBubblePlacement?.style}
        data-component="HomeBrowserHub.ProfessorAssistantBubble"
        data-tour="home-navigation"
        data-tail-side={desktopBubblePlacement ? (desktopBubblePlacement.bubbleOnLeft ? "right" : "left") : undefined}
      >
        <span
          className="mari-home-professor-popup__bubble-tail"
          aria-hidden="true"
          data-component="HomeBrowserHub.ProfessorAssistantBubbleTail"
        />
        <button
          type="button"
          onClick={minimize}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] [@media(pointer:coarse)]:right-0.5 [@media(pointer:coarse)]:top-0.5 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-chat-chrome-focus-ring)]"
          aria-label={t("home.assistant.dismiss")}
        >
          <X size="0.72rem" />
        </button>
        <p className="text-xs font-bold leading-relaxed text-[var(--foreground)] sm:text-sm">
          {dragging
            ? t("home.assistant.dragPrompt")
            : mode === "success"
              ? t("home.assistant.found")
              : mode === "failure"
                ? t("home.assistant.notFound")
                : t("home.assistant.prompt")}
        </p>
        {!dragging && mode === "input" ? (
          <form onSubmit={submitNavigation} className="relative mt-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") returnToIdle();
              }}
              aria-label={t("home.assistant.searchPlaceholder")}
              placeholder={t(mobile ? "home.assistant.searchPlaceholderMobile" : "home.assistant.searchPlaceholder")}
              className="mari-chrome-field h-9 w-full rounded-lg pl-3 pr-9 text-xs [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:pr-11"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9 text-[var(--marinara-app-accent-solid)] transition-colors hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-app-accent-solid)] disabled:opacity-35"
              aria-label={t("home.assistant.searchAction")}
            >
              <Search size="0.8rem" />
            </button>
          </form>
        ) : !dragging && mode === "failure" ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={returnToSearch}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-app-accent-solid)]"
              aria-label={t("home.assistant.back")}
              title={t("home.assistant.back")}
            >
              <ArrowLeft size="0.78rem" />
            </button>
            <button
              type="button"
              onClick={() => {
                returnToIdle();
                onOpenDocumentation();
              }}
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-2.5 text-[0.6875rem] font-bold text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--marinara-app-accent-solid)]"
            >
              {t("home.actions.documentation")}
            </button>
            <button
              type="button"
              onClick={onOpenProfessor}
              className="mari-chrome-control mari-chrome-control--compact mari-chrome-control--selected mari-accent-animated h-8 px-2.5 text-[0.6875rem] font-extrabold"
            >
              {t("home.assistant.askProfessor")}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
