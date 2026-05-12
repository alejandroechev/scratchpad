import { describe, it, expect } from "vitest";
import { mergeNotesData } from "../../src/domain/services/merge-notes.js";
import { createNote } from "../../src/domain/models/note.js";
import type { Note } from "../../src/domain/models/note.js";

function noteWithTimestamp(id: string, content: string, updatedAt: string): Note {
  const note = createNote(id, content);
  note.updatedAt = updatedAt;
  return note;
}

describe("mergeNotesData", () => {
  it("merges content with separator", () => {
    const target = createNote("t", "Target");
    const source = createNote("s", "Source");
    const result = mergeNotesData(target, [source]);
    expect(result.content).toBe("Target\n---\nSource");
  });

  it("empty source content doesn't add separator", () => {
    const target = createNote("t", "Target");
    const source = createNote("s", "");
    const result = mergeNotesData(target, [source]);
    expect(result.content).toBe("Target");
  });

  it("empty target content gets source content", () => {
    const target = createNote("t", "");
    const source = createNote("s", "Source");
    const result = mergeNotesData(target, [source]);
    expect(result.content).toBe("Source");
  });

  it("both empty content stays empty", () => {
    const target = createNote("t", "");
    const source = createNote("s", "");
    const result = mergeNotesData(target, [source]);
    expect(result.content).toBe("");
  });

  it("merges images from both", () => {
    const target = createNote("t", "T");
    target.images = [{ blobId: "img1", fileName: "a.png", sizeBytes: 100, createdAt: "2024-01-01" }];
    const source = createNote("s", "S");
    source.images = [{ blobId: "img2", fileName: "b.png", sizeBytes: 200, createdAt: "2024-01-02" }];

    const result = mergeNotesData(target, [source]);
    expect(result.images).toHaveLength(2);
    expect(result.images!.map(i => i.blobId)).toEqual(["img1", "img2"]);
  });

  it("target with no images gets source images", () => {
    const target = createNote("t", "T");
    target.images = [];
    const source = createNote("s", "S");
    source.images = [{ blobId: "img1", fileName: "a.png", sizeBytes: 100, createdAt: "2024-01-01" }];

    const result = mergeNotesData(target, [source]);
    expect(result.images).toHaveLength(1);
    expect(result.images![0].blobId).toBe("img1");
  });

  it("deduplicates labels", () => {
    const target = createNote("t", "T");
    target.labels = ["work", "important"];
    const source = createNote("s", "S");
    source.labels = ["important", "personal"];

    const result = mergeNotesData(target, [source]);
    expect(result.labels).toEqual(["work", "important", "personal"]);
  });

  it("merges checklist items from both notes", () => {
    const target = createNote("t", "T");
    target.checklistItems = [
      { text: "Buy milk", done: false },
      { text: "Buy eggs", done: false },
    ];
    const source = createNote("s", "S");
    source.checklistItems = [
      { text: "Call dentist", done: false },
      { text: "Fix bike", done: false },
    ];

    const result = mergeNotesData(target, [source]);
    expect(result.checklistItems).toHaveLength(4);
    expect(result.checklistItems!.map(i => i.text)).toEqual([
      "Buy milk", "Buy eggs", "Call dentist", "Fix bike",
    ]);
  });

  it("checklist items preserve done/undone status", () => {
    const target = createNote("t", "T");
    target.checklistItems = [{ text: "Done item", done: true }];
    const source = createNote("s", "S");
    source.checklistItems = [{ text: "Undone item", done: false }];

    const result = mergeNotesData(target, [source]);
    expect(result.checklistItems![0]).toEqual({ text: "Done item", done: true });
    expect(result.checklistItems![1]).toEqual({ text: "Undone item", done: false });
  });

  it("source with checklist + target without creates checklist on target", () => {
    const target = createNote("t", "T");
    target.checklistItems = [];
    const source = createNote("s", "S");
    source.checklistItems = [{ text: "Task A", done: false }];

    const result = mergeNotesData(target, [source]);
    expect(result.checklistItems).toHaveLength(1);
    expect(result.checklistItems![0].text).toBe("Task A");
  });

  it("target with checklist + source without preserves target checklist", () => {
    const target = createNote("t", "T");
    target.checklistItems = [{ text: "Existing", done: true }];
    const source = createNote("s", "S");
    source.checklistItems = [];

    const result = mergeNotesData(target, [source]);
    expect(result.checklistItems).toHaveLength(1);
    expect(result.checklistItems![0]).toEqual({ text: "Existing", done: true });
  });

  it("multiple sources merged in order (newest first)", () => {
    const target = noteWithTimestamp("t", "Target", "2024-01-01T00:00:00Z");
    const oldest = noteWithTimestamp("s1", "Oldest", "2024-01-02T00:00:00Z");
    const middle = noteWithTimestamp("s2", "Middle", "2024-01-03T00:00:00Z");
    const newest = noteWithTimestamp("s3", "Newest", "2024-01-04T00:00:00Z");

    const result = mergeNotesData(target, [oldest, middle, newest]);
    expect(result.content).toBe("Target\n---\nNewest\n---\nMiddle\n---\nOldest");
  });

  it("three-way merge: target + 2 sources with checklists", () => {
    const target = noteWithTimestamp("t", "Target", "2024-01-01T00:00:00Z");
    target.checklistItems = [{ text: "T1", done: false }];

    const s1 = noteWithTimestamp("s1", "S1", "2024-01-03T00:00:00Z");
    s1.checklistItems = [{ text: "S1-A", done: true }];

    const s2 = noteWithTimestamp("s2", "S2", "2024-01-02T00:00:00Z");
    s2.checklistItems = [{ text: "S2-A", done: false }, { text: "S2-B", done: true }];

    const result = mergeNotesData(target, [s1, s2]);
    // Sources sorted newest first: s1 then s2
    expect(result.content).toBe("Target\n---\nS1\n---\nS2");
    expect(result.checklistItems).toHaveLength(4);
    expect(result.checklistItems!.map(i => i.text)).toEqual(["T1", "S1-A", "S2-A", "S2-B"]);
    expect(result.checklistItems!.map(i => i.done)).toEqual([false, true, false, true]);
  });

  it("doesn't mutate input objects (immutability check)", () => {
    const target = createNote("t", "Target");
    target.images = [{ blobId: "img1", fileName: "a.png", sizeBytes: 100, createdAt: "2024-01-01" }];
    target.labels = ["work"];
    target.checklistItems = [{ text: "T1", done: false }];

    const source = createNote("s", "Source");
    source.images = [{ blobId: "img2", fileName: "b.png", sizeBytes: 200, createdAt: "2024-01-02" }];
    source.labels = ["personal"];
    source.checklistItems = [{ text: "S1", done: true }];

    // Snapshot original state
    const targetContentBefore = target.content;
    const targetImagesLenBefore = target.images.length;
    const targetLabelsLenBefore = target.labels.length;
    const targetChecklistLenBefore = target.checklistItems.length;
    const sourceContentBefore = source.content;
    const sourceImagesLenBefore = source.images.length;
    const sourceLabelsLenBefore = source.labels.length;
    const sourceChecklistLenBefore = source.checklistItems.length;

    mergeNotesData(target, [source]);

    // Verify no mutation
    expect(target.content).toBe(targetContentBefore);
    expect(target.images).toHaveLength(targetImagesLenBefore);
    expect(target.labels).toHaveLength(targetLabelsLenBefore);
    expect(target.checklistItems).toHaveLength(targetChecklistLenBefore);
    expect(source.content).toBe(sourceContentBefore);
    expect(source.images).toHaveLength(sourceImagesLenBefore);
    expect(source.labels).toHaveLength(sourceLabelsLenBefore);
    expect(source.checklistItems).toHaveLength(sourceChecklistLenBefore);
  });
});
