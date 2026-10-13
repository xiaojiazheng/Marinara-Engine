import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), "utf8");
}

const homeBrowser = readSource("packages/client/src/components/chat/HomeBrowserHub.tsx");
const desktopArea = readSource("packages/client/src/components/home/HomeDesktopArea.tsx");
const agentCatalog = readSource("packages/client/src/components/agents/AgentCatalogView.tsx");
const agentModeFilter = readSource("packages/client/src/components/agents/AgentModeFilter.tsx");
const uiStore = readSource("packages/client/src/stores/ui.store.ts");
const widgetEditor = readSource("packages/client/src/components/game/GameWidgetSetupEditor.tsx");
const gameSurface = readSource("packages/client/src/components/game/GameSurface.tsx");
const gameNarration = readSource("packages/client/src/components/game/GameNarration.tsx");
const chatRoutes = readSource("packages/server/src/routes/chats.routes.ts");

// #5474: the Discovery Desk recommendation card retired with the Home widget grid, so "open the
// displayed Agent" is hosted by the desk's Discovery icon now. The capability itself is unchanged and
// stays pinned below: the entry point opens the Agent Catalog, and the catalog still selects the Agent
// it was opened for.
assert.match(
  desktopArea,
  /id === "discovery"[\s\S]{0,24}openAgentCatalog\(\)/u,
  "The Discovery icon must open the downloadable Agent Catalog",
);
assert.match(
  homeBrowser,
  /target\.surface === "agent-catalog"\) ui\.openAgentCatalog\(\)/u,
  "The Professor Mari navigator opens the Agent Catalog through the same action",
);
assert.match(uiStore, /openAgentCatalog: \(packageId\) =>[\s\S]{0,80}agentCatalogOpen: true,/u);
assert.match(uiStore, /agentCatalogInitialPackageId: packageId \?\? null/u);
assert.match(
  agentCatalog,
  /const \[selectedId, setSelectedId\] = useState<string \| null>\(initialPackageId\);/u,
  "The Agent Catalog must select the Agent it was opened for",
);
assert.match(
  agentCatalog,
  /const \[mobileDetail, setMobileDetail\] = useState\(Boolean\(initialPackageId\)\);/u,
  "The Agent Catalog must open that Agent's detail on phones",
);
assert.match(agentModeFilter, /export type AgentModeFilterValue = "all" \| ChatMode/u);
assert.match(agentCatalog, /<AgentModeFilter className="mt-2" value=\{modeFilter\} onChange=\{setModeFilter\} \/>/u);
assert.match(agentCatalog, /modeFilter === "all" \|\| packageModes\(manifest\.id\)\.includes\(modeFilter\)/u);
assert.match(agentCatalog, /const hasActiveFilters = Boolean\(query\.trim\(\)\) \|\| modeFilter !== "all";/u);

assert.match(widgetEditor, /ui\.game\.gamewidgetsetupeditor\.id/u);
assert.match(
  widgetEditor,
  /event\.currentTarget\.value = replaceWidgetId\(widget\.id, event\.currentTarget\.value\);/u,
);

assert.match(gameSurface, /const turnKey = narrationTurnKey\(msg\);/u);
assert.match(gameSurface, /setNarrationDoneTurnKey\(null\);\s+setActiveChoices\(null\);/u);
assert.match(gameSurface, /gameNarrationMessageId: turnKey/u);
assert.match(gameNarration, /stale out-of-range cursor must restart[\s\S]*?: 0;/u);
assert.match(chatRoutes, /delete settingsToKeep\.gameNarrationIndex;/u);
assert.match(chatRoutes, /delete settingsToKeep\.gameNarrationMessageId;/u);

console.log("Assigned issue sweep regressions passed.");
