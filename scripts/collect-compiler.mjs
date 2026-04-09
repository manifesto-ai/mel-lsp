import path from "node:path";
import { compileMelDomain } from "@manifesto-ai/compiler";
import {
  ensureDir,
  exists,
  getInvestigationRoot,
  getResultsRoot,
  readText,
  relativeFromRoot,
  writeJson,
  walkMelFiles,
  normalizeCompilerDiagnostic,
  lineCount,
} from "./investigation-utils.mjs";

async function main() {
  const rootDir = getInvestigationRoot();
  const resultsDir = getResultsRoot(rootDir);

  if (!(await exists(rootDir))) {
    throw new Error(
      `Investigation root not found: ${rootDir}. Create examples/investigations first or set MEL_INVESTIGATION_DIR.`
    );
  }

  const melFiles = await walkMelFiles(rootDir);
  if (melFiles.length === 0) {
    throw new Error(`No .mel files found under ${rootDir}`);
  }

  const generatedAt = new Date().toISOString();
  const outputs = [];

  for (const filePath of melFiles) {
    const text = await readText(filePath);
    const result = compileMelDomain(text, { mode: "domain" });
    const relativePath = relativeFromRoot(rootDir, filePath);
    const outputPath = path.join(
      resultsDir,
      "compiler",
      relativePath.replace(/\.mel$/i, ".json")
    );

    const payload = {
      tool: "compiler",
      generatedAt,
      file: relativePath,
      input: {
        byteLength: Buffer.byteLength(text, "utf8"),
        lineCount: lineCount(text),
      },
      result: {
        hasSchema: Boolean(result.schema),
        errors: result.errors.map(normalizeCompilerDiagnostic),
        warnings: result.warnings.map(normalizeCompilerDiagnostic),
      },
    };

    await writeJson(outputPath, payload);
    outputs.push({
      file: relativePath,
      output: path.relative(rootDir, outputPath),
      hasSchema: Boolean(result.schema),
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });
  }

  await ensureDir(path.join(resultsDir, "compiler"));
  await writeJson(path.join(resultsDir, "compiler", "index.json"), {
    tool: "compiler",
    generatedAt,
    root: rootDir,
    fileCount: outputs.length,
    files: outputs,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
