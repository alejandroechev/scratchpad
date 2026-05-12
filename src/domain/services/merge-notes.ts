import type { Note } from "../models/note.js";

export interface MergeResult {
  content: string;
  images: Note["images"];
  labels: string[];
  checklistItems: Note["checklistItems"];
}

/**
 * Pure merge logic — operates on plain JS objects only.
 * Merges content, images, labels, and checklistItems from sources into target.
 * Does NOT mutate inputs — returns a new MergeResult.
 */
export function mergeNotesData(
  target: Readonly<Note>,
  sources: ReadonlyArray<Readonly<Note>>
): MergeResult {
  let content = target.content;
  const images = [...(target.images ?? [])].map(i => ({
    blobId: i.blobId,
    fileName: i.fileName,
    sizeBytes: i.sizeBytes,
    createdAt: i.createdAt,
  }));
  const labels = [...(target.labels ?? [])];
  const checklistItems = (target.checklistItems ?? []).map(i => ({
    text: i.text,
    done: i.done,
  }));

  // Sort sources by updatedAt descending (newest first)
  const sorted = [...sources].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  for (const source of sorted) {
    // Merge content
    if (source.content) {
      content = content ? content + "\n---\n" + source.content : source.content;
    }

    // Merge images
    if (source.images?.length) {
      for (const img of source.images) {
        images.push({
          blobId: img.blobId,
          fileName: img.fileName,
          sizeBytes: img.sizeBytes,
          createdAt: img.createdAt,
        });
      }
    }

    // Merge labels (deduplicate)
    if (source.labels?.length) {
      const existing = new Set(labels);
      for (const label of source.labels) {
        if (!existing.has(label)) {
          labels.push(label);
          existing.add(label);
        }
      }
    }

    // Merge checklist items
    if (source.checklistItems?.length) {
      for (const item of source.checklistItems) {
        checklistItems.push({ text: item.text, done: item.done });
      }
    }
  }

  return { content, images, labels, checklistItems };
}
