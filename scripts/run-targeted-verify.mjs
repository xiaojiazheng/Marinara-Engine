#!/usr/bin/env node
/**
 * Targeted verify — this fork's acceptance lane.
 *
 * Replaces the full Node regression lane (`pnpm regression`) and the full
 * Playwright matrix (`pnpm regression:ui`). See `AGENTS.md § Frontend Changes`
 * rule 6: never run the full suite; run the set below instead.
 *
 * The sets cover the contracts a Home / window / theme / docs change can break
 * and contain only checks that pass on the target machine. Add a guard or spec
 * here when a change proves it matters — keep the set small and fast.
 *
 * Usage:
 *   node scripts/run-targeted-verify.mjs               # check + guards + focused e2e
 *   node scripts/run-targeted-verify.mjs --guards-only # skip e2e
 *   node scripts/run-targeted-verify.mjs --e2e-only    # skip check + guards
 *   node scripts/run-targeted-verify.mjs --list        # print the sets
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Source-scanning guards pinning shell, window, home, docs and theme contracts. */
const GUARDS = [
  'scripts/regressions/floating-window.regression.ts',
  'scripts/regressions/setup-escape-overlay-guard.regression.ts',
  'scripts/regressions/chat-window-icons.regression.ts',
  'scripts/regressions/mari-polish.regression.ts',
  'scripts/regressions/mari-guard-sibling-paths.regression.ts',
  'scripts/regressions/agent-home-widgets.regression.ts',
  'scripts/regressions/assigned-issues-5474-5502.regression.ts',
  'scripts/regressions/mobile-safe-area-inset.regression.ts',
  'scripts/regressions/theme-css-security.regression.ts',
  'scripts/regressions/docs-language.regression.ts',
  'scripts/regressions/win11-window-chrome.regression.ts',
  'scripts/regressions/open-issues.regression.ts',
];

/** Focused e2e specs: Home desk, Win11 windows, notifications, chat surfaces. */
const E2E_SPECS = [
  'e2e/home-desktop-icons-fit.e2e.ts',
  'e2e/win11-window-shell.e2e.ts',
  'e2e/win11-notifications.e2e.ts',
  'e2e/message-action-widget-style.e2e.ts',
  'e2e/avatar-preview.e2e.ts',
  'e2e/ux-feedback-sweep.e2e.ts',
  'e2e/game-experience-setup.e2e.ts',
  'e2e/chat-sweep.e2e.ts',
];

const argv = process.argv.slice(2);
const guardsOnly = argv.includes('--guards-only');
const e2eOnly = argv.includes('--e2e-only');

if (argv.includes('--list')) {
  console.info('Guards:');
  for (const guard of GUARDS) console.info(`  ${guard}`);
  console.info('E2E specs (desktop-chromium, one worker):');
  for (const spec of E2E_SPECS) console.info(`  ${spec}`);
  process.exit(0);
}

const results = [];

function step(label, command, args, options = {}) {
  console.info(`\n== ${label}`);
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  const ok = result.status === 0;
  results.push({ label, ok, seconds: Math.round((Date.now() - started) / 1000) });
  return ok;
}

if (!e2eOnly) {
  step('pnpm check (types, lint, localization, format, build)', 'pnpm', ['check']);
  step('build shared (guard prerequisite)', 'pnpm', ['build:shared']);
  for (const guard of GUARDS) {
    step(`guard ${path.basename(guard)}`, 'node', ['./scripts/run-regressions.mjs', '--filter', guard]);
  }
}

if (!guardsOnly) {
  step('focused e2e (desktop-chromium, one worker)', 'npx', [
    'playwright',
    'test',
    '-c',
    'playwright.config.ts',
    ...E2E_SPECS,
    '--project=desktop-chromium',
    '--workers=1',
    // Own artifacts dir so a concurrent run cannot collide on test-results/ (AGENTS.md rule 2).
    '--output=.tmp/verify-artifacts',
  ], { env: { ...process.env, PLAYWRIGHT_ONLY_PROJECT: 'desktop' } });
}

console.info('\n== targeted verify summary');
let failed = 0;
for (const entry of results) {
  if (!entry.ok) failed += 1;
  console.info(`  ${entry.ok ? 'PASSED' : 'FAILED'}  ${entry.label} (${entry.seconds}s)`);
}
console.info(`  ${results.length - failed}/${results.length} steps passed`);
process.exit(failed === 0 ? 0 : 1);
