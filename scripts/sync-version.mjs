import { syncVersionFiles } from "./versioning.mjs";

try {
  const result = await syncVersionFiles();

  if (result.changed.length === 0) {
    console.log(`Version files already match ${result.version}.`);
  } else {
    console.log(`Synced version ${result.version} in:`);
    for (const file of result.changed) {
      console.log(`- ${file}`);
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
