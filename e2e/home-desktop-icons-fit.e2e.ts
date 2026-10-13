import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";

const ICON_SELECTOR = "[data-home-desktop-icon]";
const LAYOUT_STORAGE_KEY = "marinara:home:desktop-icons:v1";
const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/app-settings/ui", (route) =>
    route.fulfill({ json: route.request().method() === "GET" ? { value: null } : { success: true } }),
  );
  // Suppress the one-time release announcement so its modal does not intercept icon clicks.
  await page.addInitScript((version) => localStorage.setItem("marinara:whats-new:seen-version", version), APP_VERSION);
  await seedUIState(page, {
    hasCompletedOnboarding: true,
    sidebarOpen: false,
    rightPanelOpen: false,
    professorMariNavigationEnabled: false,
  });
});

/** Reads the persisted desk layout so a test can prove an arrangement survived a reload. */
async function readStoredLayout(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw
      ? (JSON.parse(raw) as { size?: string; positions?: Record<string, { col: number; row: number }> })
      : null;
  }, LAYOUT_STORAGE_KEY);
}

async function deskFit(page: Page) {
  return page.evaluate((selector) => {
    const surface = document.querySelector<HTMLElement>('[data-component="HomeDesktopIcons"]')!;
    const icons = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const surfaceBox = surface.getBoundingClientRect();
    const overflow = (child: DOMRect, parent: DOMRect, inset: number) =>
      child.left >= parent.left + inset - 0.5 &&
      child.right <= parent.right - inset + 0.5 &&
      child.top >= parent.top + inset - 0.5;
    return {
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      surfaceScrollsSideways: surface.scrollWidth > surface.clientWidth + 1,
      icons: icons.length,
      iconsInsideSurface: icons.every((icon) => overflow(icon.getBoundingClientRect(), surfaceBox, 0)),
      labelsContained: icons.every((icon) => {
        const label = icon.querySelector<HTMLElement>("button > span:last-child");
        if (!label) return false;
        const box = icon.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        return (
          labelBox.left >= box.left - 0.5 &&
          labelBox.right <= box.right + 0.5 &&
          label.scrollWidth <= label.clientWidth + 1
        );
      }),
      // Cells are explicitly placed, so no two icons may share a column and row pair.
      uniqueCells: new Set(icons.map((icon) => `${icon.style.gridColumnStart}:${icon.style.gridRowStart}`)).size,
    };
  }, ICON_SELECTOR);
}

test("Home desk icons fit from 320 to 1920 without sideways scrolling", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name.includes("mobile");
  await page.goto("/");
  await expect(page.locator(ICON_SELECTOR).first()).toBeVisible({ timeout: 30_000 });

  for (const width of mobile ? [320, 390] : [1920, 1440, 1100, 900, 320]) {
    await page.setViewportSize({ width, height: mobile ? 844 : 900 });
    await expect
      .poll(() => deskFit(page), { message: `Home desk icons at ${width}px` })
      .toMatchObject({
        horizontalScroll: false,
        surfaceScrollsSideways: false,
        labelsContained: true,
        iconsInsideSurface: true,
      });
    const fit = await deskFit(page);
    expect(fit.uniqueCells, `every icon keeps its own cell at ${width}px`).toBe(fit.icons);
    await page.screenshot({ path: testInfo.outputPath(`desk-${width}.png`) });
  }
});

test("Home desk icons: a single click selects and hover highlights, in both motion modes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const icon = page.locator('[data-home-desktop-icon="community"]');
  await expect(icon).toBeVisible({ timeout: 30_000 });

  const background = () => icon.evaluate((element) => getComputedStyle(element).backgroundColor);
  const resting = await background();

  if (!testInfo.project.name.includes("mobile")) {
    // Hover feedback on the bare desk: the cell highlights while hovered, and the desk shows through
    // again once the pointer leaves. Asserted before the click so the selected plate cannot mask it.
    await icon.hover();
    await expect.poll(background).not.toBe(resting);
    await page.mouse.move(2, 2);
    await expect.poll(background).toBe(resting);
  }

  await icon.locator("button").click();
  await expect(icon).toHaveAttribute("data-home-desktop-icon-selected", "true");

  // Turning ambient motion off must not drop the selection feedback, only its transition.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(icon).toHaveAttribute("data-home-desktop-icon-selected", "true");
  expect(await icon.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
});

test("Home desk icons: double-clicking opens the icon's window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Window geometry is a desktop contract.");
  await page.goto("/");
  const clock = page.locator('[data-home-desktop-icon="clock"]');
  await expect(clock).toBeVisible({ timeout: 30_000 });

  await clock.locator("button").click();
  await expect(page.locator('[data-component="HomeDesktopIconModals.Clock"]')).toHaveCount(0);

  await clock.locator("button").dblclick();
  const window = page.locator('[data-component="HomeDesktopIconModals.Clock"]');
  await expect(window).toBeVisible();
  await expect(window.locator("[data-clock-time]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(window).toBeHidden();
});

test("Home desk icons: right-click offers View, Sort by, Refresh and Personalize", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop context menus are a pointer-only contract.");
  await page.goto("/");
  const surface = page.locator('[data-component="HomeDesktopIcons"]');
  await expect(surface).toBeVisible({ timeout: 30_000 });
  const menu = page.locator('[data-component="HomeDesktopContextMenu"]');
  // The four-entry menu belongs to blank desk space. The icon columns hug the left edge, so the far
  // right of the field is empty at every desktop width.
  const blankDeskPoint = async () => {
    const box = (await surface.boundingBox())!;
    return { x: box.width - 24, y: 16 };
  };

  await surface.click({ button: "right", position: await blankDeskPoint() });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitemradio", { name: "Large icons" })).toBeVisible();
  await expect(menu.getByRole("menuitemradio", { name: "Medium icons" })).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("menuitemradio", { name: "Small icons" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Sort by: Name" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Personalize" })).toBeVisible();

  await menu.getByRole("menuitemradio", { name: "Small icons" }).click();
  await expect(menu).toBeHidden();
  await expect.poll(async () => (await readStoredLayout(page))?.size).toBe("small");

  await surface.click({ button: "right", position: await blankDeskPoint() });
  await expect(menu.getByRole("menuitemradio", { name: "Small icons" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  // An icon's own menu is the short Open / Refresh pair: the desk menu must not stay behind it.
  await surface.locator('[data-home-desktop-icon="clock"]').click({ button: "right" });
  await expect(menu.getByRole("menuitem", { name: "Open" })).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveCount(2);
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);

  // Refresh keeps the arrangement the user dragged; it must not reset the saved cells.
  const before = await readStoredLayout(page);
  await menu.getByRole("menuitem", { name: "Refresh" }).click();
  expect((await readStoredLayout(page))?.positions).toEqual(before?.positions);
});

test("Home desk icons: a dragged arrangement survives a reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Pointer dragging is a desktop contract.");
  await page.goto("/");
  const clock = page.locator('[data-home-desktop-icon="clock"]');
  const community = page.locator('[data-home-desktop-icon="community"]');
  await expect(clock).toBeVisible({ timeout: 30_000 });

  const before = await readStoredLayout(page);
  const from = (await clock.boundingBox())!;
  const to = (await community.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 });
  await page.mouse.up();

  await expect.poll(async () => (await readStoredLayout(page))?.positions?.clock).not.toEqual(before?.positions?.clock);
  const dragged = await readStoredLayout(page);
  const communityPosition = dragged?.positions?.community;
  expect(communityPosition, "the drop target keeps a cell").toBeTruthy();
  expect(dragged?.positions?.clock?.col).toBeLessThanOrEqual(communityPosition!.col + 2);

  await page.reload();
  await expect(clock).toBeVisible();
  const restored = await readStoredLayout(page);
  expect(restored?.positions?.clock).toEqual(dragged?.positions?.clock);
  expect(restored?.positions?.community).toEqual(dragged?.positions?.community);
});
