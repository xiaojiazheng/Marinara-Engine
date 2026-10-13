import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "..");

async function readText(relativePath) {
  return readFile(resolve(REPO_ROOT, relativePath), "utf8");
}

async function writeText(relativePath, content) {
  await writeFile(resolve(REPO_ROOT, relativePath), content);
}

function replaceOrThrow(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Could not find ${label}`);
  }

  return content.replace(pattern, replacement);
}

function updateJsonVersion(content, version) {
  return replaceOrThrow(content, /"version":\s*"[^"]+"/, `"version": "${version}"`, "package version");
}

function updateWebManifestVersion(content, version) {
  if (/"version":\s*"[^"]+"/.test(content)) {
    return updateJsonVersion(content, version);
  }

  return replaceOrThrow(
    content,
    /("description":\s*"[^"]+",)/,
    `$1\n  "version": "${version}",`,
    "web manifest description",
  );
}

function updateSharedDefaults(content, version) {
  return replaceOrThrow(
    content,
    /export const APP_VERSION = "[^"]+";/,
    `export const APP_VERSION = "${version}";`,
    "APP_VERSION constant",
  );
}

function updateInstallerNsi(content, version) {
  const next = replaceOrThrow(
    content,
    /!define APP_VERSION "[^"]+"/,
    `!define APP_VERSION "${version}"`,
    "NSIS APP_VERSION",
  );
  return replaceOrThrow(next, /!define RELEASE_TAG "v[^"]+"/, `!define RELEASE_TAG "v${version}"`, "NSIS RELEASE_TAG");
}

function updateInstallerBat(content, version) {
  const next = replaceOrThrow(
    content,
    /(echo\s+\^\|\s+v)(\d+\.\d+\.\d+)(\s+\^\|)/,
    `$1${version}$3`,
    "installer banner version",
  );
  return replaceOrThrow(next, /set "RELEASE_TAG=v[^"]+"/, `set "RELEASE_TAG=v${version}"`, "installer release tag");
}

export async function readCanonicalVersion() {
  const packageJson = JSON.parse(await readText("package.json"));
  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("Root package.json is missing a version");
  }
  return packageJson.version;
}

const DERIVED_VERSION_FILES = [
  {
    path: "packages/client/package.json",
    render: (content, version) => updateJsonVersion(content, version),
  },
  {
    path: "packages/server/package.json",
    render: (content, version) => updateJsonVersion(content, version),
  },
  {
    path: "packages/shared/package.json",
    render: (content, version) => updateJsonVersion(content, version),
  },
  {
    path: "packages/client/public/manifest.json",
    render: (content, version) => updateWebManifestVersion(content, version),
  },
  {
    path: "packages/shared/src/constants/defaults.ts",
    render: (content, version) => updateSharedDefaults(content, version),
  },
  {
    path: "win/installer/installer.nsi",
    render: (content, version) => updateInstallerNsi(content, version),
  },
  {
    path: "win/installer/install.bat",
    render: (content, version) => updateInstallerBat(content, version),
  },
];

async function buildExpectedFiles() {
  const version = await readCanonicalVersion();
  const files = [];

  for (const spec of DERIVED_VERSION_FILES) {
    const current = await readText(spec.path);
    files.push({
      path: spec.path,
      current,
      expected: spec.render(current, version),
    });
  }

  return { version, files };
}

export async function syncVersionFiles() {
  const state = await buildExpectedFiles();
  const changed = [];

  for (const file of state.files) {
    if (file.current === file.expected) continue;
    await writeText(file.path, file.expected);
    changed.push(file.path);
  }

  return {
    version: state.version,
    changed,
  };
}

export async function checkVersionDrift() {
  const state = await buildExpectedFiles();
  return {
    version: state.version,
    mismatches: state.files.filter((file) => file.current !== file.expected).map((file) => file.path),
  };
}
