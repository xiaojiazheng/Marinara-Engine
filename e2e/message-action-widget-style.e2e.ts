import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { seedUIState } from "./ui-state-fixture.js";
import { ttsConfigSchema } from "../packages/shared/src/types/tts.js";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }
).version;
const MESSAGE = "The lantern lights a quiet path.";
const VOICE_CONTROLS = "Voice controls (speak, pause, clear cached audio, volume)";
const GRADIENTS = {
  background: "linear-gradient(135deg, #667eea, #764ba2)",
  border: "linear-gradient(90deg, #ff6b6b, #ffd93d)",
  text: "linear-gradient(90deg, #6c5ce7, #00cec9)",
};
type Axis = "font" | "shape" | "colors";

async function createFixture(request: APIRequestContext) {
  const characters: string[] = [];
  const chats: {
    id: string;
    messageId: string;
    mode: "roleplay" | "conversation";
  }[] = [];
  const remove = async () => {
    for (const chat of chats) await request.delete(`/api/chats/${chat.id}?force=true`);
    for (const id of characters) await request.delete(`/api/characters/${id}`);
  };
  try {
    for (const name of ["Guide", "Companion"]) {
      const response = await request.post("/api/characters", {
        data: { data: { name } },
      });
      expect(response.ok()).toBeTruthy();
      characters.push(((await response.json()) as { id: string }).id);
    }
    for (const mode of ["roleplay", "conversation"] as const) {
      const response = await request.post("/api/chats", {
        data: {
          name: `Message actions ${mode}`,
          mode,
          characterIds: characters,
        },
      });
      expect(response.ok()).toBeTruthy();
      const chat = {
        ...((await response.json()) as { id: string }),
        mode,
        messageId: "",
      };
      chats.push(chat);
      expect(
        (
          await request.patch(`/api/chats/${chat.id}/metadata`, {
            data: {
              enableAgents: false,
              conversationSetupComplete: true,
              roleplayDisplayStyle: "classic",
              groupChatMode: "individual",
              groupResponseOrder: "sequential",
            },
          })
        ).ok(),
      ).toBeTruthy();
      const message = await request.post(`/api/chats/${chat.id}/messages`, {
        data: {
          role: "assistant",
          characterId: characters[0],
          content: MESSAGE,
          extra: {
            thinking: "Saved reasoning for this response.",
            privateNote: "A private note for this message.",
            generationReplay: {
              generationGuide: "Let the lantern flicker.",
              generationGuideSource: "guide",
            },
            cachedPrompt: [
              { role: "system", content: "Stay in character." },
              { role: "user", content: "Continue the scene." },
            ],
          },
        },
      });
      expect(message.ok()).toBeTruthy();
      chat.messageId = ((await message.json()) as { id: string }).id;
    }
    return { chats, remove };
  } catch (error) {
    await remove();
    throw error;
  }
}

async function appearance(target: Locator) {
  return target.evaluate(async (element) => {
    getComputedStyle(element).backgroundColor;
    await Promise.all(
      element
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
    const host = getComputedStyle(element);
    const after = getComputedStyle(element, "::after");
    const before = getComputedStyle(element, "::before");
    const fill = after.content !== "none" && after.clipPath.includes("polygon") ? after : host;
    return {
      background: fill.backgroundColor,
      image: fill.backgroundImage,
      borderImage: before.backgroundImage,
      textFill: host.webkitTextFillColor,
      font: host.fontFamily,
      radius: host.borderRadius,
      clip: after.clipPath,
    };
  });
}

async function resolvedStyle(page: Page, property: string, value: string) {
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

async function application(page: Page, axes: Axis[]) {
  await page.evaluate(async (axes) => {
    const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
    const ui = useUIStore.getState();
    ui.setChatWidgetApplyFont(axes.includes("font"));
    ui.setChatWidgetApplyShape(axes.includes("shape"));
    ui.setChatWidgetApplyColors(axes.includes("colors"));
  }, axes);
  for (const axis of ["font", "shape", "colors"] as const) {
    if (axes.includes(axis))
      await expect(page.locator("html")).toHaveAttribute(`data-chat-widget-apply-${axis}`, "true");
    else await expect(page.locator("html")).not.toHaveAttribute(`data-chat-widget-apply-${axis}`);
  }
}

for (const [preset, theme] of [
  ["dottore", "dark"],
  ["mari", "light"],
] as const) {
  test(`message action panels independently follow ${preset} styling in ${theme} mode`, async ({
    page,
    request,
    isMobile,
  }, info) => {
    test.setTimeout(180_000);
    const fixture = await createFixture(request);
    try {
      await page.route("**/api/app-settings/ui", (route) => route.fulfill({ json: { value: "" } }));
      await page.route("**/api/tts/config", (route) =>
        route.fulfill({
          json: ttsConfigSchema.parse({
            enabled: true,
            voice: "fixture",
            dialogueOnly: false,
          }),
        }),
      );
      await seedUIState(page, {
        hasCompletedOnboarding: true,
        sidebarOpen: false,
        rightPanelOpen: false,
        chatHelpSeenModes: ["conversation", "roleplay", "game"],
        appAccentPulseMode: false,
        appAccentRgbMode: false,
        appAccentColor: "linear-gradient(90deg, #ff0000, #0000ff)",
        showRoleplayThinkingInMessages: false,
        conversationMessageStyle: "classic",
        theme,
        chatWidgetApplyFont: false,
        chatWidgetApplyShape: false,
        chatWidgetApplyColors: false,
      });
      await page.addInitScript(
        ({ id, version }) => {
          localStorage.setItem("marinara-active-chat-id", id);
          localStorage.setItem("marinara:whats-new:seen-version", version);
        },
        { id: fixture.chats[0]!.id, version: APP_VERSION },
      );
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-marinara-chat-chrome-accent-mode", "gradient");
      const modal = (name: string) => page.getByRole("dialog", { name, exact: true }).locator(".mari-modal-panel");
      const surfaces = [
        {
          name: "hide",
          trigger: "Choose who to hide this from",
          panel: page.getByRole("menu", {
            name: "Choose which characters cannot see this message",
            exact: true,
          }),
          axes: true,
        },
        {
          name: "thoughts",
          trigger: "View model thoughts",
          panel: modal("Model Thoughts"),
          axes: true,
        },
        {
          name: "peek",
          trigger: "Peek prompt",
          panel: page.locator("[data-chat-floating-panel] > .marinara-chat-popover").filter({
            has: page.getByRole("heading", {
              name: "Assembled Prompt",
              exact: true,
            }),
          }),
        },
        {
          name: "marks",
          trigger: "Bookmark, pin or note",
          panel: page.getByRole("dialog", {
            name: "Bookmark, pin or note",
            exact: true,
          }),
        },
        {
          name: "note",
          trigger: "Show private note",
          panel: page.getByRole("note").filter({ hasText: "A private note for this message." }),
        },
        {
          name: "guidance",
          trigger: "Stored guidance",
          panel: modal("Stored guidance"),
        },
        {
          name: "start",
          trigger: "Mark as new start",
          panel: page.getByRole("menu", {
            name: "Choose whose context starts at this message",
            exact: true,
          }),
        },
        {
          name: "voice",
          trigger: VOICE_CONTROLS,
          panel: page.getByRole("dialog", {
            name: VOICE_CONTROLS,
            exact: true,
          }),
        },
        { name: "delete", trigger: "Delete", panel: modal("Delete message") },
        {
          name: "branch",
          trigger: "Branch from here",
          panel: modal("Create a new branch?"),
        },
        ...(isMobile
          ? [
              {
                name: "regenerate",
                trigger: "Regenerate",
                panel: modal("Regenerate Message"),
              },
            ]
          : []),
        {
          name: "reaction",
          trigger: "Add reaction",
          panel: page.locator("[data-emoji-picker]"),
          conversation: true,
        },
      ];
      let reference: Awaited<ReturnType<typeof appearance>> | undefined;
      for (const surface of surfaces) {
        await test.step(surface.name, async () => {
          await application(page, []);
          const chat = fixture.chats[surface.conversation ? 1 : 0]!;
          await page.evaluate(
            async ({ id }) => {
              const { useChatStore } = await import("/src/stores/chat.store.ts" as string);
              const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
              useChatStore.getState().setActiveChatId(id);
              useUIStore.getState().setChatWidgetPreset("default");
            },
            { id: chat.id },
          );
          // The reset above reaches the `data-chat-widget-preset` attribute asynchronously (store write →
          // effect), and `baseline` below is captured without waiting: it would otherwise read the
          // PREVIOUS step's preset. `App.tsx` DELETES the attribute for "default" (only non-default
          // presets are written), so the settled state is its absence — waiting for "default" would
          // never pass.
          await expect(page.locator("html")).not.toHaveAttribute("data-chat-widget-preset");
          const row = page.locator(`[data-message-id="${chat.messageId}"]`);
          await row.scrollIntoViewIfNeeded();
          await row.hover();
          if (
            await row
              .locator(".mari-message-actions")
              .first()
              .evaluate((element) => getComputedStyle(element).opacity !== "1")
          ) {
            await row.getByText(MESSAGE, { exact: true }).click();
          }
          await row.getByRole("button", { name: surface.trigger, exact: true }).click();
          await expect(surface.panel).toBeVisible();
          await expect(surface.panel).toBeInViewport({ ratio: 1 });
          // `baseline` is the PRE-switch capture: it may only be compared against states captured before
          // `setChatWidgetPreset` below. Every comparison after the switch uses `themed` instead.
          const baseline = await appearance(surface.panel);
          if (surface.name === "voice" && theme === "light") {
            // Cut corners must retain the light gradient chrome when Colors remains disabled.
            await page.evaluate(async () => {
              const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
              useUIStore.getState().setChatWidgetPreset("dottore");
            });
            // Same preset, options off: the reference for the shape-only comparison below. It must be read
            // AFTER the switch above, or it would be the previous preset and compare two different states.
            const voiceBaseline = await appearance(surface.panel);
            await application(page, ["shape"]);
            const shaped = await appearance(surface.panel);
            expect(shaped.clip).toContain("polygon(");
            expect(shaped.background).toBe(voiceBaseline.background);
            expect(shaped.image).toBe(voiceBaseline.image);
            expect(shaped.font).toBe(voiceBaseline.font);
            await page.screenshot({
              path: info.outputPath("message-action-voice-cut-corner-light.png"),
              animations: "disabled",
            });
            await application(page, []);
          }
          if (surface.name === "thoughts") {
            // The Default preset has no widget palette. Enabling Colors must keep its fallback paint readable.
            await application(page, ["colors"]);
            const defaults = await appearance(surface.panel);
            expect(defaults.background).toBe(
              await resolvedStyle(page, "background-color", "var(--marinara-chat-chrome-panel-bg)"),
            );
            expect(defaults.textFill).toBe(
              await resolvedStyle(page, "color", "var(--marinara-chat-chrome-panel-text)"),
            );
            expect(defaults.background).not.toBe("rgba(0, 0, 0, 0)");
            await application(page, []);
            expect(await appearance(surface.panel)).toEqual(baseline);
          }
          await page.evaluate(async (preset) => {
            const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
            useUIStore.getState().setChatWidgetPreset(preset);
          }, preset);
          await expect(page.locator("html")).toHaveAttribute("data-chat-widget-preset", preset);
          // `themed` = the SAME preset with all three axes off (taken right after the preset switch): the
          // reference for every per-axis comparison below. It is never compared against the pre-switch
          // `baseline`, which would compare two different presets.
          const themed = await appearance(surface.panel);
          expect(themed.clip, `${preset}: with the shape option off, a panel is never cut`).toBe("none");
          expect(themed.borderImage, `${preset}: a window panel draws no decorative frame`).toBe("none");
          // Measured, not assumed: a message-action panel opts into the chat surface, so with the options
          // off it keeps the chat-panel paint (this spec pins the same chain for `thoughts` below) and the
          // preset's own palette does not reach it. Pinned here so the day that changes, this test says so.
          expect(themed.background, `${preset}: the panel keeps the chat-panel paint`).toBe(
            await resolvedStyle(page, "background-color", "var(--marinara-chat-chrome-panel-bg)"),
          );
          // TODO (open): the text half of a window's colour needs its own assertion here, next to the
          // background one — but its expectation must come from a probe first. The first attempt asserted
          // the window colour chain's tail (`--mari-widget-text`) and was refuted by the run: with all
          // axes off this panel takes the theme's text colour (`rgb(212, 212, 212)` in dark), not the
          // preset palette. Probe (read-only, to do): walk `document.styleSheets`, match the panel against
          // each `selectorText`, and list the rules that declare `color`/`-webkit-text-fill-color`, with
          // its layer. Then re-add the assertion with the single expectation the architect rules.
          expect(themed.font, `${preset}: the preset's lettering does not`).not.toBe(
            await resolvedStyle(
              page,
              "font-family",
              "var(--mari-widget-font-preset, var(--mari-widget-font-override, inherit))",
            ),
          );
          // Contract: a chat theme still decides a window's colour; it never decides its material or shape.
          // A whole-object comparison against the pre-switch `baseline` was removed here: it compared two
          // different presets (the defect this spec was fixed for), and pointing it at the same-state
          // `themed` on both sides would only be a tautology. What this block meant to say is carried by the
          // per-axis assertions — e.g. `expect({ ...lettering, font: themed.font }).toEqual(themed)`, which
          // pins every field except `font` to the same-state reference.
          if (surface.axes) {
            await page.screenshot({
              path: info.outputPath(`message-action-${preset}-${surface.name}-before.png`),
              animations: "disabled",
            });
            await application(page, ["font"]);
            const lettering = await appearance(surface.panel);
            expect(lettering.font).not.toBe(themed.font);
            // The reference is the SAME preset with the options off (`themed`), never the pre-switch
            // `baseline`: that compared two different presets, so it failed for the wrong reason (the
            // preset's own colour class moves a window's text, which is the approved design).
            expect({ ...lettering, font: themed.font }).toEqual(themed);
            await application(page, ["shape"]);
            const shape = await appearance(surface.panel);
            // One reference for this whole section: `themed` (the same preset, all axes off).
            expect(shape.font).toBe(themed.font);
            expect(shape.background).toBe(themed.background);
            expect(shape.image).toBe(themed.image);
            expect([shape.radius, shape.clip]).not.toEqual([themed.radius, themed.clip]);
            await application(page, ["colors"]);
            const colors = await appearance(surface.panel);
            expect(colors.font).toBe(themed.font);
            expect([colors.radius, colors.clip]).toEqual([themed.radius, themed.clip]);
            expect(colors.background).not.toBe(themed.background);
          }
          if (surface.name === "delete" && preset === "dottore") {
            const action = surface.panel.locator(".mari-chrome-control").first();
            await action.hover();
            const hover = await appearance(action);
            await application(page, ["shape"]);
            const shapedHover = await appearance(action);
            expect(shapedHover.clip).toContain("polygon(");
            expect(shapedHover.background).toBe(hover.background);
            expect(shapedHover.textFill).toBe(hover.textFill);
            await page.mouse.move(1, 1);
          }
          await application(page, ["font", "shape", "colors"]);
          const styled = await appearance(surface.panel);
          expect(styled.font).not.toBe(themed.font);
          expect([styled.radius, styled.clip]).not.toEqual([themed.radius, themed.clip]);
          expect(styled.background).not.toBe(themed.background);
          if (reference) {
            expect(styled.font).toBe(reference.font);
            expect(styled.radius).toBe(reference.radius);
            expect(styled.clip).toBe(reference.clip);
            expect(styled.background).toBe(reference.background);
          } else reference = styled;
          await expect(surface.panel).toBeInViewport({ ratio: 1 });
          if (["thoughts", "guidance", "peek"].includes(surface.name)) {
            const text =
              surface.name === "thoughts"
                ? "Saved reasoning for this response."
                : surface.name === "guidance"
                  ? "Let the lantern flicker."
                  : "Stay in character.";
            const prose = surface.panel.getByText(text, { exact: true });
            if (surface.name === "peek" && !(await prose.isVisible())) {
              await surface.panel.getByRole("button", { name: /^System\b/i }).click();
            }
            await expect(prose).toBeVisible();
            await expect(prose).toHaveCSS("font-family", styled.font);
          }
          // `close` is a DIFFERENT element per surface: some panels' Close is a window key
          // (`.mari-window__control`), others are ordinary buttons with no window chrome. They do not share
          // a radius source — §4a2 pins the key's radius to its own token
          // (`.mari-window .mari-window__control { border-radius: var(--mari-window-control-radius, 0.5rem) }`,
          // independent of preset and shape), while a non-key button follows the widget chain. Same for the
          // resting paint: only keys are transparent at rest (§4a2 fills them on hover/press only).
          const close = surface.panel.getByRole("button", { name: /^Close / });
          if (await close.count()) {
            const isWindowKey = await close.evaluate((element) => element.matches(".mari-window__control"));
            await expect(close).toHaveCSS(
              "border-radius",
              await resolvedStyle(
                page,
                "border-radius",
                isWindowKey ? "var(--mari-window-control-radius, 0.5rem)" : "var(--mari-widget-drawer-radius)",
              ),
            );
            const closePaint = await appearance(close);
            const hovered = await close.evaluate((element) => element.matches(":hover"));
            expect(closePaint.background).toBe(
              hovered
                ? await resolvedStyle(page, "background-color", "var(--mari-widget-soft)")
                : isWindowKey
                  ? "rgba(0, 0, 0, 0)"
                  : styled.background,
            );
            await expect(close).toHaveCSS("color", await resolvedStyle(page, "color", "var(--mari-widget-accent)"));
          }
          const header = surface.panel.locator(".marinara-chat-popover__header").first();
          if (await header.count()) {
            await expect(header).toHaveCSS(
              "border-bottom-color",
              await resolvedStyle(page, "color", "var(--mari-widget-border)"),
            );
          }
          await page.screenshot({
            path: info.outputPath(`message-action-${preset}-${surface.name}.png`),
            animations: "disabled",
          });
          if (surface.name === "marks") {
            const note = surface.panel.getByRole("textbox", {
              name: "Private note",
              exact: true,
            });
            await expect(note).toHaveValue("A private note for this message.");
            await expect(note).toHaveCSS("background-color", styled.background);
            await expect(note).toHaveCSS(
              "border-color",
              await resolvedStyle(page, "color", "var(--mari-widget-border)"),
            );
            await expect(note).toHaveCSS(
              "-webkit-text-fill-color",
              await resolvedStyle(page, "color", "var(--mari-widget-text)"),
            );
          }
          if (surface.axes || surface.name === "peek" || surface.name === "reaction" || surface.name === "marks") {
            await page.evaluate(async (paints) => {
              const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
              const ui = useUIStore.getState();
              ui.setChatWidgetBackgroundColor(paints.background);
              ui.setChatWidgetBorderColor(paints.border);
              ui.setChatWidgetTextColor(paints.text);
            }, GRADIENTS);
            await expect(page.locator("html")).toHaveAttribute("data-chat-widget-colors", /background/);
            const painted = await appearance(surface.panel);
            expect(painted.image).toContain("102, 126, 234");
            expect(painted.borderImage).toContain("255, 107, 107");
            expect(painted.textFill).toBe("rgb(108, 92, 231)");
            await page.screenshot({
              path: info.outputPath(`message-action-${preset}-${surface.name}-gradient.png`),
              animations: "disabled",
            });
            // Clear the custom paints again: they are NOT gated by the Colors axis, so leaving them set
            // would make the round-trip claim below compare against a state that still carries them
            // (it only differs in `textFill`, which is exactly this leak). `game-widget-style` clears its
            // custom accent the same way before its round-trip assertion.
            await page.evaluate(async () => {
              const { useUIStore } = await import("/src/stores/ui.store.ts" as string);
              const ui = useUIStore.getState();
              ui.setChatWidgetBackgroundColor("");
              ui.setChatWidgetBorderColor("");
              ui.setChatWidgetTextColor("");
            });
          }
          await application(page, []);
          // Every field except `textFill` must return to the pre-switch reading. `textFill` is measured as
          // `-webkit-text-fill-color`, and with all axes off this panel still differs from `baseline` in
          // that one field: both sides resolve to the HOST theme's lettering colour, but the preset
          // appears to change its ALPHA (`color(srgb … / 0.9)` → `rgb(…)`). That is neither "the preset's
          // palette leaks" nor "the preset is invisible", so the expectation is deliberately left open
          // here rather than pinned to a guessed attribute: see pr-evidence/window-chrome-defects.md.
          const roundTripped = await appearance(surface.panel);
          expect({ ...roundTripped, textFill: baseline.textFill }).toEqual(baseline);
          if (surface.name === "peek")
            await page
              .getByRole("button", {
                name: "Close assembled prompt",
                exact: true,
              })
              .click();
          else await page.keyboard.press("Escape");
          await expect(surface.panel).toBeHidden();
        });
      }
    } catch (error) {
      await page.screenshot({
        path: info.outputPath("message-action-failure.png"),
        animations: "disabled",
      });
      throw error;
    } finally {
      await page.close();
      await fixture.remove();
    }
  });
}
