// ──────────────────────────────────────────────
// Window chrome: the one shell's variants, bars and shared class names
//
// Every window in the app — the two side panes, a centre-area surface and every dialog —
// renders through <WindowShell>, so one title bar, one set of keys and one acrylic surface
// exist. The frame's structure (title bar height, key size and place) is the shell's and is
// not themeable; `--mari-window-*` (globals.css §4a2) only restyles its colour, corner, blur
// and shadow. Chat floating windows (<FloatingWindow>) keep the same `.mari-window…` class
// family for their own geometry and behaviours.
// ──────────────────────────────────────────────

/**
 * How a window is placed. The shell always paints the frame; only `maximized` also owns a
 * placement, because it is the one variant rendered in place instead of by its own layer.
 */
export type WindowShellVariant = "fixed" | "maximized" | "floating" | "sheet";

/**
 * Which bar a window draws. Both draw the title and the close key — a window with no second state
 * renders no second key — so the difference is what the window means: a `dialog` is answered,
 * a `window` is managed.
 */
export type WindowShellChrome = "window" | "dialog";

/** The shell surface's `data-component`. */
export const WINDOW_SHELL_COMPONENT = "WindowShell";
/** The shell's title bar. */
export const WINDOW_TITLE_BAR_COMPONENT = "WindowTitleBar";
/** The title bar's icon slot. */
export const WINDOW_TITLE_BAR_ICON_COMPONENT = "WindowTitleBarIcon";
/**
 * The dimmed layer a window floats on. The name is kept from the centre-area contract
 * (`e2e/shell-overlay-popover.e2e.ts` hit-tests it).
 */
export const WINDOW_BACKDROP_COMPONENT = "ShellWindowBackdrop";

/** The surface classes every shell carries; globals.css §4a2 paints them. */
export const WINDOW_SHELL_BASE_CLASS = "mari-window flex min-h-0 flex-col overflow-hidden";

/** The close key: the canonical window-control key, with the OS red on hover. */
export const WINDOW_CLOSE_KEY_CLASS = "mari-window__control mari-window__control--close";

/** The inset a `maximized` shell keeps against the area it fills (`m-2`, 8px). */
export const WINDOW_SHELL_GUTTER_PX = 8;

/**
 * Placement per variant. Only `maximized` places itself: a `fixed` window is centred by
 * `ShellOverlayPopover`'s layer, a `floating` one by `<FloatingWindow>`'s geometry, and a `sheet`
 * by the caller's viewport classes.
 */
export const WINDOW_SHELL_VARIANT_CLASS: Record<WindowShellVariant, string> = {
  fixed: "",
  maximized: "absolute inset-0 m-2",
  floating: "",
  sheet: "",
};

/**
 * The attributes a shell marks its surface with. Exported so a frame that must stay a motion host in
 * place (AppShell's centre-area surfaces) is the same shell to CSS and to the specs.
 */
export function windowShellDataAttributes(variant: WindowShellVariant, chrome: WindowShellChrome = "window") {
  return {
    "data-window-shell-variant": variant,
    "data-window-shell-chrome": chrome,
  } as const;
}
