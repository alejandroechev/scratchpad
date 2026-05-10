import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNoteStore } from "../../src/infra/memory/note-store.js";

describe("mergeNotes", () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  it("merges content from source into target with separator", () => {
    const target = store.create("Target content");
    const source = store.create("Source content");
    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.content).toBe("Target content\n---\nSource content");
  });

  it("orders source content by updatedAt descending (newest first)", async () => {
    const target = store.create("Target");
    const s1 = store.create("Oldest");
    // Force different updatedAt values
    const s2 = store.create("Middle");
    const s3 = store.create("Newest");

    // Manually set updatedAt to control ordering
    // Access internal state via getById + update workaround
    store.update(s1.id, "Oldest");
    // Wait to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    store.update(s2.id, "Middle");
    await new Promise((r) => setTimeout(r, 10));
    store.update(s3.id, "Newest");

    const result = store.mergeNotes(target.id, [s1.id, s2.id, s3.id]);
    // Newest first, then middle, then oldest
    expect(result.content).toBe("Target\n---\nNewest\n---\nMiddle\n---\nOldest");
  });

  it("concatenates images from sources", () => {
    const target = store.create("Target");
    store.addImage(target.id, { blobId: "img1", fileName: "a.png", sizeBytes: 100, createdAt: new Date().toISOString() });

    const source = store.create("Source");
    store.addImage(source.id, { blobId: "img2", fileName: "b.png", sizeBytes: 200, createdAt: new Date().toISOString() });

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.images).toHaveLength(2);
    expect(result.images!.map(i => i.blobId)).toEqual(["img1", "img2"]);
  });

  it("deduplicates labels during merge", () => {
    const target = store.create("Target");
    store.addLabel(target.id, "work");
    store.addLabel(target.id, "important");

    const source = store.create("Source");
    store.addLabel(source.id, "important"); // duplicate
    store.addLabel(source.id, "personal"); // new

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.labels).toEqual(["work", "important", "personal"]);
  });

  it("archives all source notes", () => {
    const target = store.create("Target");
    const s1 = store.create("Source 1");
    const s2 = store.create("Source 2");

    store.mergeNotes(target.id, [s1.id, s2.id]);

    const archived1 = store.getById(s1.id);
    const archived2 = store.getById(s2.id);
    expect(archived1!.archived).toBe(true);
    expect(archived2!.archived).toBe(true);
  });

  it("updates target updatedAt", async () => {
    const target = store.create("Target");
    const originalUpdatedAt = target.updatedAt;

    await new Promise((r) => setTimeout(r, 10));
    const source = store.create("Source");
    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.updatedAt >= originalUpdatedAt).toBe(true);
    // The merge should produce a new timestamp
    expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());
  });

  it("throws if target note not found", () => {
    const source = store.create("Source");
    expect(() => store.mergeNotes("nonexistent", [source.id])).toThrow("Note not found: nonexistent");
  });

  it("throws if source note not found", () => {
    const target = store.create("Target");
    expect(() => store.mergeNotes(target.id, ["nonexistent"])).toThrow("Note not found: nonexistent");
  });

  it("handles source with empty content gracefully", () => {
    const target = store.create("Target content");
    const source = store.create("");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.content).toBe("Target content");
  });

  it("target not archived after merge", () => {
    const target = store.create("Target");
    const source = store.create("Source");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.archived).toBe(false);
  });

  it("merges checklist items from both notes", () => {
    const target = store.create("Target");
    store.addChecklistItem(target.id, "Buy milk");
    store.addChecklistItem(target.id, "Buy eggs");

    const source = store.create("Source");
    store.addChecklistItem(source.id, "Call dentist");
    store.addChecklistItem(source.id, "Fix bike");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.checklistItems).toHaveLength(4);
    expect(result.checklistItems!.map(i => i.text)).toEqual([
      "Buy milk", "Buy eggs", "Call dentist", "Fix bike",
    ]);
  });

  it("creates checklist on target when merging checklist into plain note", () => {
    const target = store.create("Plain target");
    const source = store.create("Source");
    store.addChecklistItem(source.id, "Task A");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.checklistItems).toHaveLength(1);
    expect(result.checklistItems![0].text).toBe("Task A");
  });

  it("preserves existing checklist when merging plain note into checklist note", () => {
    const target = store.create("Target");
    store.addChecklistItem(target.id, "Existing item");

    const source = store.create("Plain source");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.checklistItems).toHaveLength(1);
    expect(result.checklistItems![0].text).toBe("Existing item");
  });

  it("preserves done/undone status of checklist items after merge", () => {
    const target = store.create("Target");
    store.addChecklistItem(target.id, "Done item");
    store.toggleChecklistItem(target.id, 0);

    const source = store.create("Source");
    store.addChecklistItem(source.id, "Undone item");

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.checklistItems).toHaveLength(2);
    expect(result.checklistItems![0]).toEqual({ text: "Done item", done: true });
    expect(result.checklistItems![1]).toEqual({ text: "Undone item", done: false });
  });

  it("merges two list notes keeping all items from both", () => {
    const target = store.create("Shopping");
    store.addChecklistItem(target.id, "Milk");
    store.addChecklistItem(target.id, "Eggs");
    store.toggleChecklistItem(target.id, 0);

    const source = store.create("Errands");
    store.addChecklistItem(source.id, "Dentist");
    store.addChecklistItem(source.id, "Bike repair");
    store.toggleChecklistItem(source.id, 1);

    const result = store.mergeNotes(target.id, [source.id]);
    expect(result.content).toBe("Shopping\n---\nErrands");
    expect(result.checklistItems).toHaveLength(4);
    expect(result.checklistItems!.map(i => i.text)).toEqual([
      "Milk", "Eggs", "Dentist", "Bike repair",
    ]);
    expect(result.checklistItems!.map(i => i.done)).toEqual([
      true, false, false, true,
    ]);
  });
});

describe("addChecklistItem for Lista button", () => {
  it("creates a checklist note recognized by UI when adding empty item", () => {
    const store = new InMemoryNoteStore();
    const note = store.create("");
    const result = store.addChecklistItem(note.id, "");
    expect(result.checklistItems).toHaveLength(1);
    expect(result.checklistItems![0]).toEqual({ text: "", done: false });
    // UI check: (checklistItems ?? []).length > 0
    expect((result.checklistItems ?? []).length > 0).toBe(true);
  });
});
