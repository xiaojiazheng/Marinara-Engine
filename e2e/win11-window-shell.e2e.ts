// The Windows 11 window every `<WindowShell>` draws: one acrylic frame, one title bar and only the keys
// a window really has. A modal has no second state, so no minimize or maximize key exists — not even an
// inert one. A phone-width window renders its close key alone, on a square full-screen surface.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version as string;
const WINDOWS_CLOSE_HOVER = "oklch(0.55 0.19 27)";

/** The window surface, inside the modal layer that names the window. */
const WINDOW_SHELL = '[data-component="Modal"] [data-component="WindowShell"]';
const MISSING_STATE_KEYS = '[data-window-control="minimize"], [data-window-control="maximize"]';

test.use({ actionTimeout: 10_000 });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/app-settings/ui", (route) =>
    route.fulfill({ json: route.request().method() === "GET" ? { value: null } : { success: true } }),
  );
  await page.addInitScript((appVersion) => {
    localStorage.setItem("marinara:whats-new:seen-version", appVersion);
  }, version);
  await seedUIState(
    page,
    {
      hasCompletedOnboarding: true,
      sidebarOpen: false,
      rightPanelOpen: false,
      chatHelpSeenModes: ["conversation", "roleplay", "game"],
      professorMariNavigationEnabled: false,
    },
    "if-missing",
  );
});

/**
 * The desktop's Clock icon opens a window-chrome Modal — the same shell as any window. It is the one
 * desk window that never depends on a setting, so this spec runs in every shell state.
 */
async function openWindow(page: Page): Promise<Locator> {
  await page.goto("/");
  const icon = page.locator('[data-home-desktop-icon="clock"]');
  await expect(icon).toBeVisible({ timeout: 30_000 });
  await icon.locator("button").dblclick();
  const window = page.locator(WINDOW_SHELL).last();
  await expect(window.locator("[data-clock-time]")).toBeVisible({ timeout: 30_000 });
  return window;
}

/** Resolve a CSS color through the browser, so okLCH serialization stays out of the assertion. */
async function resolveCssColor(page: Page, property: string, value: string) {
  return page.evaluate(
    ({ property, value }) => {
      const probe = document.createElement("span");
      probe.style.setProperty(property, value);
      document.body.append(probe);
      const resolved = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return resolved;
    },
    { property, value },
  );
}

test("a window is the shared shell: one acrylic frame, the shared bar, and only the close key", async ({ page }) => {
  const window = await openWindow(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(window).toHaveAttribute("data-window-shell-chrome", "window");
  await expect(window).toHaveAttribute("data-window-shell-variant", "fixed");
  // The window is the canonical `.mari-window`, so the whole class family and its tokens apply to it.
  await expect(window).toHaveClass(/\bmari-window\b/u);

  // A modal has no second state, so it renders no minimize or maximize key at all.
  await expect(window.locator(MISSING_STATE_KEYS)).toHaveCount(0);
  const keys = await window
    .locator("[data-window-control]")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-window-control")));
  expect(keys).toEqual(["close"]);
  const close = window.locator('[data-window-control="close"]');
  await expect(close).not.toHaveAttribute("aria-disabled", "true");
  // The bar is the shared one, and the content no longer repeats the heading.
  await expect(window.locator('[data-component="WindowTitleBar"]')).toBeVisible();

  // The shell paints the taskbar's acrylic and the --marinara-win11-radius corner, not a chat panel's
  // colour or the shared --radius-lg scale.
  const surface = await window.evaluate((element) => {
    const resolve = (property: string, value: string) => {
      const probe = document.createElement("span");
      probe.style.setProperty(property, value);
      element.append(probe);
      const computed = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return computed;
    };
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      acrylic: resolve("background-color", "var(--marinara-home-acrylic-surface)"),
      border: style.borderColor,
      acrylicBorder: resolve("border-color", "var(--marinara-home-acrylic-border)"),
      radius: style.borderRadius,
      windowRadius: resolve("border-radius", "var(--marinara-win11-radius)"),
    };
  });
  const taskbar = await page
    .locator(".mari-win11-taskbar")
    .first()
    .evaluate((element) => {
      const probe = document.createElement("span");
      probe.style.setProperty("background-color", "var(--marinara-home-acrylic-surface)");
      element.append(probe);
      const acrylic = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { background: getComputedStyle(element).backgroundColor, acrylic };
    });
  // iOS WebKit deliberately drops the blur and backs the panel opaquely (see globals.css); everywhere
  // else the window paints the taskbar's acrylic.
  const iosBacking = await window.evaluate((element) => {
    if (!document.documentElement.hasAttribute("data-mari-ios-webkit")) return null;
    const probe = document.createElement("span");
    probe.style.setProperty("background-color", "var(--mari-modal-opaque-bg)");
    element.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  if (iosBacking) {
    expect(surface.background).toBe(iosBacking);
    await expect(window).toHaveCSS("backdrop-filter", "none");
  } else {
    expect(surface.background).toBe(surface.acrylic);
    // The phone shell repaints the taskbar opaque on touch hardware; where it keeps the acrylic, the
    // window and the taskbar are the same surface.
    if (taskbar.background === taskbar.acrylic) expect(surface.background).toBe(taskbar.background);
  }
  expect(surface.border).toBe(surface.acrylicBorder);
  expect(surface.radius).toBe(surface.windowRadius);

  // Windows 11 paints the close key red, where a mouse drives the hover.
  const mouseHover = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (mouseHover) {
    await close.hover();
    await expect(close).toHaveCSS(
      "background-color",
      await resolveCssColor(page, "background-color", WINDOWS_CLOSE_HOVER),
    );
    await expect(close).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(1, 1);
  }
});

test("a phone-width window renders the close key alone", async ({ page }) => {
  const window = await openWindow(page);
  await page.setViewportSize({ width: 320, height: 844 });

  // The same shell, in its sheet variant: the frame it draws is the same one, filling the viewport.
  await expect(window).toHaveAttribute("data-window-shell-variant", "sheet");
  const close = window.locator('[data-window-control="close"]');
  await expect(close).toHaveCount(1);
  await expect(close).toBeVisible();
  // The phone bar holds one key, so the keys this window never had are not rendered at all.
  await expect(window.locator(MISSING_STATE_KEYS)).toHaveCount(0);
  // A full-screen phone window stays square: the radius lives in the shell's utilities, where
  // `max-sm:rounded-none` can still win over the acrylic frame.
  await expect(window).toHaveCSS("border-radius", "0px");
});
