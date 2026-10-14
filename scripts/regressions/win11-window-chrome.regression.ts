// Windows 11 window-chrome cleanup — the source half of G15, plus G16.
//
// The window surface has exactly ONE paint point (§4a2 in globals.css). Themes may re-tint it
// through the public --mari-window-* / --mari-widget-* hooks, but a window-family rule must never
// read the retired frame keys again, the field-option bridge must stay a pure bridge, and the
// symbols the cleanup retired (crest / ornament / win11-panel / modal-chrome) must not creep back.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path: string): string => readFileSync(join(repositoryRoot, path), "utf8");

// ── A dependency-free CSS rule reader ──
// Comments are stripped first (a brace inside one must not count), then braces are paired with
// string literals skipped — the repo has `content: ""` and quoted attribute selectors, and a brace
// inside a quote is not structural. @layer/@media/@supports are containers: we descend into them
// but never match the at-rule itself.

function stripComments(css: string): string {
  let out = "";
  let index = 0;
  while (index < css.length) {
    const char = css[index];
    if (char === "/" && css[index + 1] === "*") {
      const end = css.indexOf("*/", index + 2);
      index = end === -1 ? css.length : end + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      out += char;
      index += 1;
      while (index < css.length) {
        const inner = css[index];
        out += inner;
        index += 1;
        if (inner === "\\") {
          if (index < css.length) {
            out += css[index];
            index += 1;
          }
          continue;
        }
        if (inner === quote) break;
      }
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

type Rule = { prelude: string; body: string };

function collectRules(css: string): Rule[] {
  const source = stripComments(css);
  const rules: Rule[] = [];
  const stack: { prelude: string; bodyStart: number; isAt: boolean }[] = [];
  let buffer = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const start = index;
      index += 1;
      while (index < source.length) {
        const inner = source[index];
        index += 1;
        if (inner === "\\") {
          index += 1;
          continue;
        }
        if (inner === char) break;
      }
      buffer += source.slice(start, index);
      continue;
    }
    if (char === "{") {
      const prelude = buffer.trim();
      stack.push({ prelude, bodyStart: index + 1, isAt: prelude.startsWith("@") });
      buffer = "";
      index += 1;
      continue;
    }
    if (char === "}") {
      const open = stack.pop();
      if (open && !open.isAt && open.prelude) {
        rules.push({ prelude: open.prelude, body: source.slice(open.bodyStart, index) });
      }
      buffer = "";
      index += 1;
      continue;
    }
    if (char === ";") {
      buffer = "";
      index += 1;
      continue;
    }
    buffer += char;
    index += 1;
  }
  return rules;
}

// The window family: the bare root, its BEM elements, its own pseudo-elements and the popped-out
// drawer preview. Every alternative carries a trailing (?![\w-]) boundary — without it
// `.mari-window` would also claim `.mari-window-bubble` (the minimized button, a different thing).
const WINDOW_RULE_PATTERN = /\.mari-window(?:__[\w-]+|::(?:before|after))?(?![\w-])|\.mari-drawer-ghost(?![\w-])/u;

function isWindowRule(prelude: string): boolean {
  return WINDOW_RULE_PATTERN.test(prelude);
}

// The bare root is a prelude whose comma-split has a segment that is exactly `.mari-window`.
function isRootWindowRule(prelude: string): boolean {
  return prelude.split(",").some((part) => part.trim() === ".mari-window");
}

function windowRules(css: string): Rule[] {
  return collectRules(css).filter((rule) => isWindowRule(rule.prelude));
}

// Property declarations, not var() reads: the whole point of a "declares" test is that a rule which
// merely READS a token must not be mistaken for one that DEFINES it.
const PAINT_PATTERN =
  /(?:^|;)\s*(?:-webkit-)?(?:border(?:-[\w-]+)?|background(?:-[\w-]+)?|color|box-shadow|backdrop-filter|filter)\s*:/u;
const FIELD_OPTION_DECLARE_PATTERN = /(?:^|;)\s*--mari-widget-field-option-[\w-]+\s*:/u;

function hasPaint(body: string): boolean {
  return PAINT_PATTERN.test(body);
}

function declaresFieldOption(body: string): boolean {
  return FIELD_OPTION_DECLARE_PATTERN.test(body);
}

function paintBlockCount(css: string): number {
  return collectRules(css).filter((rule) => isRootWindowRule(rule.prelude) && hasPaint(rule.body)).length;
}

function bridgeBlockCount(css: string): number {
  return collectRules(css).filter((rule) => isRootWindowRule(rule.prelude) && declaresFieldOption(rule.body)).length;
}

// ── Checks ──

// The frame keys the window cleanup retired. A window-family rule that reads one is a regression:
// the frame's structure now belongs to the shell, so no window rule may pull it back.
const FRAME_KEYS = [
  "--mari-widget-shell-bg",
  "--mari-widget-shell-border",
  "--mari-widget-shell-backdrop-filter",
  "--mari-widget-frame-shadow",
  "--mari-widget-frame-content",
  "--mari-widget-frame-clip",
  "--mari-widget-frame-inner-clip",
  "--mari-widget-frame-inset",
  "--mari-widget-shadow",
  "--mari-widget-filter",
  "--mari-widget-header-shell-bg",
  "--mari-widget-header-padding",
  "--mari-widget-body-inset",
];

function assertWindowRulesReadNoFrameKeys(css: string, name: string): void {
  const rules = windowRules(css);
  assert.ok(
    rules.length >= 3,
    `no window rules found in ${name}: the scan matched ${rules.length} window rule bodies (expected at least 3)`,
  );
  for (const rule of rules) {
    for (const key of FRAME_KEYS) {
      assert.ok(
        !new RegExp(`var\\(\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[,)]`, "u").test(rule.body),
        `window rule in ${name} reads the retired frame key ${key}: ${rule.prelude}`,
      );
    }
  }
}

function assertBridgingPaintsNothing(css: string): void {
  const bridges = collectRules(css).filter((rule) => isRootWindowRule(rule.prelude) && declaresFieldOption(rule.body));
  assert.equal(
    bridges.length,
    1,
    `expected exactly one root .mari-window field-option bridge block, found ${bridges.length}`,
  );
  assert.ok(
    !hasPaint(bridges[0]!.body),
    `the window's field-option bridge block must not paint: ${bridges[0]!.prelude}`,
  );
}

function assertSinglePaintPoint(shellCss: string, themeCss: string): void {
  const shellPaints = paintBlockCount(shellCss);
  assert.equal(shellPaints, 1, `globals.css must paint the bare .mari-window exactly once, found ${shellPaints}`);
  const themePaints = paintBlockCount(themeCss);
  assert.equal(themePaints, 0, `chat-widgets.css must not paint the bare .mari-window, found ${themePaints}`);
}

function assertNoThemeBridgeDeclarations(css: string): void {
  assert.equal(
    bridgeBlockCount(css),
    0,
    "chat-widgets.css must not declare the field-option bridge on the root .mari-window",
  );
}

// ── G16: retired symbols ──
// Every retired name is matched with a trailing (?![a-z-]) boundary. Without it a shorter name
// matches a longer one and a live token is reported as retired — e.g. --mari-widget-crest must not
// be reported against the surviving --mari-widget-ornament-* family, and --mari-widget-crest-content
// / -height stay their own entries. These four live contracts are deliberately NOT listed:
// WINDOW_SHELL_BASE_CLASS, WINDOW_CLOSE_KEY_CLASS, data-window-shell-variant, data-window-shell-chrome.
const RETIRED_SYMBOLS = [
  "mari-win11-window",
  "mari-window-close-button",
  "WIN11_WINDOW_PANEL_SHELL",
  "DesktopWindowTitleBar",
  "DESKTOP_WINDOW_CLASS",
  "DESKTOP_WINDOW_BACKDROP_CLASS",
  "data-modal-chrome",
  "data-modal-control",
  "--mari-window-header-height",
  "--mari-window-header-padding",
  "--mari-window-control-size",
  "--mari-window-ornament",
  "--mari-widget-crest",
  "--mari-widget-crest-content",
  "--mari-widget-crest-height",
];

const RETIRED_PATTERNS = RETIRED_SYMBOLS.map((symbol) => ({
  symbol,
  pattern: new RegExp(`${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z-])`, "u"),
}));

type SourceFile = { path: string; content: string };

function findRetiredSymbols(files: SourceFile[]): { path: string; symbol: string }[] {
  const hits: { path: string; symbol: string }[] = [];
  for (const file of files) {
    for (const { symbol, pattern } of RETIRED_PATTERNS) {
      if (pattern.test(file.content)) hits.push({ path: file.path, symbol });
    }
  }
  return hits;
}

const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "build", ".turbo", "coverage", ".git", ".output"]);
// `.gitignore` ignores every `data/` directory (runtime and user data) except two in-tree docs folders,
// and this list is the second expression of that one fact:
//   ① it corresponds to the `!` negation lines of `.gitignore` one for one — change one, change both;
//   ② it corresponds ONLY to those negations: the positive ignore lines (e.g. `packages/server/data/`)
//      must never be added here. An unpacked runtime copy lives in that directory, it still contains ten
//      retired symbols, and scanning it would be a permanent red whose only "fix" is editing runtime data.
const KEPT_DATA_DIRECTORIES = ["docs/data", "packages/server/src/assets/language-packs/docs/zh-hans/data"];

function isSkippedDirectory(directory: string, name: string): boolean {
  if (SKIP_DIRECTORIES.has(name)) return true;
  if (name !== "data") return false;
  const relativePath = relative(repositoryRoot, directory).split(sep).join("/");
  return !KEPT_DATA_DIRECTORIES.some((kept) => relativePath === kept || relativePath.startsWith(`${kept}/`));
}

function walkFiles(root: string, extensions: string[]): string[] {
  const found: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (isSkippedDirectory(path, entry.name)) continue;
        visit(path);
      } else if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) {
        found.push(path);
      }
    }
  };
  visit(root);
  return found;
}

// The shipped docs and source: comments count on purpose — a retired name in a comment still
// misleads the next reader. CHANGELOG.md is excluded: it is the one place that must name the
// retired tokens when it announces them.
function readRepoSourceFiles(): SourceFile[] {
  const targets: { directory: string; extensions: string[] }[] = [
    { directory: join(repositoryRoot, "packages"), extensions: [".ts", ".tsx", ".css", ".md"] },
    { directory: join(repositoryRoot, "docs"), extensions: [".md", ".mdx"] },
    {
      directory: join(repositoryRoot, "packages/server/src/assets/language-packs/docs"),
      extensions: [".md"],
    },
  ];
  const seen = new Set<string>();
  const files: SourceFile[] = [];
  for (const target of targets) {
    for (const absolute of walkFiles(target.directory, target.extensions)) {
      if (seen.has(absolute) || absolute.endsWith("CHANGELOG.md")) continue;
      seen.add(absolute);
      files.push({
        path: relative(repositoryRoot, absolute).split(sep).join("/"),
        content: readFileSync(absolute, "utf8"),
      });
    }
  }
  return files;
}

function assertNoRetiredSymbols(files: SourceFile[] = readRepoSourceFiles()): void {
  const hits = findRetiredSymbols(files);
  assert.equal(
    hits.length,
    0,
    `retired window-chrome symbols still present:\n${hits.map((hit) => `  ${hit.path}: ${hit.symbol}`).join("\n")}`,
  );
}

// ── Sub-checks, on synthetic CSS ──
// A positive sample for the frame-key scan must carry at least three window-rule bodies: with
// fewer, the `bodies.length >= 3` drift guard fires FIRST, assert.throws(fn, /regex/) then fails as
// a FALSE red because the thrown message is the drift guard's, not the one the regex describes.
const CLEAN_WINDOW_CSS = `
  .mari-window { color: var(--mari-window-text); }
  .mari-window__header { min-height: 2rem; }
  .mari-window__body { overflow: hidden; }
`;
assert.doesNotThrow(() => assertWindowRulesReadNoFrameKeys(CLEAN_WINDOW_CSS, "synthetic clean"));
assert.throws(
  () =>
    assertWindowRulesReadNoFrameKeys(
      `
        .mari-window { color: var(--mari-window-text); }
        .mari-window__header { background: var(--mari-widget-header-shell-bg, transparent); }
        .mari-window__body { overflow: hidden; }
      `,
      "synthetic dirty",
    ),
  /reads the retired frame key/,
);

const PURE_BRIDGE =
  ".mari-window { --mari-widget-field-option-bg: var(--mari-widget-custom-background-solid); " +
  "--mari-widget-field-option-text: var(--mari-widget-custom-text-solid); }";
assert.doesNotThrow(() => assertBridgingPaintsNothing(PURE_BRIDGE));
assert.throws(
  () => assertBridgingPaintsNothing(".mari-window { --mari-widget-field-option-bg: var(--x); background: red; }"),
  /must not paint/,
);

assert.doesNotThrow(() =>
  assertSinglePaintPoint(".mari-window { background: var(--mari-window-bg); }", ".mari-window { isolation: isolate; }"),
);
assert.equal(
  paintBlockCount(".mari-window { font-family: serif; isolation: isolate; }"),
  0,
  "font-family and isolation are not paint",
);
assert.equal(paintBlockCount(".mari-window { filter: none; }"), 1, "filter is paint");
assert.equal(
  paintBlockCount(".mari-window { --mari-widget-field-option-bg: var(--mari-widget-custom-background-solid); }"),
  0,
  "a custom property is not paint",
);

assert.doesNotThrow(() => assertNoThemeBridgeDeclarations(CLEAN_WINDOW_CSS));
assert.equal(
  bridgeBlockCount(".mari-window { background-color: var(--mari-widget-field-option-bg); }"),
  0,
  "reading a field-option token is not declaring the bridge",
);
assert.throws(
  () =>
    assertNoThemeBridgeDeclarations(
      ".mari-window { --mari-widget-field-option-bg: var(--mari-widget-custom-background-solid); }",
    ),
  /must not declare the field-option bridge/,
);

assert.doesNotThrow(() =>
  assertNoRetiredSymbols([{ path: "synthetic-clean.css", content: ".mari-window { color: red; }" }]),
);
assert.throws(
  () =>
    assertNoRetiredSymbols([
      { path: "synthetic-dirty.css", content: ".mari-window::after { background: var(--mari-widget-crest); }" },
    ]),
  /retired window-chrome symbols/,
);

// ── The one bar, its keys, and the geometry the shell writes literally ──
// Merged in from the retired `window-surface-paint.regression.ts`: these pin the parts of the frame that
// are the shell's rather than the theme's, and the single implementation that renders them.

/** The canonical rule is the window's only paint point, and a theme still repaints through it. */
/** Each knob of the one surface, as the chain that lets a theme repaint a window. */
const WINDOW_COLOUR_KNOBS: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ["background", /background:\s*var\(\s*--mari-window-bg,[\s\S]{0,200}?--marinara-home-acrylic-surface/u],
  ["text", /color:\s*var\(\s*--mari-window-text,/u],
  ["shadow", /box-shadow:\s*var\(--mari-window-shadow,\s*var\(--marinara-home-acrylic-shadow\)\)/u],
  ["blur", /backdrop-filter:\s*var\(--mari-window-backdrop-filter,/u],
  ["radius", /border-radius:\s*var\(--mari-window-radius,/u],
];

function assertCanonicalRuleTakesThemeColours(css: string): void {
  for (const [label, pattern] of WINDOW_COLOUR_KNOBS) {
    assert.match(css, pattern, `the window surface must keep its ${label} knob, so a theme still repaints a window`);
  }
}

const CANONICAL_SAMPLE = `.mari-window {
  border-radius: var(--mari-window-radius, var(--marinara-win11-radius, 0.5rem));
  color: var(--mari-window-text, var(--marinara-chat-chrome-panel-text));
  background: var(
      --mari-window-bg,
      var(--mari-widget-custom-background, var(--mari-widget-bg, var(--marinara-home-acrylic-surface)))
    );
  box-shadow: var(--mari-window-shadow, var(--marinara-home-acrylic-shadow));
  backdrop-filter: var(--mari-window-backdrop-filter, blur(20px) saturate(1.3));
}`;
assert.doesNotThrow(() => assertCanonicalRuleTakesThemeColours(CANONICAL_SAMPLE));
assert.throws(
  () => assertCanonicalRuleTakesThemeColours(CANONICAL_SAMPLE.replace("--mari-window-shadow", "--mari-widget-shadow")),
  /must keep its shadow knob/u,
);

/** The bar's height and its keys are the shell's, written literally, and the variant attribute is a marker. */
function assertShellGeometryIsLiteral(globalsCssSource: string): void {
  assert.match(
    globalsCssSource,
    /\.mari-window > \.mari-window__header\s*\{[^}]*min-height:\s*2rem/u,
    "the title bar's height is the shell's, written literally",
  );
  assert.match(globalsCssSource, /\.mari-window \.mari-window__control\s*\{[^}]*width:\s*2rem/u, "a key is 2rem");
  assert.doesNotMatch(
    globalsCssSource,
    /\[data-window-shell-variant\]/u,
    "the variant attribute is a JS/spec marker: no stylesheet may consume it",
  );
}

/** The bridge block forwards the field options and nothing else — no paint of any kind hides there. */
function assertBridgeBridgesOnlyFieldOptions(globalsCssSource: string): void {
  const lines = stripComments(globalsCssSource).split(/\r?\n/u);
  const open = lines.findIndex((line) => line.includes(".mari-window") && /\.mari-window\s*\{/u.test(line));
  assert.ok(open >= 0, "globals.css must keep the `.mari-window` block that bridges the custom palette");
  const body: string[] = [];
  for (let cursor = open + 1; cursor < lines.length && lines[cursor]!.trim() !== "}"; cursor += 1)
    body.push(lines[cursor]!.trim());
  const declarations = body.filter((line) => line.length > 0);
  assert.ok(declarations.length > 0, "the bridge block must bridge something");
  for (const line of declarations) {
    assert.match(
      line,
      /^--mari-widget-field-option-[\w-]+\s*:/u,
      `the bridge block only bridges the field options, found: ${line}`,
    );
  }
}

function collectTsxUnder(directory: string, into: string[] = []): string[] {
  for (const entry of readdirSync(join(repositoryRoot, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      collectTsxUnder(path, into);
      continue;
    }
    if (entry.name.endsWith(".tsx")) into.push(path);
  }
  return into;
}

/** One bar, one implementation: only WindowTitleBar renders a window's bar, and the preview only simulates it. */
function assertOneTitleBarImplementation(): void {
  // Only a `className` that carries the class counts as rendering the bar: a panel that queries it
  // (`…closest(".mari-window")?.querySelector(".mari-window__header")`) is a consumer, not a renderer.
  const renderers = collectTsxUnder("packages/client/src/components").filter((path) =>
    /className=[\s\S]{0,80}mari-window__header/u.test(read(path)),
  );
  assert.deepEqual(
    renderers.sort(),
    [
      "packages/client/src/components/panels/SettingsPanel.tsx",
      "packages/client/src/components/window/WindowTitleBar.tsx",
    ],
    "only WindowTitleBar may render a window's bar; the settings preview is a key-less stand-in",
  );
  assert.doesNotMatch(
    read("packages/client/src/components/panels/SettingsPanel.tsx"),
    /data-window-control=/u,
    "the preview card simulates a window and must not build keys",
  );
}

/** Every window key is built in a known place and carries one of the four known names. */
function assertWindowKeysComeFromTheWindowFamily(): void {
  const known = [
    "packages/client/src/components/window/WindowTitleBar.tsx",
    "packages/client/src/components/ui/FloatingWindow.tsx",
    "packages/client/src/components/ui/Drawer.tsx",
    "packages/client/src/components/chat/ChatControlWindow.tsx",
    "packages/client/src/components/chat/ChatToolsMenu.tsx",
  ];
  const valid = new Set(["pin", "lock", "close", "put-back"]);
  const withKeys: string[] = [];
  for (const path of collectTsxUnder("packages/client/src")) {
    for (const [index, line] of read(path).split(/\r?\n/u).entries()) {
      const match = line.match(/data-window-control="([a-z-]+)"/u);
      if (!match) continue;
      if (!withKeys.includes(path)) withKeys.push(path);
      assert.ok(valid.has(match[1]!), `${path}:${index + 1} renders an unknown key "${match[1]}"`);
    }
  }
  // A key built anywhere else is either a new renderer (a deliberate edit to this list) or a stray
  // look-alike attribute, and neither may pass unnoticed.
  for (const path of withKeys) {
    assert.ok(
      known.includes(path),
      `${path} builds a window key outside the window family: add it here deliberately or move the key into WindowTitleBar`,
    );
  }
  assert.ok(withKeys.includes("packages/client/src/components/window/WindowTitleBar.tsx"), "the bar still builds keys");
}

assert.doesNotThrow(() =>
  assertBridgeBridgesOnlyFieldOptions(`.mari-window {\n  --mari-widget-field-option-bg: red;\n}`),
);
assert.throws(
  () => assertBridgeBridgesOnlyFieldOptions(`.mari-window {\n  border-color: red;\n}`),
  /only bridges the field options/,
);

// ── The preset's lettering reaches the chat windows and nothing else ──
// The domain here is deliberately NOT `WINDOW_RULE_PATTERN`: that one includes `.mari-drawer-ghost`,
// because G15 asks "may a copy of the window frame read a structure key?" — and the ghost is such a copy.
// This check asks a different question: "where may the preset's lettering reach?" — and the ghost belongs
// with the drawer it previews, so it can never carry `[data-detached]`. Do not unify the two domains:
// sharing them would fail the legitimate `.mari-drawer, .mari-drawer-ghost { font-family: … }` rule the
// moment it lands, i.e. the checker would overrule an approved decision by itself.
// Nothing here requires a ghost to be font-free.
const WINDOW_FONT_DOMAIN = /\.mari-window(?![\w-])/u;
const WIDGET_FONT_KEYS = /--mari-widget-font-[\w-]+/u;

/**
 * A window rule carries the preset's lettering when it reads a widget font key — a strict prefix, so the
 * public `--mari-window-font-family` hook (which stays valid for every window, as the docs and Professor
 * Mari teach) is not mistaken for it. `font-family: inherit` and a rule that merely names the hook are
 * therefore allowed anywhere; only the preset and option keys are held to the renderer marker.
 */
function declaresPresetLettering(body: string): boolean {
  return WIDGET_FONT_KEYS.test(body);
}

/** Every stylesheet that could carry widget lettering, so a window font cannot hide in another file. */
function widgetSheets(): Array<readonly [name: string, css: string]> {
  return walkFiles(join(repositoryRoot, "packages/client/src/styles"), [".css"]).map(
    (absolute) => [relative(repositoryRoot, absolute).split(sep).join("/"), readFileSync(absolute, "utf8")] as const,
  );
}

/** The marker itself, whatever it is set to; the presence-versus-value question is asserted separately. */
const HAS_DETACHED_MARKER = /\[data-detached(?![\w-])/u;

function fontDomainRules(css: string): Rule[] {
  return collectRules(css).filter(
    (rule) => WINDOW_FONT_DOMAIN.test(rule.prelude) && !rule.prelude.includes("mari-drawer-ghost"),
  );
}

function assertPresetLetteringStaysOnFloatingWindows(css: string, name: string): void {
  const offenders = fontDomainRules(css)
    .filter((rule) => declaresPresetLettering(rule.body) && !HAS_DETACHED_MARKER.test(rule.prelude))
    .map((rule) => rule.prelude.trim());
  assert.deepEqual(
    offenders,
    [],
    `${name}: preset lettering may only reach a window <FloatingWindow> renders (add the bare [data-detached]): ${offenders.join(", ")}`,
  );
}

/** One rule, in all the widget sheets together, carries the preset lettering — and it tests presence. */
function assertExactlyOneDetachedLetteringRule(sheets: ReadonlyArray<readonly [name: string, css: string]>): void {
  const scoped = sheets.flatMap(([name, css]) =>
    fontDomainRules(css)
      .filter((rule) => HAS_DETACHED_MARKER.test(rule.prelude))
      .map((rule) => `${name}: ${rule.prelude.trim()}`),
  );
  assert.equal(
    scoped.length,
    1,
    `exactly one rule may carry the preset lettering, found ${scoped.length} (${scoped.join(", ")})`,
  );
  assert.match(
    scoped[0]!,
    /\[data-detached\](?!\s*=)/u,
    "the renderer marker is a presence test ([data-detached]), never a value test",
  );
}

assert.throws(
  () =>
    assertPresetLetteringStaysOnFloatingWindows(
      ".mari-window { font-family: var(--mari-widget-font-preset); }",
      "sample",
    ),
  /preset lettering may only reach/,
);
assert.doesNotThrow(() =>
  assertPresetLetteringStaysOnFloatingWindows(
    ".mari-window { font-family: var(--mari-window-font-family, inherit); }",
    "sample",
  ),
);
assert.doesNotThrow(() =>
  assertPresetLetteringStaysOnFloatingWindows(
    ".mari-drawer, .mari-drawer-ghost { font-family: var(--mari-widget-font-preset); }",
    "sample",
  ),
);
assert.doesNotThrow(() =>
  assertExactlyOneDetachedLetteringRule([
    ["sample", ".mari-window[data-detached] { font-family: var(--mari-widget-font-preset); }"],
  ]),
);
assert.throws(
  () =>
    assertExactlyOneDetachedLetteringRule([
      ["sample", ".mari-window[data-detached=true] { font-family: var(--mari-widget-font-preset); }"],
    ]),
  /presence test/,
);

// ── The scan's data-directory exclusions are the `.gitignore` negations, checked, not remembered ──
function assertKeptDataDirectoriesMatchGitignore(gitignore: string, kept: readonly string[]): void {
  const negations = gitignore
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("!") && line.endsWith("data/"));
  // Both directions on purpose: a reader may add `!some/other/data/` without touching the list, and that
  // would silently stop scanning that directory — exactly the kind of quiet mismatch this guard exists for.
  assert.deepEqual(
    negations.map((line) => line.slice(1, -1)).sort(),
    [...kept].sort(),
    "the kept data directories and the `!` negations of .gitignore must stay the same set",
  );
}

assert.doesNotThrow(() => assertKeptDataDirectoriesMatchGitignore(read(".gitignore"), KEPT_DATA_DIRECTORIES));
assert.throws(
  () => assertKeptDataDirectoriesMatchGitignore(read(".gitignore"), [...KEPT_DATA_DIRECTORIES, "packages/server/data"]),
  /must stay the same set/,
);
assert.throws(
  () =>
    assertKeptDataDirectoriesMatchGitignore(
      "data/\n!docs/data/\n!packages/server/src/assets/language-packs/docs/zh-hans/data/\n!other/data/\n",
      KEPT_DATA_DIRECTORIES,
    ),
  /must stay the same set/,
);

// ── The checks run against the real stylesheets, through one registry ──
const globalsCss = read("packages/client/src/styles/globals.css");
const chatWidgetsCss = read("packages/client/src/styles/themes/chat-widgets.css");

const CHECKS: { name: string; run: () => void }[] = [
  {
    name: "G15 window-family rules read no frame keys (globals.css)",
    run: () => assertWindowRulesReadNoFrameKeys(globalsCss, "globals.css"),
  },
  {
    name: "G15 window-family rules read no frame keys (chat-widgets.css)",
    run: () => assertWindowRulesReadNoFrameKeys(chatWidgetsCss, "chat-widgets.css"),
  },
  { name: "G15 the field-option bridge block paints nothing", run: () => assertBridgingPaintsNothing(globalsCss) },
  {
    name: "G15 the bare .mari-window has one paint point",
    run: () => assertSinglePaintPoint(globalsCss, chatWidgetsCss),
  },
  {
    name: "G15 the theme declares no field-option bridge",
    run: () => assertNoThemeBridgeDeclarations(chatWidgetsCss),
  },
  { name: "G16 retired window-chrome symbols are gone", run: () => assertNoRetiredSymbols() },
  {
    name: "G15 the window surface still takes the theme's colour knobs",
    run: () => assertCanonicalRuleTakesThemeColours(globalsCss),
  },
  {
    name: "G15 the shell's geometry is literal and the variant marker has no consumer",
    run: () => assertShellGeometryIsLiteral(globalsCss),
  },
  {
    name: "G15 the bridge block bridges only the field options",
    run: () => assertBridgeBridgesOnlyFieldOptions(globalsCss),
  },
  { name: "G14b one bar implementation renders the frame", run: () => assertOneTitleBarImplementation() },
  { name: "G14b window keys come from the window family", run: () => assertWindowKeysComeFromTheWindowFamily() },
  {
    name: "G15 preset lettering only reaches windows <FloatingWindow> renders",
    run: () => {
      const sheets = widgetSheets();
      assert.ok(sheets.length >= 3, `expected the widget stylesheets, found ${sheets.length}`);
      for (const [name, css] of sheets) assertPresetLetteringStaysOnFloatingWindows(css, name);
      assertExactlyOneDetachedLetteringRule(sheets);
    },
  },
  {
    name: "G16 the kept data directories match the .gitignore negations",
    run: () => assertKeptDataDirectoriesMatchGitignore(read(".gitignore"), KEPT_DATA_DIRECTORIES),
  },
];

assert.ok(CHECKS.length >= 5, "the guard's check list shrank — a check was dropped in an edit");
for (const check of CHECKS) check.run();

console.log(`win11 window chrome regression passed (${CHECKS.length} checks)`);
