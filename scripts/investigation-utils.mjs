import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const investigationRoot = path.join(repoRoot, "examples", "investigations");
export const resultsRoot = path.join(investigationRoot, "_results");

export function getInvestigationRoot() {
  return process.env.MEL_INVESTIGATION_DIR
    ? path.resolve(process.env.MEL_INVESTIGATION_DIR)
    : investigationRoot;
}

export function getResultsRoot(rootDir = getInvestigationRoot()) {
  return path.join(rootDir, "_results");
}

export function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export function relativeFromRepo(absolutePath) {
  return toPosixPath(path.relative(repoRoot, absolutePath));
}

export function relativeFromInvestigations(absolutePath) {
  return toPosixPath(path.relative(investigationRoot, absolutePath));
}

export function relativeFromRoot(rootDir, absolutePath) {
  return toPosixPath(path.relative(rootDir, absolutePath));
}

export function fileUri(absolutePath) {
  return pathToFileURL(absolutePath).href;
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readText(filePath) {
  return readFile(filePath, "utf8");
}

export async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkMelFiles(rootDir) {
  const files = [];
  await walk(rootDir, files);
  return files.sort((a, b) => a.localeCompare(b));
}

async function walk(currentDir, files) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "_results") continue;
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".mel")) {
      files.push(absolutePath);
    }
  }
}

export function normalizeDiagnosticLocation(location) {
  if (!location) return null;
  return {
    start: {
      line: location.start.line,
      character: location.start.character,
    },
    end: {
      line: location.end.line,
      character: location.end.character,
    },
  };
}

export function normalizeLspDiagnostic(diagnostic) {
  return {
    range: normalizeDiagnosticLocation(diagnostic.range),
    severity: diagnostic.severity ?? null,
    code: diagnostic.code ?? null,
    source: diagnostic.source ?? null,
    message: diagnostic.message,
    relatedInformation: diagnostic.relatedInformation ?? null,
  };
}

export function normalizeCompilerDiagnostic(diagnostic) {
  return {
    location: normalizeDiagnosticLocation(diagnostic.location),
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    suggestion: diagnostic.suggestion ?? null,
  };
}

export function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}
