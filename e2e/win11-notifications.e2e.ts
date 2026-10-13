// The Windows 11 notification skin over sonner: acrylic cards that slide in at the bottom-right,
// stack at most three deep, stay put while hovered, and keep their action and close keys live.
// These proofs drive the app's own sonner instance — the module every `toast.*` call reaches — and
// then read the shipped contract ([data-sonner-toast], its corner, its keys) instead of private
// React state, so the skin cannot pass by rendering a look-alike.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";
import { prepareViteFixtureDependencies } from "./vite-fixture-dependencies.js";

declare global {
  interface Window {
    /** Set by the action-button fixture so the click can be observed from the test. */
    __win11ToastAction?: boolean;
  }
}

const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version as string;

type PersistedUIState = Parameters<typeof seedUIState>[1];

type ToastSpec = {
  type: "success" | "error" | "warning" | "info";
  message: string;
  /** Milliseconds; null keeps the notification up, as the app's update prompts do. */
  durationMs?: number | null;
};

const BASE_STATE = {
  hasCompletedOnboarding: true,
  sidebarOpen: false,
  rightPanelOpen: false,
  chatHelpSeenModes: ["conversation", "roleplay", "game"],
  professorMariNavigationEnabled: false,
  chibiProfessorMariEnabled: false,
} satisfies PersistedUIState;

test.use({ actionTimeout: 10_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/app-settings/ui", (route) =>
    route.fulfill({ json: route.request().method() === "GET" ? { value: null } : { success: true } }),
  );
  await page.addInitScript((appVersion) => {
    localStorage.setItem("marinara:whats-new:seen-version", appVersion);
  }, version);
});

async function openApp(page: Page, state: PersistedUIState = {}) {
  await seedUIState(page, { ...BASE_STATE, ...state }, "replace");
  await page.goto("/");
  // Sonner mounts its <ol> only once a toast exists, so readiness is the shell's own content.
  await expect(page.locator("[data-home-desktop-icon]").first()).toBeVisible({ timeout: 30_000 });
}

/** Reach the exact sonner module the app bundled, so a stale copy cannot answer for it. */
async function toastApi(page: Page) {
  await prepareViteFixtureDependencies(page, "/src/App.tsx");
}

async function fire(page: Page, spec: ToastSpec) {
  await page.evaluate(async (payload) => {
    const { toast } = await import(window.__viteFixtureDependencyUrl("sonner"));
    toast[payload.type](payload.message, { duration: payload.durationMs === null ? Infinity : payload.durationMs });
  }, spec);
}

test("notifications land in the Windows 11 bottom-right corner", async ({ page }) => {
  await openApp(page);
  await toastApi(page);
  await fire(page, { type: "error", message: "Notification corner fixture", durationMs: null });

  // The skin rides the toaster the app mounted: same element, Win11 corner and class.
  const toaster = page.locator("[data-sonner-toaster].mari-win11-toaster");
  await expect(toaster).toHaveAttribute("data-y-position", "bottom");
  await expect(toaster).toHaveAttribute("data-x-position", "right");

  const card = page.locator("[data-sonner-toast]").filter({ hasText: "Notification corner fixture" });
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-type", "error");
  await expect(card).toHaveAttribute("data-x-position", "right");

  await expect(card).not.toHaveCSS("box-shadow", "none");

  // The skin is a Windows 11 card: the shared Win11 corner token (8px at the default root) over the
  // shell's shadow token. The probe reads the token itself, so the card and the window shell cannot
  // drift apart without failing here.
  // Display Size Scaling writes the root font size while the app boots, so the token and the
  // card are read in the same tick instead of being compared across a possible re-render.
  const radii = await page.evaluate(() => {
    const toast = document.querySelector("[data-sonner-toast]");
    const probe = document.createElement("div");
    probe.style.borderRadius = "var(--marinara-win11-radius)";
    document.body.append(probe);
    const measured = {
      cardRadius: toast ? getComputedStyle(toast).borderTopLeftRadius : null,
      tokenRadius: getComputedStyle(probe).borderTopLeftRadius,
    };
    probe.remove();
    return measured;
  });
  expect(radii.cardRadius).toBe(radii.tokenRadius);
  expect(parseFloat(radii.tokenRadius)).toBeGreaterThanOrEqual(8);

  // Windows 11 keeps a notification above the taskbar; the corner must not tuck under it.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const taskbar = document.querySelector("footer.mari-win11-taskbar");
        const toast = document.querySelector("[data-sonner-toast]");
        if (!taskbar || !toast) return null;
        return Math.round(taskbar.getBoundingClientRect().top - toast.getBoundingClientRect().bottom);
      }),
    )
    .toBeGreaterThanOrEqual(0);

  // "Marinara Engine" is the CSS affordance sonner's classNames API cannot insert as a node.
  await expect
    .poll(() => card.locator("[data-content]").evaluate((node) => getComputedStyle(node, "::before").content))
    .toBe('"Marinara Engine"');
});

test("at most three notifications are visible at once", async ({ page }) => {
  await openApp(page);
  await toastApi(page);
  for (let index = 0; index < 4; index++) {
    await fire(page, { type: "info", message: `Stack fixture ${index}`, durationMs: null });
  }

  await expect(page.locator("[data-sonner-toast]")).toHaveCount(4);
  await expect(page.locator('[data-sonner-toast][data-visible="true"]')).toHaveCount(3);
});

test("a hovered notification does not disappear", async ({ page }) => {
  await openApp(page);
  await toastApi(page);
  await fire(page, { type: "info", message: "Hover fixture", durationMs: 1_500 });

  const card = page.locator("[data-sonner-toast]").filter({ hasText: "Hover fixture" });
  await expect(card).toBeVisible();
  // Hover only once the slide-in has settled, otherwise the countdown resumes under a pointer
  // the card has already moved away from.
  await expect(card).toHaveCSS("opacity", "1");

  const mouseHover = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (!mouseHover) return;

  await card.hover();
  await expect(card).toHaveAttribute("data-expanded", "true");
  // Past its own lifetime: the countdown pauses on hover rather than merely slowing down.
  await page.waitForTimeout(2_500);
  await expect(card).toBeVisible();
});

test("an action button runs and dismisses its notification", async ({ page }) => {
  await openApp(page);
  await toastApi(page);
  await page.evaluate(async () => {
    const { toast } = await import(window.__viteFixtureDependencyUrl("sonner"));
    window.__win11ToastAction = false;
    toast.info("Update available", {
      duration: Infinity,
      action: {
        label: "Restart now",
        onClick: () => {
          window.__win11ToastAction = true;
        },
      },
    });
  });

  const action = page.locator("[data-sonner-toast] .mari-win11-toast__action");
  await expect(action).toHaveText("Restart now");
  await action.click();
  await expect.poll(() => page.evaluate(() => window.__win11ToastAction)).toBe(true);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
});

test("the notification position setting switches corners and returns to the default", async ({ page }) => {
  await openApp(page, { rightPanelOpen: true, rightPanel: "settings", settingsTab: "general" });

  const selector = page.getByRole("combobox", { name: /Notification position/ });
  await page.getByPlaceholder("Search settings").fill("notification position");
  await page
    .locator(".mari-settings-search-header button")
    .filter({ hasText: "Notification position" })
    .first()
    .click();
  await expect(selector).toBeFocused();
  await expect(selector).toHaveValue("bottom-right");

  await toastApi(page);
  await fire(page, { type: "warning", message: "Corner fixture", durationMs: null });
  const toaster = page.locator("[data-sonner-toaster]");
  await expect(toaster).toHaveAttribute("data-y-position", "bottom");
  await expect(toaster).toHaveAttribute("data-x-position", "right");

  await selector.selectOption("top");
  await expect(toaster).toHaveAttribute("data-y-position", "top");

  await selector.selectOption("bottom-right");
  await expect(toaster).toHaveAttribute("data-y-position", "bottom");
  await expect(toaster).toHaveAttribute("data-x-position", "right");
});

test("reduced ambient effects still the notification cards", async ({ page }) => {
  await openApp(page);
  await toastApi(page);
  await fire(page, { type: "success", message: "Still fixture", durationMs: null });

  const card = page.locator("[data-sonner-toast]").filter({ hasText: "Still fixture" });
  await expect(card).toBeVisible();
  await expect(card.locator("[data-close-button]")).toHaveCount(1);

  // The app owns html[data-marinara-reduced-effects] and rewrites it on re-render, so the cascade
  // is read in the same tick as the switch and the attribute is put back before the proof ends.
  // `restored` is what makes the result causal: the durations move only with the attribute.
  const motion = await page.evaluate(() => {
    const root = document.documentElement;
    const previous = root.dataset.marinaraReducedEffects;
    const toast = document.querySelector("[data-sonner-toast]");
    const close = toast?.querySelector("[data-close-button]") ?? null;
    const read = () => ({
      card: toast ? getComputedStyle(toast).transitionDuration : null,
      close: close ? getComputedStyle(close).transitionDuration : null,
    });

    const before = read();
    root.dataset.marinaraReducedEffects = "true";
    const stilled = read();
    if (previous === undefined) delete root.dataset.marinaraReducedEffects;
    else root.dataset.marinaraReducedEffects = previous;
    return { before, restored: read(), stilled };
  });

  expect(motion.stilled).toEqual({ card: "0s", close: "0s" });
  expect(motion.before.card).not.toBe("0s");
  expect(motion.restored).toEqual(motion.before);
});
