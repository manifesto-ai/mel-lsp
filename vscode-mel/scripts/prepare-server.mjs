import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");
const sourceServer = path.resolve(extensionRoot, "..", "dist", "server.js");
const targetDir = path.resolve(extensionRoot, "server");
const targetServer = path.resolve(targetDir, "server.js");

if (!existsSync(sourceServer)) {
  throw new Error(`Bundled MEL server not found at ${sourceServer}. Run the root build first.`);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceServer, targetServer);
console.log(`Prepared packaged MEL server: ${targetServer}`);
