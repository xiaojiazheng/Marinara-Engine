import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { achievementKeys } from "../../hooks/use-achievements";
import { useAllCharacterCatalog } from "../../hooks/use-characters";
import { homeFeedKeys } from "../../hooks/use-home-feed";
import { useReducedAmbientEffects } from "../../hooks/use-reduced-ambient-effects";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_HOME_DESKTOP_ICON_SIZE,
  HOME_DESKTOP_ICON_IDS,
  clearRetiredHomeWidgetStorage,
  desktopIconColumnMajorPositions,
  desktopIconGridMetrics,
  moveDesktopIcon,
  normalizeDesktopIconPositions,
  readHomeDesktopIconLayout,
  writeHomeDesktopIconLayout,
  type HomeDesktopGridMetrics,
  type HomeDesktopIconId,
  type HomeDesktopIconPositions,
  type HomeDesktopIconSize,
} from "./home-desktop-icons-state";

/** Icons that own an acrylic window opened from the desk; the rest act through injected callbacks. */
export type HomeDesktopIconWindowId = "recent" | "whats-new" | "learn" | "community" | "clock" | "achievements";

export const HOME_DESKTOP_WINDOW_ICON_IDS: readonly HomeDesktopIconWindowId[] = [
  "recent",
  "whats-new",
  "learn",
  "community",
  "clock",
  // Achievements keeps the card's compact preview (latest unlock + closest goal) inside the window, so
  // the preview and its "Open Achievements" entry survive the widget retirement.
  "achievements",
];

export function isHomeDesktopWindowIcon(id: HomeDesktopIconId): id is HomeDesktopIconWindowId {
  return (HOME_DESKTOP_WINDOW_ICON_IDS as readonly string[]).includes(id);
}

export type HomeDesktopIconsOptions = {
  /** The scrolling field the icons are laid out in; its box sizes the grid. */
  surfaceRef: RefObject<HTMLElement | null>;
  /** The achievements entry only exists while the setting is on, exactly as the bell in the tray. */
  achievementsEnabled: boolean;
  /** Localized caption for an icon, used by Sort by → Name. */
  iconLabel: (id: HomeDesktopIconId) => string;
};

const DRAG_THRESHOLD_PX = 4;
const DOUBLE_CLICK_WINDOW_MS = 450;

function readRootFontSize(): number {
  if (typeof window === "undefined") return 16;
  const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}

function samePositions(left: HomeDesktopIconPositions, right: HomeDesktopIconPositions): boolean {
  const leftIds = Object.keys(left);
  const rightIds = Object.keys(right);
  if (leftIds.length !== rightIds.length) return false;
  return leftIds.every((id) => {
    const a = left[id as HomeDesktopIconId];
    const b = right[id as HomeDesktopIconId];
    return a?.col === b?.col && a?.row === b?.row;
  });
}

/**
 * The desk's icon state: which icons exist, where their cells sit on the current grid, the selected
 * icon, and the pointer drag that swaps two cells. Rendering and the open behaviour live in
 * `HomeDesktopIcons`, which receives this model as one prop.
 */
export function useHomeDesktopIcons({ surfaceRef, achievementsEnabled, iconLabel }: HomeDesktopIconsOptions) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedAmbientEffects();
  const [storedLayout, setStoredLayout] = useState(readHomeDesktopIconLayout);
  const [positions, setPositions] = useState<HomeDesktopIconPositions>(storedLayout.positions);
  const [size, setSizeState] = useState<HomeDesktopIconSize>(storedLayout.size);
  /**
   * Render-only placeholder for the first paint, before the field can be measured. It is deliberately
   * never fed into the layout pipeline: `measured` gates normalization and persistence until the real
   * box is known (see the effects below).
   */
  const [metrics, setMetrics] = useState<HomeDesktopGridMetrics>({
    columns: 1,
    rows: HOME_DESKTOP_ICON_IDS.length,
    cellWidth: 96,
    cellHeight: 112,
    tileSize: 76,
  });
  const [measured, setMeasured] = useState(false);
  const [selectedId, setSelectedId] = useState<HomeDesktopIconId | null>(null);
  const [draggingId, setDraggingId] = useState<HomeDesktopIconId | null>(null);
  const [openWindowId, setOpenWindowId] = useState<HomeDesktopIconWindowId | null>(null);
  const dragRef = useRef<{
    id: HomeDesktopIconId;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const icons = useMemo<HomeDesktopIconId[]>(
    () => HOME_DESKTOP_ICON_IDS.filter((id) => id !== "achievements" || achievementsEnabled),
    [achievementsEnabled],
  );

  // The retired widget grid left preferences this desk cannot read; drop them once on first mount.
  useEffect(() => {
    clearRetiredHomeWidgetStorage();
  }, []);

  const measure = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const next = desktopIconGridMetrics(
      surface.clientWidth,
      surface.clientHeight,
      size,
      readRootFontSize(),
      icons.length,
    );
    setMetrics((current) =>
      current.columns === next.columns &&
      current.rows === next.rows &&
      current.cellWidth === next.cellWidth &&
      current.cellHeight === next.cellHeight &&
      current.tileSize === next.tileSize
        ? current
        : next,
    );
    // A zero-sized box (still mounting, or inside a hidden container) is not a real grid: normalizing
    // against it would flatten the saved arrangement, so only a laid-out field counts as measured.
    if (surface.clientWidth > 0 && surface.clientHeight > 0) setMeasured(true);
  }, [icons.length, size, surfaceRef]);

  useEffect(() => {
    measure();
    const surface = surfaceRef.current;
    const observer = typeof ResizeObserver === "undefined" || !surface ? null : new ResizeObserver(() => measure());
    if (surface) observer?.observe(surface);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, surfaceRef]);

  // Every icon needs a valid, unique cell: a resize, a new size, or the achievements toggle re-fits
  // the saved arrangement instead of dropping it. Gated on `measured` so the placeholder grid cannot
  // clamp saved columns into the first one before the field reports its real width.
  useEffect(() => {
    if (!measured) return;
    setPositions((current) => {
      const next = normalizeDesktopIconPositions(current, icons, metrics);
      return samePositions(current, next) ? current : next;
    });
  }, [icons, measured, metrics]);

  // Persist only once the field is measured, keeping the read → measure → normalize → write order: the
  // first stored value is already fitted to the real grid, and an unmeasured grid never overwrites it.
  useEffect(() => {
    if (!measured) return;
    setStoredLayout({ version: 1, size, positions });
    writeHomeDesktopIconLayout({ version: 1, size, positions });
  }, [measured, positions, size]);

  const selectIcon = useCallback((id: HomeDesktopIconId | null) => setSelectedId(id), []);

  const setSize = useCallback((next: HomeDesktopIconSize) => {
    setSizeState(next);
    setSelectedId((current) => current);
  }, []);

  const cellAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const surface = surfaceRef.current;
      if (!surface) return null;
      const bounds = surface.getBoundingClientRect();
      const col = Math.floor((clientX - bounds.left + surface.scrollLeft) / metrics.cellWidth);
      const row = Math.floor((clientY - bounds.top + surface.scrollTop) / metrics.cellHeight);
      if (row < 0) return null;
      return { col: Math.min(Math.max(0, col), metrics.columns - 1), row: Math.max(0, row) };
    },
    [metrics.cellHeight, metrics.cellWidth, metrics.columns, surfaceRef],
  );

  /**
   * Arms a drag on pointer down, exactly as the Windows 11 desktop does: the press alone only selects.
   * Pointer capture is deliberately *not* taken here — capturing on pointer down redirects the whole
   * gesture to this cell, which also steals the double-click from the icon's inner button (Chromium
   * then targets the cell, so the button never sees `dblclick`). Capture is taken in `moveDrag`, once
   * the pointer actually travels far enough to be a drag.
   */
  const beginDrag = useCallback((id: HomeDesktopIconId, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    setSelectedId(id);
  }, []);

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        // The threshold is the capture point: from here the whole gesture belongs to this cell, so the
        // pointer keeps moving the icon even once it leaves the cell's box. Capture is best effort —
        // without it the drag still tracks while the pointer stays over the cell.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* An already-released pointer needs no capture. */
        }
        setDraggingId(drag.id);
        document.documentElement.classList.add("mari-home-desktop-drag-active");
      }
      const cell = cellAtPoint(event.clientX, event.clientY);
      if (!cell) return;
      setPositions((current) => {
        const occupant = Object.entries(current).find(
          ([id, position]) => id !== drag.id && position?.col === cell.col && position?.row === cell.row,
        );
        const target = occupant
          ? ({ kind: "icon", id: occupant[0] as HomeDesktopIconId } as const)
          : ({ kind: "empty", col: cell.col, row: cell.row } as const);
        return moveDesktopIcon(current, drag.id, target);
      });
    },
    [cellAtPoint],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    // The release also emits a click on the cell; the drag must not double as an open gesture.
    suppressClickRef.current = true;
    setDraggingId(null);
    document.documentElement.classList.remove("mari-home-desktop-drag-active");
  }, []);

  // A press that ends outside the cell never reaches the cell's own pointerup (no capture was taken
  // before the threshold), so the drag is also cleared from the window. A drag that did capture is
  // already cleared by `endDrag`, which runs first, and this handler then sees nothing to do.
  useEffect(() => {
    const clearPointerDrag = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      suppressClickRef.current = drag.moved;
      setDraggingId(null);
      document.documentElement.classList.remove("mari-home-desktop-drag-active");
    };
    window.addEventListener("pointerup", clearPointerDrag);
    window.addEventListener("pointercancel", clearPointerDrag);
    return () => {
      window.removeEventListener("pointerup", clearPointerDrag);
      window.removeEventListener("pointercancel", clearPointerDrag);
      document.documentElement.classList.remove("mari-home-desktop-drag-active");
    };
  }, []);

  /** True once after a drag, so the trailing click neither selects nor opens an icon. */
  const consumeClickSuppression = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const lastClickRef = useRef(0);
  /**
   * Windows opens a desktop icon on double-click and selects it on the first click. A first click is
   * swallowed here; the second one is left to the icon's own surface, so the chat-mode icons launch
   * through `HomeNewChatLauncher` without duplicating its create-chat logic.
   */
  const handleIconClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>, id: HomeDesktopIconId) => {
      if (consumeClickSuppression()) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      if (event.detail === 0) return; // Keyboard activation opens immediately.
      const now = performance.now();
      const isSecondClick = now - lastClickRef.current < DOUBLE_CLICK_WINDOW_MS;
      lastClickRef.current = isSecondClick ? 0 : now;
      if (isSecondClick) return;
      event.stopPropagation();
      setSelectedId(id);
    },
    [consumeClickSuppression],
  );

  /** Sort by → Name rewrites the cells as a fresh top-to-bottom column order, as Windows does. */
  const sortByName = useCallback(() => {
    const ordered = [...icons].sort((left, right) =>
      iconLabel(left).localeCompare(iconLabel(right), undefined, { sensitivity: "base" }),
    );
    setPositions(desktopIconColumnMajorPositions(ordered, metrics.rows));
  }, [iconLabel, icons, metrics.rows]);

  /**
   * Refresh re-fits the grid and reloads the icon windows' data. It deliberately keeps the user's
   * arrangement: Windows' Refresh never moves the icons a user placed.
   */
  const refresh = useCallback(() => {
    measure();
    setPositions((current) => normalizeDesktopIconPositions(current, icons, metrics));
    void queryClient.invalidateQueries({ queryKey: homeFeedKeys.all });
    void queryClient.invalidateQueries({ queryKey: achievementKeys.all });
  }, [icons, measure, metrics, queryClient]);

  const resetArrangement = useCallback(() => {
    setPositions(desktopIconColumnMajorPositions(icons, metrics.rows));
  }, [icons, metrics.rows]);

  const gridStyle = useMemo(
    () =>
      ({
        "--mari-desktop-cell-width": `${metrics.cellWidth}px`,
        "--mari-desktop-cell-height": `${metrics.cellHeight}px`,
        "--mari-desktop-tile-size": `${metrics.tileSize}px`,
        gridTemplateColumns: `repeat(${metrics.columns}, var(--mari-desktop-cell-width))`,
        gridAutoRows: "var(--mari-desktop-cell-height)",
      }) as CSSProperties,
    [metrics],
  );

  return {
    icons,
    positions,
    metrics,
    size,
    setSize,
    selectedId,
    selectIcon,
    draggingId,
    beginDrag,
    moveDrag,
    endDrag,
    handleIconClickCapture,
    openWindowId,
    setOpenWindowId,
    sortByName,
    refresh,
    resetArrangement,
    gridStyle,
    reduceMotion,
    defaultSize: DEFAULT_HOME_DESKTOP_ICON_SIZE,
  };
}

export type HomeDesktopIconsModel = ReturnType<typeof useHomeDesktopIcons>;

/**
 * The character the "Character of the Day" icon opens: the same deterministic day pick the retired
 * card used, narrowed to the id the detail surface needs.
 */
export function useCharacterOfDay() {
  const catalog = useAllCharacterCatalog();
  return useMemo(() => {
    const rows = (catalog.data ?? []).filter((row) => row.name.trim().length > 0);
    if (rows.length === 0) return null;
    const day = new Date().toISOString().slice(0, 10);
    const hash = Array.from(day).reduce((total, character) => total + character.charCodeAt(0), 0);
    const row = rows[hash % rows.length];
    if (!row || typeof row.id !== "string") return null;
    return { id: row.id, name: row.name };
  }, [catalog.data]);
}
