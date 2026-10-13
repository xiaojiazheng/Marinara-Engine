/* global process */
import { totalmem } from "node:os";

// The client build needs about 1.2 GiB of Node.js heap: it runs out of memory at 1024 and
// 1152 MiB and passes at 1280 MiB. Give it 1536 MiB when half the device's memory allows,
// and never less than the 1280 MiB it needs.
const BUILD_HEAP_TARGET_MB = 1536;
const BUILD_HEAP_FLOOR_MB = 1280;

/**
 * The heap (MiB) a low-memory client build runs with, or null to keep the inherited limit. A low-memory
 * build sets its own heap; a heap the user set in NODE_OPTIONS wins over it.
 */
export function resolveClientBuildHeapMb({ lowMemory, env = process.env, totalMemoryBytes = totalmem() }) {
  if (!lowMemory || env.MARINARA_EXPLICIT_NODE_HEAP === "1") return null;
  const deviceCapMb = Math.floor(totalMemoryBytes / 1024 / 1024 / 2 / 128) * 128;
  return Math.min(BUILD_HEAP_TARGET_MB, Math.max(BUILD_HEAP_FLOOR_MB, deviceCapMb));
}
