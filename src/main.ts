import { run as runBuildImportRules } from "./build-import-rules/main.ts";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

function run(args: string[]): Promise<void> {
  const [command, ...rest] = args;

  switch (command) {
    case "build-import-rules":
      return runBuildImportRules(rest);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
