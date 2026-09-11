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
  it('inserts the snippet directly when the doc is empty', () => {
    const result = buildInsertion('', 0, 'play(C4);');
    expect(result.from).toBe(0);
    expect(result.to).toBe(0);
    expect(result.insert).toBe('play(C4);');
    expect(result.cursor).toBe('play(C4);'.length);
  });

  it('treats whitespace-only docs the same as empty', () => {
    const result = buildInsertion('   \n  ', 3, 'play(C4);');
    expect(result.from).toBe(0);
    expect(result.to).toBe(6);
    expect(result.insert).toBe('play(C4);');
    expect(result.cursor).toBe('play(C4);'.length);
  });

  it('inserts multi-line snippets without indentation when doc is empty', () => {
    const result = buildInsertion('', 0, 'a();\nb();');
    expect(result.insert).toBe('a();\nb();');
  });

  it('inserts at the cursor position without touching existing code', () => {
    const doc = 'play(C4);';
    const cursorPos = doc.length;
    const result = buildInsertion(doc, cursorPos, 'guitar.play(E3);');
    expect(result.from).toBe(cursorPos);
    expect(result.to).toBe(cursorPos);
    expect(result.insert).toBe('\nguitar.play(E3);\n');

    const next =
      doc.slice(0, result.from) + result.insert + doc.slice(result.to);
    expect(next).toBe('play(C4);\nguitar.play(E3);\n');
  });

  it('clamps an out-of-range cursor into the document bounds', () => {
    const result = buildInsertion('abc', 999, 'x();');
    expect(result.from).toBe(3);
    expect(result.to).toBe(3);
    expect(result.insert).toBe('\nx();\n');
  });

  it('allows clicking a snippet when editor already has content', () => {
    const first = buildInsertion('', 0, 'play(C4);');
    const docAfterFirst = first.insert;
    const second = buildInsertion(docAfterFirst, first.cursor, 'guitar.play(E3);');
    const docAfterSecond =
      docAfterFirst.slice(0, second.from) +
      second.insert +
      docAfterFirst.slice(second.to);
    expect(docAfterSecond).toContain('play(C4);');
    expect(docAfterSecond).toContain('guitar.play(E3);');
  });
});
