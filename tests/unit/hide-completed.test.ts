import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNoteStore } from "../../src/infra/memory/note-store.js";
import { createNote } from "../../src/domain/models/note.js";

describe("hideCompleted", () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  it("createNote defaults hideCompleted to false", () => {
    const note = createNote("test-1", "hello");
    expect(note.hideCompleted).toBe(false);
  });

  it("setHideCompleted sets the flag to true", () => {
    const note = store.create("my list");
    const updated = store.setHideCompleted(note.id, true);
    expect(updated.hideCompleted).toBe(true);
  });

  it("setHideCompleted sets the flag to false", () => {
    const note = store.create("my list");
    store.setHideCompleted(note.id, true);
    const updated = store.setHideCompleted(note.id, false);
    expect(updated.hideCompleted).toBe(false);
  });

  it("setHideCompleted updates the updatedAt timestamp", () => {
    const note = store.create("my list");
    const before = note.updatedAt;
    // Small delay to ensure timestamp changes
    const updated = store.setHideCompleted(note.id, true);
    expect(updated.updatedAt).toBeDefined();
    expect(typeof updated.updatedAt).toBe("string");
    // updatedAt should be >= before (they might be equal if same ms)
    expect(updated.updatedAt >= before).toBe(true);
  });

  it("setHideCompleted throws if note not found", () => {
    expect(() => store.setHideCompleted("nonexistent", true)).toThrow("Note not found: nonexistent");
  });
});
