import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LspTestClient, type Diag } from "./lsp-client.js";
import {
  BEGINNER_BOOKMARK_MEL,
  BEGINNER_BROKEN_MEL,
} from "./fixtures/beginner-bookmark.mel.js";

const URI = "file:///test/beginner-bookmark.mel";
const BROKEN_URI = "file:///test/beginner-broken.mel";

/**
 * Given a multi-line source string and a search token, return the 0-based
 * { line, character } of the first occurrence of `token` within the text.
 * If `occurrence` is provided, skip that many earlier matches (0-based).
 */
function posOf(
  text: string,
  token: string,
  occurrence = 0
): { line: number; character: number } {
  let offset = -1;
  for (let i = 0; i <= occurrence; i++) {
    offset = text.indexOf(token, offset + 1);
    if (offset === -1) throw new Error(`Token "${token}" not found (occ ${i})`);
  }
  const before = text.slice(0, offset);
  const line = before.split("\n").length - 1;
  const lastNl = before.lastIndexOf("\n");
  const character = lastNl === -1 ? offset : offset - lastNl - 1;
  return { line, character };
}

describe("E2E Beginner: Bookmark Manager", { timeout: 30_000 }, () => {
  let client: LspTestClient;

  beforeAll(async () => {
    client = new LspTestClient();
    await client.start();
  });

  afterAll(() => {
    client.close();
  });

  // -----------------------------------------------------------
  // 1. No-error compilation
  // -----------------------------------------------------------
  it("should compile with no errors", async () => {
    const { diagnostics } = await client.openDocument(URI, BEGINNER_BOOKMARK_MEL);
    const errors = diagnostics.filter((d: Diag) => d.severity === 1);
    expect(errors).toHaveLength(0);
  });

  // -----------------------------------------------------------
  // 2. Complete state fields in expression context
  // -----------------------------------------------------------
  it("should complete state fields in expression", async () => {
    // Position inside add(totalBookmarks, 1) — on the "t" of the inner totalBookmarks
    const pos = posOf(BEGINNER_BOOKMARK_MEL, "totalBookmarks", 2); // 3rd occurrence (inside add())
    const items = await client.completion(URI, pos.line, pos.character);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("totalBookmarks");
    expect(labels).toContain("lastTitle");
    expect(labels).toContain("isFavorite");
  });

  // -----------------------------------------------------------
  // 3. Complete builtin functions
  // -----------------------------------------------------------
  it("should complete builtin functions", async () => {
    const pos = posOf(BEGINNER_BOOKMARK_MEL, "totalBookmarks", 2);
    const items = await client.completion(URI, pos.line, pos.character);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("add");
    expect(labels).toContain("gt");
    expect(labels).toContain("concat");
  });

  // -----------------------------------------------------------
  // 4. Complete keywords at top level inside domain body
  // -----------------------------------------------------------
  it("should complete keywords at top level", async () => {
    // Use the blank line between the state block and the first computed (line 6 in the MEL)
    const text = BEGINNER_BOOKMARK_MEL;
    const lines = text.split("\n");
    // Find first empty line inside the domain body (after the state closing brace)
    let blankLine = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "" && i > 3) {
        blankLine = i;
        break;
      }
    }
    expect(blankLine).toBeGreaterThan(0);

    const items = await client.completion(URI, blankLine, 2);
    const labels = items.map((c) => c.label);
    expect(labels).toContain("state");
    expect(labels).toContain("computed");
    expect(labels).toContain("action");
  });

  // -----------------------------------------------------------
  // 5. Hover builtin function — gt
  // -----------------------------------------------------------
  it("should hover builtin function", async () => {
    // Hover over "gt" in: computed hasBookmarks = gt(totalBookmarks, 0)
    const pos = posOf(BEGINNER_BOOKMARK_MEL, "gt(");
    const result = await client.hover(URI, pos.line, pos.character);
    expect(result).not.toBeNull();
    expect(result!.contents.value.toLowerCase()).toContain("boolean");
  });

  // -----------------------------------------------------------
  // 6. Hover state field — totalBookmarks
  // -----------------------------------------------------------
  it("should hover state field", async () => {
    // Hover over "totalBookmarks" in the computed hasBookmarks line (1st ref in expression)
    const pos = posOf(BEGINNER_BOOKMARK_MEL, "totalBookmarks", 1); // 2nd occurrence — in computed
    const result = await client.hover(URI, pos.line, pos.character);
    expect(result).not.toBeNull();
    const text = result!.contents.value.toLowerCase();
    expect(text).toContain("state");
    expect(text).toContain("number");
  });

  // -----------------------------------------------------------
  // 7. Signature help inside add()
  // -----------------------------------------------------------
  it("should show signature help", async () => {
    // Position right after the opening paren of add(
    const pos = posOf(BEGINNER_BOOKMARK_MEL, "add(totalBookmarks");
    // Move character past the "(" — we want to be inside the call
    const result = await client.signatureHelp(URI, pos.line, pos.character + 4);
    expect(result).not.toBeNull();
    expect(result!.signatures.length).toBeGreaterThan(0);
    expect(result!.signatures[0].label.toLowerCase()).toContain("add");
    expect(result!.activeParameter).toBe(0);
  });

  // -----------------------------------------------------------
  // 8. Document symbols
  // -----------------------------------------------------------
  it("should return document symbols", async () => {
    const symbols = await client.documentSymbol(URI);
    expect(symbols.length).toBeGreaterThan(0);

    // Top-level domain symbol
    const domain = symbols.find((s) => s.name === "BookmarkManager");
    expect(domain).toBeDefined();
    expect(domain!.children).toBeDefined();

    const childNames = domain!.children!.map((c) => c.name);

    // state block
    expect(childNames.some((n) => /state/i.test(n))).toBe(true);

    // computed fields
    expect(childNames).toContain("hasBookmarks");
    expect(childNames).toContain("displayCount");

    // actions (symbol names include params, e.g. "addBookmark(title)")
    expect(childNames.some((n) => n.startsWith("addBookmark"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("toggleFavorite"))).toBe(true);
    expect(childNames.some((n) => n.startsWith("reset"))).toBe(true);
  });

  // -----------------------------------------------------------
  // 9. Go-to-definition: computed → state field
  // -----------------------------------------------------------
  it("should go to definition from computed to state", async () => {
    // "totalBookmarks" in computed hasBookmarks line (2nd occurrence overall, 1st in expression)
    const refPos = posOf(BEGINNER_BOOKMARK_MEL, "totalBookmarks", 1);
    const loc = await client.definition(URI, refPos.line, refPos.character);
    expect(loc).not.toBeNull();

    // Should point back to the state declaration of totalBookmarks (1st occurrence)
    const defPos = posOf(BEGINNER_BOOKMARK_MEL, "totalBookmarks", 0);
    expect(loc!.range.start.line).toBe(defPos.line);
  });

  // -----------------------------------------------------------
  // 10. Error diagnostics for broken MEL
  // -----------------------------------------------------------
  it("should show error diagnostics for broken MEL", async () => {
    const { diagnostics } = await client.openDocument(
      BROKEN_URI,
      BEGINNER_BROKEN_MEL
    );
    const errors = diagnostics.filter((d: Diag) => d.severity === 1);
    expect(errors.length).toBeGreaterThan(0);

    const unknownFnError = errors.find(
      (d) => d.code === "E_UNKNOWN_FN" || d.message.toLowerCase().includes("unknown")
    );
    expect(unknownFnError).toBeDefined();
  });
});
