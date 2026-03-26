import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");
const stageDir = path.resolve(extensionRoot, ".vsce-stage");

const requiredEntries = [
  ".vscodeignore",
  "LICENSE",
  "language-configuration.json",
  "out",
  "package-lock.json",
  "package.json",
  "server",
  "syntaxes",
];

for (const entry of requiredEntries) {
  const source = path.resolve(extensionRoot, entry);
  if (!existsSync(source)) {
    throw new Error(`Missing required VSIX staging input: ${source}`);
  }
}

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

for (const entry of requiredEntries) {
  cpSync(path.resolve(extensionRoot, entry), path.resolve(stageDir, entry), { recursive: true });
}

console.log(`Prepared VSIX staging directory: ${stageDir}`);
