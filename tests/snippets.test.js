import { describe, it, expect } from 'vitest';
import { SNIPPET_CATEGORIES, buildInsertion } from '../src/core/snippets.js';

describe('SNIPPET_CATEGORIES', () => {
  it('every category has a non-empty title and items', () => {
    for (const category of SNIPPET_CATEGORIES) {
      expect(category.id).toBeTruthy();
      expect(category.title).toBeTruthy();
      expect(Array.isArray(category.items)).toBe(true);
      expect(category.items.length).toBeGreaterThan(0);
    }
  });

  it('every item has a label, description, and runnable code string', () => {
    for (const category of SNIPPET_CATEGORIES) {
      for (const item of category.items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(typeof item.code).toBe('string');
        expect(item.code.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('has no duplicate item ids across the whole catalog', () => {
    const ids = SNIPPET_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildInsertion', () => {
  it('wraps the snippet in a runnable sketch when the doc is empty', () => {
    const result = buildInsertion('', 0, 'play(C4);');
    expect(result.from).toBe(0);
    expect(result.to).toBe(0);
    expect(result.insert).toBe('function f() {\n  play(C4);\n}\nlpRun(f);\n');
    // cursor lands right after the inserted code, still inside the function body
    expect(result.insert.slice(0, result.cursor)).toBe(
      'function f() {\n  play(C4);\n'
    );
  });

  it('treats whitespace-only docs the same as empty', () => {
    const result = buildInsertion('   \n  ', 3, 'play(C4);');
    expect(result.to).toBe(6);
    expect(result.insert.startsWith('function f() {\n')).toBe(true);
  });

  it('indents multi-line snippets consistently', () => {
    const result = buildInsertion('', 0, 'a();\nb();');
    expect(result.insert).toBe('function f() {\n  a();\n  b();\n}\nlpRun(f);\n');
  });

  it('inserts at the cursor position without touching existing code', () => {
    const doc = 'function f() {\n  \n}\nlpRun(f);\n';
    const cursorPos = doc.indexOf('  \n') + 2; // inside the empty body
    const result = buildInsertion(doc, cursorPos, 'play(C4);');
    expect(result.from).toBe(cursorPos);
    expect(result.to).toBe(cursorPos);
    expect(result.insert).toBe('\n  play(C4);\n');

    const next =
      doc.slice(0, result.from) + result.insert + doc.slice(result.to);
    expect(next).toContain('play(C4);');
    expect(next.startsWith('function f() {')).toBe(true);
  });

  it('clamps an out-of-range cursor into the document bounds', () => {
    const result = buildInsertion('abc', 999, 'x();');
    expect(result.from).toBe(3);
    expect(result.to).toBe(3);
  });
});
