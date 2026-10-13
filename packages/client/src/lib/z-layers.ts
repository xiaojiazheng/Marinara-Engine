// ──────────────────────────────────────────────
// The z-index table for floating surfaces.
//
// Every overlay picks a tier here instead of inventing another one-off number, so
// "what sits above what" is one readable list. The bands are ordered low → high:
// in-chat surfaces (≤ 50) < floating windows (70) < in-chat overlay panels (130) <
// menus / pickers (9000) < drag ghost (9500) < card popouts (9990) < the onboarding
// guide (9999) < the modal band (10000+), whose 10-point steps leave room to slot a
// new dialog in without renumbering its neighbours, and finally the personal-extension
// surfaces, which must outrank every app layer.
//
// Values are used as inline `zIndex` (Tailwind arbitrary classes can't read a
// runtime import), so a surface keeps its tier even when its className is
// composed or replaced by a theme.
// ──────────────────────────────────────────────

/** Phone bubbles: above the chat, below the phone overlays that cover it. */
export const Z_PHONE_BUBBLE = 44;

/** Floating windows and their stack: above the chat HUD, below menus and modals. */
export const Z_FLOATING_WINDOW = 70;

/** In-chat overlay panels (settings sheets, encounters): above floating windows, below menus. */
export const Z_PANEL_OVERLAY = 130;

/** Menus, pickers and chat action popovers: above in-chat overlay panels, below the guide. */
export const Z_MENU = 9000;

/** The drawer's drag ghost: above menus, below the onboarding guide. */
export const Z_DRAG_GHOST = 9500;

/** The About Me / persona card popout (`AboutMeViewerModal`): above menus, below the guide. */
export const Z_CARD_POPOUT = 9990;

/** The onboarding tutorial: the only app layer at 9999. */
export const Z_GUIDE = 9999;

/** `ui/Modal.tsx`: the base of the dialog band. */
export const Z_WINDOW = 10000;

/** Full-screen game overlays (surface, setup wizard, legacy setup): above a modal, below lightboxes. */
export const Z_WINDOW_TOP = 10010;

/** Image and video lightboxes: above game overlays, below the macro editor. */
export const Z_LIGHTBOX = 10020;

/** The full-screen macro editor and macro reference: above lightboxes, below the help overlay. */
export const Z_FULLSCREEN_EDITOR = 10030;

/** The chat help overlay: above the macro editor, below tooltips. */
export const Z_HELP_OVERLAY = 10050;

/** Tooltips: always the topmost app surface. */
export const Z_TOOLTIP = 10070;

/**
 * Personal-extension UI (the TopBar contributions menu, and the sandboxed extension panel the
 * injector mounts). These are pinned just under the 2^31 ceiling — above every app layer — so a
 * third-party contribution surface is never buried by app chrome, whichever dialog, guide or
 * tooltip happens to be open. The panel sits 1000 above the menu so an opened panel covers the
 * menu it was launched from.
 *
 * `PersonalExtensionInjector` sets the panel's value on the iframe's inline style.
 */
export const Z_EXTENSION_MENU = 2147482000;
export const Z_EXTENSION_PANEL = 2147483000;
