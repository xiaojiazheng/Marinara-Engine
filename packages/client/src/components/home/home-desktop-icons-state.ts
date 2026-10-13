/**
 * The Windows 11 desktop icon model: the fixed built-in icon set, the three tile sizes, and the
 * persisted cell positions. Pure data and pure functions only — no React, no shell state.
 *
 * Positions are grid cells (`col`/`row`, 0-based) rather than pixels: the grid stays responsive, the
 * saved layout survives a resize through `normalizeDesktopIconPositions`, and the whole model stays
 * testable without a DOM.
 */

export const HOME_DESKTOP_ICONS_STORAGE_KEY = "marinara:home:desktop-icons:v1";

/**
 * Storage keys owned by the retired streaming widget grid. Its row/column slots describe a masonry
 * flow, which cannot be read as desktop coordinates, so the first mount drops them instead of
 * migrating a layout the user never arranged. Listed newest-first for easy auditing.
 */
export const RETIRED_HOME_WIDGET_STORAGE_KEYS = [
  "marinara:home:widget-layout:v2",
  "marinara:home:widget-visibility:v2",
  "marinara:home:widget-order:v1",
  "marinara:home:custom-widget-known:v1",
  "marinara:home:widget-visibility:v1",
] as const;

/** Drops the retired widget-grid preferences. Idempotent, and safe when local storage is unavailable. */
export function clearRetiredHomeWidgetStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of RETIRED_HOME_WIDGET_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* Local storage is optional; a blocked removal leaves an inert key behind. */
    }
  }
}

export type HomeDesktopIconSize = "large" | "medium" | "small";

export const DEFAULT_HOME_DESKTOP_ICON_SIZE: HomeDesktopIconSize = "medium";

/**
 * Tile footprint per size, in `rem` so the desktop follows the app's display-size scaling. The cell
 * adds the label's two lines under the square tile; `desktopIconGridMetrics` converts these to the
 * pixels the grid and the drag hit-testing share.
 */
export const HOME_DESKTOP_ICON_SIZES: Record<
  HomeDesktopIconSize,
  { tileRem: number; cellWidthRem: number; cellHeightRem: number }
> = {
  large: { tileRem: 6, cellWidthRem: 7.25, cellHeightRem: 8.25 },
  medium: { tileRem: 4.75, cellWidthRem: 6, cellHeightRem: 7 },
  small: { tileRem: 3.625, cellWidthRem: 4.875, cellHeightRem: 5.875 },
};

/** The sizes offered by the desktop's View submenu, largest first. */
export const HOME_DESKTOP_ICON_SIZE_ORDER: readonly HomeDesktopIconSize[] = ["large", "medium", "small"];

/** Three chat-mode entries mirror the retired hero buttons; they launch through `HomeNewChatLauncher`. */
export type HomeDesktopChatModeIconId = "conversation" | "roleplay" | "game";

export type HomeDesktopIconId =
  | HomeDesktopChatModeIconId
  | "recent"
  | "character-library"
  | "professor"
  | "whats-new"
  | "learn"
  | "community"
  | "discovery"
  | "character"
  | "clock"
  | "achievements";

/** Reading order of the shipped icon set; also the default top-to-bottom order in the first column. */
export const HOME_DESKTOP_ICON_IDS: readonly HomeDesktopIconId[] = [
  "conversation",
  "roleplay",
  "game",
  "recent",
  "character-library",
  "professor",
  "whats-new",
  "learn",
  "community",
  "discovery",
  "character",
  "clock",
  "achievements",
];

/**
 * Icon captions reuse the retired widget labels so the surfaces share one vocabulary; the three chat
 * modes reuse the mode names the launcher already prints elsewhere.
 */
export const HOME_DESKTOP_ICON_LABEL_KEYS: Record<HomeDesktopIconId, string> = {
  conversation: "home.recentChats.mode.conversation",
  roleplay: "home.recentChats.mode.roleplay",
  game: "home.recentChats.mode.game",
  recent: "home.widgets.recent",
  "character-library": "home.widgets.characterLibrary",
  professor: "home.widgets.professor",
  "whats-new": "home.widgets.whatsNew",
  learn: "home.widgets.learn",
  community: "home.widgets.community",
  discovery: "home.widgets.discovery",
  character: "home.widgets.character",
  clock: "home.widgets.clock",
  achievements: "home.widgets.achievements",
};

export type HomeDesktopIconPosition = { col: number; row: number };

export type HomeDesktopIconPositions = Partial<Record<HomeDesktopIconId, HomeDesktopIconPosition>>;

export type HomeDesktopIconLayout = {
  version: 1;
  size: HomeDesktopIconSize;
  positions: HomeDesktopIconPositions;
};

export const DEFAULT_HOME_DESKTOP_ICON_LAYOUT: HomeDesktopIconLayout = {
  version: 1,
  size: DEFAULT_HOME_DESKTOP_ICON_SIZE,
  positions: {},
};

export function isHomeDesktopIconId(value: unknown): value is HomeDesktopIconId {
  return typeof value === "string" && HOME_DESKTOP_ICON_IDS.includes(value as HomeDesktopIconId);
}

export function isHomeDesktopIconSize(value: unknown): value is HomeDesktopIconSize {
  return value === "large" || value === "medium" || value === "small";
}

function normalizePosition(value: unknown): HomeDesktopIconPosition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { col, row } = value as { col?: unknown; row?: unknown };
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  const position = { col: col as number, row: row as number };
  if (position.col < 0 || position.row < 0) return null;
  return position;
}

/** Reads the saved layout, ignoring anything malformed so a bad value cannot strand the desk. */
export function readHomeDesktopIconLayout(): HomeDesktopIconLayout {
  if (typeof window === "undefined") return DEFAULT_HOME_DESKTOP_ICON_LAYOUT;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HOME_DESKTOP_ICONS_STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_HOME_DESKTOP_ICON_LAYOUT;
    const raw = parsed as { size?: unknown; positions?: unknown };
    const positions: HomeDesktopIconPositions = {};
    if (raw.positions && typeof raw.positions === "object" && !Array.isArray(raw.positions)) {
      for (const [id, value] of Object.entries(raw.positions as Record<string, unknown>)) {
        if (!isHomeDesktopIconId(id)) continue;
        const position = normalizePosition(value);
        if (position) positions[id] = position;
      }
    }
    return {
      version: 1,
      size: isHomeDesktopIconSize(raw.size) ? raw.size : DEFAULT_HOME_DESKTOP_ICON_SIZE,
      positions,
    };
  } catch {
    return DEFAULT_HOME_DESKTOP_ICON_LAYOUT;
  }
}

export function writeHomeDesktopIconLayout(layout: HomeDesktopIconLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOME_DESKTOP_ICONS_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* Local storage is optional; the current session keeps the arrangement. */
  }
}

/** Grid geometry shared by the icon grid and the drag hit-testing, in CSS pixels. */
export type HomeDesktopGridMetrics = {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  tileSize: number;
};

function cssPixels(rem: number, rootFontSize: number): number {
  return Math.max(1, Math.round(rem * rootFontSize * 100) / 100);
}

/**
 * Fits as many cells as the available box holds. `rows` never drops below the count the icon set
 * needs, so the desk scrolls vertically instead of stacking icons on one another.
 */
export function desktopIconGridMetrics(
  availableWidth: number,
  availableHeight: number,
  size: HomeDesktopIconSize,
  rootFontSize: number,
  iconCount: number,
): HomeDesktopGridMetrics {
  const spec = HOME_DESKTOP_ICON_SIZES[size];
  const cellWidth = cssPixels(spec.cellWidthRem, rootFontSize);
  const cellHeight = cssPixels(spec.cellHeightRem, rootFontSize);
  const columns = Math.max(1, Math.floor(Math.max(0, availableWidth) / cellWidth));
  const fitted = Math.max(1, Math.floor(Math.max(0, availableHeight) / cellHeight));
  const needed = Math.max(1, Math.ceil(Math.max(1, iconCount) / columns));
  return {
    columns,
    rows: Math.max(fitted, needed),
    cellWidth,
    cellHeight,
    tileSize: cssPixels(spec.tileRem, rootFontSize),
  };
}

/** Fills columns top-to-bottom then left-to-right, the way Windows arranges a fresh desktop. */
export function desktopIconColumnMajorPositions(
  ids: readonly HomeDesktopIconId[],
  rows: number,
): HomeDesktopIconPositions {
  const positions: HomeDesktopIconPositions = {};
  const safeRows = Math.max(1, Math.floor(rows));
  ids.forEach((id, index) => {
    positions[id] = { col: Math.floor(index / safeRows), row: index % safeRows };
  });
  return positions;
}

function positionKey(position: HomeDesktopIconPosition): string {
  return `${position.col}:${position.row}`;
}

/**
 * Maps the saved (or freshly dropped) cells onto the current grid: out-of-range cells are clamped,
 * a cell claimed twice goes to the next free slot, and every icon without a home is placed by
 * first-fit in reading order. The desk therefore always renders a complete, non-overlapping set.
 */
export function normalizeDesktopIconPositions(
  positions: HomeDesktopIconPositions,
  ids: readonly HomeDesktopIconId[],
  metrics: Pick<HomeDesktopGridMetrics, "columns" | "rows">,
): HomeDesktopIconPositions {
  const columns = Math.max(1, Math.floor(metrics.columns));
  const rows = Math.max(1, Math.floor(metrics.rows));
  const placed: HomeDesktopIconPositions = {};
  const taken = new Set<string>();

  for (const id of ids) {
    const stored = positions[id];
    if (!stored) continue;
    const candidate = {
      col: Math.min(Math.max(0, Math.floor(stored.col)), columns - 1),
      row: Math.min(Math.max(0, Math.floor(stored.row)), rows - 1),
    };
    const key = positionKey(candidate);
    if (taken.has(key)) continue;
    taken.add(key);
    placed[id] = candidate;
  }

  let next = 0;
  for (const id of ids) {
    if (placed[id]) continue;
    let cell: HomeDesktopIconPosition;
    do {
      cell = { col: Math.floor(next / rows), row: next % rows };
      next += 1;
    } while (taken.has(positionKey(cell)));
    taken.add(positionKey(cell));
    placed[id] = cell;
  }

  return placed;
}

/** Swaps two icons' cells, or moves one icon into a free cell — the desktop's drag outcome. */
export function moveDesktopIcon(
  positions: HomeDesktopIconPositions,
  draggedId: HomeDesktopIconId,
  target: { kind: "icon"; id: HomeDesktopIconId } | { kind: "empty"; col: number; row: number },
): HomeDesktopIconPositions {
  const from = positions[draggedId];
  if (!from) return positions;
  if (target.kind === "icon") {
    if (target.id === draggedId) return positions;
    const to = positions[target.id];
    if (!to) return positions;
    return { ...positions, [draggedId]: to, [target.id]: from };
  }
  if (target.col === from.col && target.row === from.row) return positions;
  const occupied = Object.entries(positions).some(
    ([id, position]) => id !== draggedId && position?.col === target.col && position?.row === target.row,
  );
  if (occupied) return positions;
  return { ...positions, [draggedId]: { col: target.col, row: target.row } };
}
