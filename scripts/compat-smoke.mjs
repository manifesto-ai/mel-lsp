import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LspClient } from "./lsp-client.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const VALID_MEL = `domain Counter {
  state {
    count: number = 0
  }

  computed doubled = mul(count, 2)

  action increment() {
    when gt(count, 0) {
      patch count = add(count, 1)
    }
  }
}`;

const BROKEN_MEL = `domain Broken {
  state {
    count: number = 0
  }

  computed bad = unknownFunc(count)
}`;

async function readInstalledVersion(pkgName) {
  const pkgPath = path.join(repoRoot, "node_modules", pkgName, "package.json");
  const text = await fs.readFile(pkgPath, "utf8");
  return JSON.parse(text).version;
}

async function ensureBuiltServer(serverPath) {
  try {
    await fs.access(serverPath);
  } catch {
    execFileSync("pnpm", ["build"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }
}

async function main() {
  const serverPath = path.join(repoRoot, "dist", "server.js");
  await ensureBuiltServer(serverPath);

  const compilerVersion = await readInstalledVersion("@manifesto-ai/compiler");
  const coreVersion = await readInstalledVersion("@manifesto-ai/core");

  console.log(
    `compat-smoke: compiler=${compilerVersion} core=${coreVersion}`
  );

  const client = new LspClient(serverPath);

  try {
    await client.start();

    const valid = await client.openDocument("file:///compat-valid.mel", VALID_MEL);
    const validErrors = Array.isArray(valid?.diagnostics)
      ? valid.diagnostics.filter((d) => d?.severity === 1)
      : [];
    if (validErrors.length > 0) {
      throw new Error(
        `Expected valid MEL to have zero error diagnostics, got ${validErrors.length}`
      );
    }

    const broken = await client.openDocument(
      "file:///compat-broken.mel",
      BROKEN_MEL
    );
    const brokenErrors = Array.isArray(broken?.diagnostics)
      ? broken.diagnostics.filter((d) => d?.severity === 1)
      : [];
    if (brokenErrors.length === 0) {
      throw new Error("Expected broken MEL to produce at least one error diagnostic");
    }

    console.log("compat-smoke: ok");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
