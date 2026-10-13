import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeLocaleResource, normalizeUILanguage } from "@marinara-engine/shared";
import { getDataDir } from "../../config/runtime-config.js";
import { logger } from "../../lib/logger.js";
import { assertInsideDir } from "../../utils/security.js";
import {
  docsPackBaseUrl,
  fetchPackBytes,
  fetchPackFile,
  resolvePinnedBase,
  verifyPackFile,
  type DocsPackManifestFile,
} from "./docs-pack.service.js";

const MAX_PACK_BYTES = 5 * 1024 * 1024;
const BUNDLED_UI_ROOT = fileURLToPath(new URL("../../assets/language-packs/ui/", import.meta.url));
const installs = new Map<string, Promise<void>>();

export function uiPackPath(language: string): string {
  if (!normalizeUILanguage(language) || language === "en" || normalizeUILanguage(language) !== language) {
    throw new Error("Unsupported UI language");
  }
  return join(getDataDir(), "ui-packs", `${language}.json`);
}

/** Local reads never download. Bundled Chinese is the fallback when its data pack is missing or corrupt. */
export async function readUIPack(language: string): Promise<unknown | null> {
  const paths = [uiPackPath(language)];
  if (language === "zh-Hans") paths.push(join(BUNDLED_UI_ROOT, "zh-Hans.json"));
  for (const path of paths) {
    try {
      const root = await realpath(dirname(path));
      assertInsideDir(root, await realpath(path));
      const info = await stat(path);
      if (!info.isFile() || info.size > MAX_PACK_BYTES) throw new Error("UI language pack exceeds the file limit");
      const resource: unknown = JSON.parse(await readFile(path, "utf8"));
      normalizeLocaleResource(language, resource);
      return resource;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn(error, "Could not read UI language pack %s; trying the fallback", language);
      }
    }
  }
  return null;
}

export function uiPackManifestFile(raw: unknown, language: string): DocsPackManifestFile {
  uiPackPath(language);
  const files = (raw as { files?: unknown } | null)?.files;
  if (!Array.isArray(files)) throw new Error("UI pack manifest has no file list");
  const matches = files.filter((file) => file?.path === `${language}.json`);
  if (matches.length !== 1) throw new Error("UI language is missing or duplicated in the pack manifest");
  const file = matches[0] as DocsPackManifestFile;
  if (
    typeof file.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(file.sha256) ||
    !Number.isInteger(file.bytes) ||
    file.bytes <= 0 ||
    file.bytes > MAX_PACK_BYTES
  )
    throw new Error("UI pack manifest has an invalid hash or size");
  return { path: `${language}.json`, sha256: file.sha256, bytes: file.bytes };
}

/** Reuses docs' HTTPS/SSRF checks, immutable-ref pinning, byte caps and SHA-256 verification. */
export function installUIPack(language: string): Promise<void> {
  const destination = uiPackPath(language);
  const pending = installs.get(language);
  if (pending) return pending;
  const install = (async () => {
    const bundled = language === "zh-Hans";
    const base = bundled ? null : `${await resolvePinnedBase(docsPackBaseUrl())}/ui`;
    const manifestBytes = bundled
      ? await readFile(join(BUNDLED_UI_ROOT, "manifest.json"))
      : await fetchPackBytes(`${base}/manifest.json`, 1024 * 1024);
    const manifest: unknown = JSON.parse(manifestBytes.toString("utf8"));
    const file = uiPackManifestFile(manifest, language);
    const content = bundled
      ? verifyPackFile(await readFile(join(BUNDLED_UI_ROOT, file.path)), file)
      : await fetchPackFile(`${base}/${file.path}`, file);
    normalizeLocaleResource(language, JSON.parse(content.toString("utf8")));
    await mkdir(join(getDataDir(), "ui-packs"), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, content, { flag: "wx" });
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
    logger.info("Installed UI language pack %s", language);
  })().finally(() => installs.delete(language));
  installs.set(language, install);
  return install;
}
