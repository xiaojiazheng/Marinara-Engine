import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openChatSettings } from "./chat-settings-tools.js";
import { seedUIState } from "./ui-state-fixture.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;
const UI_SETTINGS_PATH = "/api/app-settings/ui";
const DETACHED_ID = "drawer:chat-settings:chat-name";

/** Decode the browser's actual screenshot, not a canvas recreation of the CSS. */
async function readPixels(page: Page, screenshot: Buffer) {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(0, 0, image.width, image.height).data);
  }, screenshot.toString("base64"));
}

/**
 * A window draws no frame of its own any more: no cut corner, no decorative pseudo-element. What the
 * shell keeps is its shadow and the Windows 11 radius, and the surface is painted by the shell's acrylic
 * or by whatever colour the theme put on it.
 */
async function expectNoWindowFrame(window: Locator, label: string) {
  const measured = await window.evaluate(async (element) => {
    const host = getComputedStyle(element);
    const before = getComputedStyle(element, "::before");
    const after = getComputedStyle(element, "::after");
    const probe = document.createElement("span");
    probe.style.borderRadius = "var(--marinara-win11-radius, 0.5rem)";
    document.body.append(probe);
    const win11Radius = getComputedStyle(probe).borderRadius;
    probe.remove();
    return {
      before: before.content,
      after: after.content,
      beforeClip: before.clipPath,
      afterClip: after.clipPath,
      shadow: host.boxShadow,
      background: host.backgroundColor,
      image: host.backgroundImage,
      radius: host.borderRadius,
      win11Radius,
    };
  });
  expect(measured, `${label}: a window draws no frame of its own`).toMatchObject({
    before: "none",
    after: "none",
    beforeClip: "none",
    afterClip: "none",
    radius: measured.win11Radius,
  });
  expect(measured.shadow, `${label}: the shell's shadow is kept`).not.toBe("none");
  expect(
    measured.background !== "rgba(0, 0, 0, 0)" || measured.image !== "none",
    `${label}: the shell or the theme paints the surface`,
  ).toBe(true);
}

/** The paint that remains must stay inside the rounded corner. */
async function expectClearCorner(page: Page, window: Locator, label: string) {
  await expect(window).toBeVisible();
  // A detached drawer animates in with a transform. Settle it before reading
  // geometry; screenshot's animation freeze otherwise moves the frame after
  // the crop coordinates have already been measured.
  await window.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  // A sharp scene makes an otherwise nearly invisible rectangular backdrop blur
  // measurable. Exclude the legitimate decorative shadow from this paint proof.
  const originalStyle = await window.getAttribute("style");
  await window.evaluate((element) => {
    const root = element as HTMLElement;
    root.style.setProperty("filter", "none", "important");
    const rect = root.getBoundingClientRect();
    const scene = document.createElement("div");
    scene.id = "corner-containment-scene";
    Object.assign(scene.style, {
      position: "fixed",
      pointerEvents: "none",
      left: `${rect.left - 30}px`,
      top: `${rect.top - 30}px`,
      width: `${rect.width + 60}px`,
      height: `${rect.height + 60}px`,
      zIndex: String(Number(getComputedStyle(root).zIndex) - 1),
      background: "repeating-conic-gradient(#102640 0 25%, #f0ecd8 0 50%) 0 0 / 4px 4px",
    });
    root.parentElement!.insertBefore(scene, root);
  });
  try {
    const box = (await window.boundingBox())!;
    const clip = { x: Math.floor(box.x + box.width) - 16, y: Math.floor(box.y), width: 16, height: 16 };
    const paintedPath = test.info().outputPath(`${label}-corner.png`);
    const scenePath = test.info().outputPath(`${label}-scene.png`);
    const painted = await page.screenshot({ clip, scale: "css", animations: "disabled", path: paintedPath });
    await window.evaluate((element) => ((element as HTMLElement).style.visibility = "hidden"));
    const behind = await page.screenshot({ clip, scale: "css", animations: "disabled", path: scenePath });
    await window.evaluate((element) => ((element as HTMLElement).style.visibility = ""));
    const [actual, expected] = await Promise.all([readPixels(page, painted), readPixels(page, behind)]);
    // The corner is rounded and the surface carries the shell's backdrop blur, so what has to hold is
    // that the window's own paint reaches the corner *inside* the arc: a window that clipped its content
    // away, or painted nothing there, would leave the scenery visible through it. Sample a few pixels
    // well inside the arc, away from its antialiasing, and compare RGB rather than PNG byte identity.
    const radius = await window.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopRightRadius));
    const inside: number[] = [];
    for (let row = 4; row < 12; row += 1) {
      for (let right = 4; right < 12; right += 1) {
        const column = 16 - right;
        if (column < 0) continue;
        if (Math.hypot(column - (16 - radius), row - radius) > radius - 2) continue;
        const pixel = (row * 16 + column) * 4;
        for (let channel = 0; channel < 3; channel++) {
          inside.push(Math.abs(actual[pixel + channel]! - expected[pixel + channel]!));
        }
      }
    }
    expect(inside.length, `the corner proof must sample pixels inside the ${radius}px arc`).toBeGreaterThanOrEqual(4);
    await test.info().attach(`${label}-corner`, { path: paintedPath, contentType: "image/png" });
    await test.info().attach(`${label}-scene`, { path: scenePath, contentType: "image/png" });
    // Averaged over the sample: a single pixel can coincide with the scenery through a translucent
    // acrylic, but a frame that painted nothing would leave every sample unchanged.
    const averageDifference = inside.reduce((total, entry) => total + entry, 0) / inside.length;
    expect(averageDifference, `${label}: the window paints inside its rounded corner`).toBeGreaterThan(8);
    // The bar beyond the corner must paint too; a frame that stopped painting entirely would also fail
    // the sample above, but this one names the shallower failure.
    const insidePixel = (13 * 16 + 2) * 4;
    expect(
      actual.slice(insidePixel, insidePixel + 3),
      `${label}: the bar keeps painting beyond the corner`,
    ).not.toEqual(expected.slice(insidePixel, insidePixel + 3));
  } finally {
    await window.evaluate((element, style) => {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
      document.getElementById("corner-containment-scene")?.remove();
    }, originalStyle);
  }
}

test("A window draws no frame of its own and keeps its paint inside its rounded corner", async ({ page, request }) => {
  test.setTimeout(120_000);
  const original = (await (await request.get(UI_SETTINGS_PATH)).json()) as { value: string | null };
  let chatId: string | undefined;
  try {
    expect((await request.put(UI_SETTINGS_PATH, { data: { value: "" } })).ok()).toBeTruthy();
    const response = await request.post("/api/chats", {
      data: { name: "Corner containment proof", mode: "conversation", characterIds: [] },
    });
    expect(response.ok()).toBeTruthy();
    chatId = ((await response.json()) as { id: string }).id;
    expect(
      (
        await request.patch(`/api/chats/${chatId}/metadata`, {
          data: { windowLayout: null, chatSettingsHintDismissed: true, enableAgents: false },
        })
      ).ok(),
    ).toBeTruthy();
    await seedUIState(page, {
      hasCompletedOnboarding: true,
      sidebarOpen: false,
      rightPanelOpen: false,
      chatSettingsMoveTipDismissed: true,
      chatHelpSeenModes: ["conversation", "roleplay", "game"],
      appAccentPulseMode: false,
      appAccentRgbMode: false,
      theme: "dark",
    });
    await page.addInitScript(
      ({ chatId, version }) => {
        localStorage.setItem("marinara-active-chat-id", chatId);
        localStorage.setItem("marinara:whats-new:seen-version", version);
      },
      { chatId, version: APP_VERSION },
    );
    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
          return useUIStore.getState().settingsSyncReady;
        }),
      )
      .toBe(true);
    await page.evaluate(async () => {
      const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
      useUIStore.getState().setChatWidgetPreset("dottore");
    });
    for (const theme of ["dark", "light"] as const) {
      await page.evaluate(async (theme) => {
        const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
        useUIStore.getState().setTheme(theme);
      }, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const paint of ["preset", "gradient", "custom-theme"] as const) {
        await page.evaluate(async (paint) => {
          const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
          const state = useUIStore.getState();
          state.setChatWidgetBorderColor(paint === "gradient" ? "linear-gradient(90deg, #ffd93d, #ff6b6b)" : "");
          state.setChatWidgetBackgroundColor(paint === "gradient" ? "linear-gradient(135deg, #667eea, #764ba2)" : "");
        }, paint);
        const customTheme =
          paint === "custom-theme"
            ? await page.addStyleTag({
                content:
                  ".mari-window { --mari-window-bg: rgb(197 218 241 / .75); --mari-window-header-bg: rgb(123 230 239 / .65); --mari-window-backdrop-filter: blur(20px); }",
              })
            : null;
        try {
          const settings = await openChatSettings(page);
          // A: the whole matrix proves the frame is gone, without taking a screenshot.
          await expectNoWindowFrame(settings, `${theme}-${paint}-settings`);
          await settings.locator('[data-drawer="chat-name"] [data-drawer-control="pop-out"]').click();
          // Opening through the shared store isolates this frame proof from the
          // separate phone launcher/menu presentation being tested elsewhere.
          await page.evaluate(async (id) => {
            const { useFloatingWindowStore } = await import("/src/stores/floating-window.store.ts" as string);
            useFloatingWindowStore.getState().openWindow(id);
          }, DETACHED_ID);
          const detached = page.locator(`.mari-window[data-window="${DETACHED_ID}"]`);
          await expectNoWindowFrame(detached, `${theme}-${paint}-detached`);
          await detached.locator('[data-window-control="put-back"]').click();
          await expect(detached).toHaveCount(0);
        } finally {
          await customTheme?.evaluate((element) => element.parentNode?.removeChild(element));
        }
      }
    }
    // B: the paint that is left stays inside the rounded corner — outside the radius the scenery is
    // untouched and the bar just inside it is still painted. Four cells keep the pixel proof cheap.
    for (const theme of ["dark", "light"] as const) {
      await page.evaluate(async (theme) => {
        const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
        useUIStore.getState().setTheme(theme);
      }, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const settings = await openChatSettings(page);
      await expectClearCorner(page, settings, `${theme}-rounded-settings`);
      await settings.locator('[data-drawer="chat-name"] [data-drawer-control="pop-out"]').click();
      await page.evaluate(async (id) => {
        const { useFloatingWindowStore } = await import("/src/stores/floating-window.store.ts" as string);
        useFloatingWindowStore.getState().openWindow(id);
      }, DETACHED_ID);
      const detached = page.locator(`.mari-window[data-window="${DETACHED_ID}"]`);
      await expectClearCorner(page, detached, `${theme}-rounded-detached`);
      await detached.locator('[data-window-control="put-back"]').click();
      await expect(detached).toHaveCount(0);
    }
    // No preset paints a frame either, and a theme's blur lands on the window itself: there is never a
    // second blur pass behind a pseudo-element that no longer draws anything.
    const customBlur = await page.addStyleTag({
      content: ".mari-window { --mari-window-backdrop-filter: blur(20px); }",
    });
    try {
      for (const preset of ["default", "mari"] as const) {
        await page.evaluate(async (preset) => {
          const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
          const state = useUIStore.getState();
          state.setChatWidgetPreset(preset);
          state.setChatWidgetBorderColor("linear-gradient(90deg, #ffd93d, #ff6b6b)");
        }, preset);
        const settings = await openChatSettings(page);
        await expect(settings).toHaveCSS("backdrop-filter", "blur(20px)");
        await expect
          .poll(() =>
            settings.evaluate((element) => {
              const frame = getComputedStyle(element, "::after");
              return { content: frame.content, blur: frame.backdropFilter };
            }),
          )
          .toEqual({ content: "none", blur: "none" });
      }
    } finally {
      await customBlur.evaluate((element) => element.parentNode?.removeChild(element));
    }
  } finally {
    try {
      await page.close();
    } finally {
      await request.put(UI_SETTINGS_PATH, { data: { value: original.value ?? "" } });
      if (chatId) await request.delete(`/api/chats/${chatId}?force=true`);
    }
  }
});
