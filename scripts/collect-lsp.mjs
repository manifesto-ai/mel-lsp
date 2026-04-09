import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  ensureDir,
  exists,
  fileUri,
  getInvestigationRoot,
  getResultsRoot,
  lineCount,
  readText,
  relativeFromRoot,
  repoRoot,
  writeJson,
  walkMelFiles,
  normalizeLspDiagnostic,
} from "./investigation-utils.mjs";
import { LspClient } from "./lsp-client.mjs";

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

  const serverPath = path.resolve(repoRoot, "dist", "server.js");
  if (!(await exists(serverPath))) {
    execFileSync("pnpm", ["build"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    if (!(await exists(serverPath))) {
      throw new Error(
        `Missing ${serverPath} after build. The LSP collector cannot start.`
      );
    }
  }

  const generatedAt = new Date().toISOString();
  const client = new LspClient(serverPath, null);
  const outputs = [];

  try {
    await client.start();

    for (const filePath of melFiles) {
      const text = await readText(filePath);
      const relativePath = relativeFromRoot(rootDir, filePath);
      const uri = fileUri(filePath);
      const diagParams = await client.openDocument(uri, text);
      const diagnostics = Array.isArray(diagParams?.diagnostics)
        ? diagParams.diagnostics.map(normalizeLspDiagnostic)
        : [];
      const outputPath = path.join(
        resultsDir,
        "lsp",
        relativePath.replace(/\.mel$/i, ".json")
      );

      const payload = {
        tool: "lsp",
        generatedAt,
        file: relativePath,
        input: {
          uri,
          byteLength: Buffer.byteLength(text, "utf8"),
          lineCount: lineCount(text),
        },
        result: {
          diagnostics,
        },
      };

      await writeJson(outputPath, payload);
      outputs.push({
        file: relativePath,
        output: path.relative(rootDir, outputPath),
        diagnosticCount: diagnostics.length,
      });
    }
  } finally {
    client.close();
  }

  await ensureDir(path.join(resultsDir, "lsp"));
  await writeJson(path.join(resultsDir, "lsp", "index.json"), {
    tool: "lsp",
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
