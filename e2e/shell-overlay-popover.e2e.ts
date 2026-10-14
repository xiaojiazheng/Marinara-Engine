// ──────────────────────────────────────────────
// Desktop shell overlay popover contract (Windows 11 style centered modal layer).
//
// The chat list and the settings panel are no longer docked columns: on desktop they render as a
// centered modal layer that sits *below* the top bar (`ShellOverlayPopover.tsx`), the chat area keeps
// its full width, and only one of the two layers can be open at a time. This file pins that contract
// so the geometry, the Escape ownership rules and the top-bar reachability cannot silently regress.
//
// Read this before changing `packages/client/src/components/layout/ShellOverlayPopover.tsx` or the
// desktop branches of `AppShell.tsx` / `TopBar.tsx`.
// ──────────────────────────────────────────────
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

/**
 * Canonical English catalog. The settings search index stores English literals in
 * `SETTINGS_SEARCHABLE_CONTROLS` and resolves them back to keys by exact match
 * (`use-localized-ui-text.ts` → `findEnglishMessageKey`). A literal that drifts from this catalog
 * stops being translated and shows the stale English string, with no other symptom.
 */
const EN_CATALOG = JSON.parse(
  readFileSync(new URL("../packages/client/src/localization/locales/en.json", import.meta.url), "utf8"),
) as Record<string, string>;

const CHATS = "ChatSidebarPanel";
const CHATS_PANE = "ChatSidebar";
const SETTINGS = "RightPanelDesktop";
const SETTINGS_PANE = "RightPanel";

/**
 * Shared width ceiling: `AppShell` clamps the one slider value to the overlap of the two pane ranges
 * (`SHARED_PANE_WIDTH_MAX` in `ui.store.ts`), so neither pane's own maximum is reachable on its own.
 */
const SHARED_WIDTH_MAX = 760;
/** Shared width floor, for the same reason: the desktop pane is a Windows 11 window, never a strip. */
const SHARED_WIDTH_MIN = 520;
/** Window width inside the shared range, used to prove a stored width is still honored verbatim. */
const STORED_WIDTH = 600;

type UiStoreModule = {
  useUIStore: {
    getState: () => {
      openRightPanel: (panel: string) => void;
      setSidebarOpen: (open: boolean) => void;
      openCharacterLibrary: () => void;
      closeCharacterLibrary: () => void;
    };
  };
};

const popover = (page: Page, child: string): Locator =>
  page.locator(`[data-component="ShellOverlayPopover"]:has([data-component="${child}"])`);
const surface = (page: Page, child: string): Locator => popover(page, child).locator('[role="dialog"]');
const backdrop = (page: Page, child: string): Locator =>
  popover(page, child).locator('[data-backdrop-dismiss-surface="true"]');
const topbar = (page: Page) => page.locator('[data-component="TopBar"]');
const chatsToggle = (page: Page) => page.locator('[data-tour="sidebar-toggle"]');
const settingsToggle = (page: Page) => page.locator('[data-tour="panel-settings"]');
const center = (page: Page) => page.locator('[data-component="CenterContent"]');
const appShell = (page: Page) => page.locator('[data-component="AppShell"]');
const pane = (page: Page, which: "chats" | "settings") =>
  page.locator(which === "chats" ? `[data-component="${CHATS_PANE}"]` : `[data-component="${SETTINGS_PANE}"]`);
const settingsSearch = (page: Page) => page.getByPlaceholder("Search settings");

// Note on the hidden assertions below: `toBeHidden()` is vacuously true when the locator matches
// nothing — Playwright's `elementState` reports `{ matches: true }` for a missing or disconnected
// element in the `"hidden"` state. A selector or mount-condition drift would therefore turn every such
// assertion into a silent always-pass; this already happened once in `chat-widget-style.e2e.ts`. Each
// hidden assertion is paired with a `toHaveCount(1)` on the same locator, which proves the layer is
// really mounted before it is asserted closed. A layer that is genuinely expected to be absent keeps its
// explicit `toHaveCount(0)` instead.

/**
 * Wait until a box stops changing before measuring it. The layer's reveal transition starts at
 * `y: 8` / `scale: 0.98`, so a box sampled mid-flight is offset and would make geometry assertions
 * flaky. Waiting for `getAnimations().finished` is not an option: a loading spinner in the pane is an
 * infinite animation, so that promise never settles.
 */
async function waitForStableBox(locator: Locator) {
  await expect
    .poll(async () => {
      const first = JSON.stringify(await locator.boundingBox());
      await locator.page().waitForTimeout(120);
      return first === JSON.stringify(await locator.boundingBox());
    })
    .toBe(true);
}

async function openPanelFromStore(page: Page, panel: string) {
  await page.evaluate(async (value) => {
    const module = (await import("/src/stores/ui.store.ts" as string)) as UiStoreModule;
    module.useUIStore.getState().openRightPanel(value);
  }, panel);
}

async function setSidebarOpenFromStore(page: Page, open: boolean) {
  await page.evaluate(async (value) => {
    const module = (await import("/src/stores/ui.store.ts" as string)) as UiStoreModule;
    module.useUIStore.getState().setSidebarOpen(value);
  }, open);
}

const readTopbarZIndex = (page: Page) => topbar(page).evaluate((element) => getComputedStyle(element).zIndex);

const readFocused = (page: Page) =>
  page.evaluate(() => ({
    component: document.activeElement?.getAttribute("data-component") ?? null,
    role: document.activeElement?.getAttribute("role") ?? null,
    ariaModal: document.activeElement?.getAttribute("aria-modal") ?? null,
  }));

/** What the hit test at the centre of an element inside `root` actually returns. */
function hitAt(root: Locator, selector: string) {
  return root.evaluate((element, childSelector) => {
    const target = element.querySelector<HTMLElement>(childSelector);
    if (!target) return "missing";
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (hit === target || target.contains(hit)) return "target";
    if (hit?.getAttribute("data-backdrop-dismiss-surface") === "true") return "backdrop";
    return hit?.tagName ?? "none";
  }, selector);
}

async function seed(page: Page, ui: Record<string, unknown> = {}) {
  await seedUIState(
    page,
    {
      hasCompletedOnboarding: true,
      sidebarOpen: false,
      rightPanelOpen: false,
      chatHelpSeenModes: ["conversation", "roleplay", "game"],
      professorMariNavigationEnabled: false,
      ...ui,
    },
    "replace",
  );
}

test.use({ actionTimeout: 10_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/app-settings/ui", (route) =>
    route.fulfill({ json: route.request().method() === "GET" ? { value: null } : { success: true } }),
  );
  await page.addInitScript((appVersion) => {
    localStorage.setItem("marinara:whats-new:seen-version", appVersion);
  }, APP_VERSION);
});

function desktopOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name.includes("mobile"), "The centered popover layer is desktop-only.");
}

test.describe("desktop shell popover geometry", () => {
  test("the layer sits under the top bar, the top bar stays clickable and one click switches panels", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    // A short window is the worst case for the layer's own height budget: it is the case where a
    // surface taller than the space under the top bar would reach back over the top bar.
    await page.setViewportSize({ width: 1280, height: 560 });
    await seed(page);
    await page.goto("/");
    await expect(topbar(page)).toBeVisible();

    const closedTopbarZ = await readTopbarZIndex(page);

    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");

    // The top bar is not raised, dimmed or covered: nothing about its stacking may change.
    expect(await readTopbarZIndex(page)).toBe(closedTopbarZ);

    // The hit test at the settings trigger must reach the button, not the backdrop. This is the
    // contract that lets one click switch panels instead of dismissing and requiring a second click.
    expect(await hitAt(topbar(page), '[data-tour="panel-settings"]')).toBe("target");

    // The backdrop and the surface both start at or below the top bar's bottom edge, and the surface
    // never spills past the bottom of the viewport (the overflow used to be symmetric: 8px over the
    // top bar plus 8px off-screen, so both bounds have to be checked).
    const topbarBox = (await topbar(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    await expect
      .poll(async () => {
        const [backdropBox, surfaceBox] = await Promise.all([
          backdrop(page, CHATS).boundingBox(),
          surface(page, CHATS).boundingBox(),
        ]);
        return {
          backdropBelowTopbar: backdropBox!.y >= topbarBox.y + topbarBox.height - 1,
          surfaceBelowTopbar: surfaceBox!.y >= topbarBox.y + topbarBox.height - 1,
          surfaceInsideViewport: surfaceBox!.y + surfaceBox!.height <= viewport.height + 1,
        };
      })
      .toEqual({ backdropBelowTopbar: true, surfaceBelowTopbar: true, surfaceInsideViewport: true });

    // One click on the other trigger switches layers: the settings layer opens, the chat list closes.
    await settingsToggle(page).click();
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, CHATS)).toHaveCount(1);
    await expect(popover(page, CHATS)).toBeHidden();
  });

  test("the surface is centered in the area under the top bar and takes the persisted width", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, { sidebarWidth: STORED_WIDTH, rightPanelWidth: STORED_WIDTH });
    await page.goto("/");

    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, CHATS));

    const topbarBox = (await topbar(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    // Centered in the region under the top bar, not in the raw viewport — the top bar is not part of
    // the layer's area. The `p-4` gutter is symmetric, so the region centre is also the content-box
    // centre and needs no correction term.
    const regionCentreY = (topbarBox.y + topbarBox.height + viewport.height) / 2;
    await expect
      .poll(async () => {
        const box = (await surface(page, CHATS).boundingBox())!;
        return Math.abs(box.x + box.width / 2 - viewport.width / 2);
      })
      .toBeLessThanOrEqual(1);
    await expect
      .poll(async () => {
        const box = (await surface(page, CHATS).boundingBox())!;
        return Math.abs(box.y + box.height / 2 - regionCentreY);
      })
      .toBeLessThanOrEqual(1);
    expect(Math.abs((await surface(page, CHATS).boundingBox())!.width - STORED_WIDTH)).toBeLessThanOrEqual(1);

    // Both layers take that one persisted value, so the settings pane is the same width.
    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, SETTINGS));
    expect(Math.abs((await surface(page, SETTINGS).boundingBox())!.width - STORED_WIDTH)).toBeLessThanOrEqual(1);
  });

  test("a persisted width outside the shared range is clamped for both layers", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, { sidebarWidth: SHARED_WIDTH_MAX + 200, rightPanelWidth: SHARED_WIDTH_MAX + 200 });
    await page.goto("/");

    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, CHATS));
    await expect
      .poll(async () => Math.abs((await surface(page, CHATS).boundingBox())!.width - SHARED_WIDTH_MAX))
      .toBeLessThanOrEqual(1);

    await setSidebarOpenFromStore(page, false);
    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, SETTINGS));
    await expect
      .poll(async () => Math.abs((await surface(page, SETTINGS).boundingBox())!.width - SHARED_WIDTH_MAX))
      .toBeLessThanOrEqual(1);
  });

  // The panes are Windows 11 style windows, so a width stored under the old docked-column range
  // (240-320) must not keep them looking like a strip: the floor is part of the geometry contract.
  test("a persisted width below the window floor is raised for both layers", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page, { sidebarWidth: 320, rightPanelWidth: 320 });
    await page.goto("/");

    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, CHATS));
    await expect
      .poll(async () => Math.abs((await surface(page, CHATS).boundingBox())!.width - SHARED_WIDTH_MIN))
      .toBeLessThanOrEqual(1);

    await setSidebarOpenFromStore(page, false);
    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await waitForStableBox(surface(page, SETTINGS));
    await expect
      .poll(async () => Math.abs((await surface(page, SETTINGS).boundingBox())!.width - SHARED_WIDTH_MIN))
      .toBeLessThanOrEqual(1);
  });

  test("the chat area keeps the shell width and is never squeezed compact by a layer", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");
    await expect(center(page)).toBeVisible();

    const readWidths = async () => {
      const [centre, shell] = await Promise.all([center(page).boundingBox(), appShell(page).boundingBox()]);
      return {
        centre: centre!.width,
        shell: shell!.width,
        compact: await center(page).getAttribute("data-center-compact"),
      };
    };
    const before = await readWidths();
    expect(Math.abs(before.centre - before.shell)).toBeLessThanOrEqual(1);

    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    const opened = await readWidths();
    expect(opened.centre).toBe(before.centre);
    // The old docked layout squeezed the chat area and flipped this marker; a modal layer must not.
    expect(opened.compact).toBe(before.compact);
    expect(opened.compact).not.toBe("true");
  });
});

test.describe("desktop shell popover interaction", () => {
  test("the backdrop is present, a press on it closes the layer and gives the chat back", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await expect(backdrop(page, SETTINGS)).toBeVisible();
    // Chromium serializes `bg-black/50` as `oklab(0 0 0 / 0.5)`; accept either serialization of 50% black.
    await expect
      .poll(async () => backdrop(page, SETTINGS).evaluate((element) => getComputedStyle(element).backgroundColor))
      .toMatch(/^(rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))$/);

    // Press in the gutter, relative to the backdrop itself: its center is covered by the surface, and
    // `page.mouse.click(8, 8)` would land on the top bar now that the layer starts below it.
    await backdrop(page, SETTINGS).click({ position: { x: 8, y: 8 } });
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, SETTINGS)).toHaveCount(1);
    await expect(popover(page, SETTINGS)).toBeHidden();

    // The chat is interactive again, not merely uncovered: a hit test inside the chat area must
    // reach the chat, and no part of the closed layer may still be in the way.
    const hit = await page.evaluate(() => {
      const area = document.querySelector('[data-component="CenterContent"]')!.getBoundingClientRect();
      const node = document.elementFromPoint(area.left + area.width / 2, area.bottom - 60);
      return {
        insideChatArea: Boolean(node?.closest('[data-component="CenterContent"]')),
        insideLayer: Boolean(node?.closest('[data-component="ShellOverlayPopover"]')),
      };
    });
    expect(hit).toEqual({ insideChatArea: true, insideLayer: false });
  });

  test("Escape closes the layer, returns focus to its trigger, and the first open focuses the pane", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");
    await expect(topbar(page)).toBeVisible();

    // First open, with the settings chunk still cold: the lazy pane suspends, so this is the commit
    // where the focus-trap fallback used to grab the surface instead of letting the pane take over.
    // Do not pre-warm the chunk, or this guard silently stops covering the race.
    await settingsToggle(page).click();
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await expect.poll(async () => (await readFocused(page)).component).toBe(SETTINGS_PANE);
    // The dialog surface itself must never end up holding focus.
    expect((await readFocused(page)).ariaModal).toBeNull();

    await page.keyboard.press("Escape");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, SETTINGS)).toHaveCount(1);
    await expect(popover(page, SETTINGS)).toBeHidden();
    await expect(settingsToggle(page)).toBeFocused();

    // Same contract for the chat list pane.
    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    await expect.poll(async () => (await readFocused(page)).component).toBe(CHATS_PANE);
    await page.keyboard.press("Escape");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, CHATS)).toHaveCount(1);
    await expect(popover(page, CHATS)).toBeHidden();
    await expect(chatsToggle(page)).toBeFocused();
  });

  test("an Escape typed into the settings search still closes the layer, and the query survives", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    await settingsToggle(page).click();
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    await settingsSearch(page).fill("width");
    await expect(page.getByRole("button", { name: /Desktop panel width/ })).toBeVisible();

    // The settings search box has no Escape handling of its own, so nothing may claim this press:
    // one Escape closes the layer (the pane stays mounted, so the query stays in its state).
    await page.keyboard.press("Escape");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, SETTINGS)).toHaveCount(1);
    await expect(popover(page, SETTINGS)).toBeHidden();

    await settingsToggle(page).click();
    await expect(settingsSearch(page)).toHaveValue("width");
  });

  test("only one layer is open at a time, in both directions", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    await chatsToggle(page).click();
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, CHATS)).toHaveCount(1);
    await expect(popover(page, CHATS)).toBeHidden();

    await setSidebarOpenFromStore(page, true);
    await expect(popover(page, CHATS)).toHaveAttribute("aria-hidden", "false");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, SETTINGS)).toHaveCount(1);
    await expect(popover(page, SETTINGS)).toBeHidden();
    // A closed layer stays mounted but must not be reachable.
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "true");
  });

  test("a confirm opened over the layer takes the first Escape on its own", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    await settingsToggle(page).click();
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");

    // App dialogs render through `Modal` (role="dialog", z 10000) and register in the same overlay
    // stack, so this is the real composition, not a stand-in.
    await page.evaluate(async () => {
      const module = (await import("/src/lib/app-dialogs.ts" as string)) as {
        showConfirmDialog: (options: { title: string; message: string }) => Promise<boolean>;
      };
      void module.showConfirmDialog({ title: "Popover contract", message: "Dismiss me first." });
    });
    await expect(page.locator('[data-component="Modal"][role="dialog"]')).toHaveCount(1);
    await expect(page.getByText("Dismiss me first.")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-component="Modal"][role="dialog"]')).toHaveCount(0);
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");

    // The next press belongs to the layer again.
    await page.keyboard.press("Escape");
    // Guard the vacuous case: `toBeHidden()` passes on an empty locator, so prove it is mounted first.
    await expect(popover(page, SETTINGS)).toHaveCount(1);
    await expect(popover(page, SETTINGS)).toBeHidden();
  });

  test("opening a layer does not scroll the page", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    const readScroll = () =>
      page.evaluate(() => ({
        x: window.scrollX,
        y: window.scrollY,
        pageScrollable: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      }));
    const before = await readScroll();
    expect(before.pageScrollable).toBeLessThanOrEqual(0);
    expect(before.y).toBe(0);

    await openPanelFromStore(page, "settings");
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    expect(await readScroll()).toEqual(before);

    await page.keyboard.press("PageDown");
    expect(await readScroll()).toEqual(before);
  });

  test("the settings search index stays in step with the canonical English catalog", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    await settingsToggle(page).click();
    await expect(popover(page, SETTINGS)).toHaveAttribute("aria-hidden", "false");
    // Search by alias so the row is found whatever the label says, then read the rendered copy back.
    await settingsSearch(page).fill("sidebar");
    const row = page.getByRole("button", { name: /Desktop panel width/ });
    await expect(row).toBeVisible();
    // Guards the existing reverse-lookup mechanism (`findEnglishMessageKey`), not this change: a
    // literal in `SETTINGS_SEARCHABLE_CONTROLS` that drifts from the catalog falls back to the raw
    // literal and would show stale English here. A failure here is not necessarily a popover defect.
    await expect(row).toContainText(EN_CATALOG["settings.appearance.sidebarWidth"]!);
    await expect(row).toContainText(EN_CATALOG["settings.appearance.sidebarWidthHelp"]!);
  });
});

test.describe("mobile shell stays on the drawer", () => {
  test("no desktop popover layer exists and the drawer still carries the chat list", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "The drawer shell only exists on touch/phone projects.");
    await seed(page);
    await page.goto("/");

    await expect(page.locator('[data-component="ShellOverlayPopover"]')).toHaveCount(0);

    await chatsToggle(page).tap();
    await expect(page.locator(`[data-component="${CHATS}"]`)).toBeVisible();
    await expect(page.locator(`[data-component="${SETTINGS}"]`)).toHaveCount(0);
  });
});

/**
 * The centre-area surfaces (every editor, the card library, the agent catalog and the two browsers)
 * are Windows 11 windows on desktop: they float on a dimmed backdrop under the top bar instead of
 * replacing the page, so the shell behind them and the top bar both stay where they are. Mobile keeps
 * its own full-screen sheet. The gutter below is the shell's `maximized` variant (`m-2`).
 */
const WINDOW_GUTTER = 8;

async function openCardLibrary(page: Page) {
  await page.evaluate(async () => {
    const module = (await import("/src/stores/ui.store.ts" as string)) as UiStoreModule;
    module.useUIStore.getState().openCharacterLibrary();
  });
}

test.describe("desktop centre-area surfaces", () => {
  test("a surface opens as a window on a backdrop, not as a page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "The window presentation is desktop-only.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");

    const centerArea = center(page);
    const surfaceWindow = page.locator('[data-component="DetailEditor"]');
    // The shell's backdrop is shared with the two `ShellOverlayPopover` layers, which are mounted while
    // closed; this one is the centre area's, so scope the locator to the area it dims.
    const windowBackdrop = centerArea.locator('[data-component="ShellWindowBackdrop"]');
    await expect(surfaceWindow).toHaveCount(0);
    await expect(windowBackdrop).toHaveCount(0);

    await openCardLibrary(page);
    await expect(surfaceWindow).toBeVisible();
    await waitForStableBox(surfaceWindow);

    const [centerBox, topbarBox, windowBox, backdropBox] = [
      (await centerArea.boundingBox())!,
      (await topbar(page).boundingBox())!,
      (await surfaceWindow.boundingBox())!,
      (await windowBackdrop.boundingBox())!,
    ];
    const areaTop = topbarBox.y + topbarBox.height;
    // The window is the centre area inset by the gutter on every side: it is a window, not the page.
    expect(Math.abs(windowBox.x - (centerBox.x + WINDOW_GUTTER))).toBeLessThanOrEqual(1);
    expect(
      Math.abs(windowBox.x + windowBox.width - (centerBox.x + centerBox.width - WINDOW_GUTTER)),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(windowBox.y - (areaTop + WINDOW_GUTTER))).toBeLessThanOrEqual(1);
    expect(
      Math.abs(windowBox.y + windowBox.height - (centerBox.y + centerBox.height - WINDOW_GUTTER)),
    ).toBeLessThanOrEqual(1);
    // The backdrop covers exactly the area the window floats on, and the window is what a press inside
    // it reaches; a press in the gutter reaches the backdrop instead, so the page behind stays inert.
    expect(Math.abs(backdropBox.y - areaTop)).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() => {
        const rect = document.querySelector('[data-component="DetailEditor"]')!.getBoundingClientRect();
        const node = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return Boolean(node?.closest('[data-component="DetailEditor"]'));
      }),
    ).toBe(true);
    expect(
      await page.evaluate(() => {
        const rect = document.querySelector('[data-component="CenterContent"]')!.getBoundingClientRect();
        return document
          .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height - 2)
          ?.getAttribute("data-component");
      }),
    ).toBe("ShellWindowBackdrop");
    // The top bar is never part of the window area, so it keeps working while a window is up.
    await expect(chatsToggle(page)).toBeVisible();

    // The window carries the shared Windows 11 title bar: the title, and the close control that closes it.
    const titleBar = page.locator('[data-component="WindowTitleBar"]');
    await expect(titleBar).toBeVisible();
    // The window owns the title, so the content no longer repeats it: exactly one such heading.
    await expect(titleBar.getByRole("heading", { name: "Browse your characters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browse your characters" })).toHaveCount(1);

    await titleBar.getByRole("button", { name: "Close library" }).click();
    await expect(surfaceWindow).toHaveCount(0);
    await expect(windowBackdrop).toHaveCount(0);
  });

  test("the sheet stays full-screen on mobile, with no window backdrop", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "The sheet presentation is mobile-only.");
    await seed(page);
    await page.goto("/");

    await openCardLibrary(page);
    await expect(page.locator('[data-component="MobileDetailSheet"]')).toBeVisible();
    await expect(center(page).locator('[data-component="ShellWindowBackdrop"]')).toHaveCount(0);
  });
});
