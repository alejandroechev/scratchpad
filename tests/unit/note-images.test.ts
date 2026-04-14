import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';
import { createNote } from '../../src/domain/models/note';
import type { NoteImage } from '../../src/domain/models/note';
import { migrateDoc } from '../../src/infra/automerge/schema';
import type { ScratchPadDoc } from '../../src/infra/automerge/schema';

function makeImage(overrides: Partial<NoteImage> = {}): NoteImage {
  return {
    blobId: overrides.blobId ?? 'abc123def456',
    fileName: overrides.fileName ?? 'photo.png',
    sizeBytes: overrides.sizeBytes ?? 1024,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

describe('NoteImage model', () => {
  it('createNote initializes images as empty array', () => {
    const note = createNote('n1', 'hello');
    expect(note.images).toEqual([]);
  });
});

describe('InMemoryNoteStore image operations', () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  describe('addImage', () => {
    it('adds an image to a note', () => {
      const note = store.create('test note');
      const image = makeImage();
      const updated = store.addImage(note.id, image);
      expect(updated.images).toHaveLength(1);
      expect(updated.images![0].blobId).toBe('abc123def456');
      expect(updated.images![0].fileName).toBe('photo.png');
    });

    it('adds multiple images to a note', () => {
      const note = store.create('test');
      store.addImage(note.id, makeImage({ blobId: 'blob1' }));
      const updated = store.addImage(note.id, makeImage({ blobId: 'blob2' }));
      expect(updated.images).toHaveLength(2);
    });

    it('updates updatedAt timestamp', () => {
      const note = store.create('test');
      const updated = store.addImage(note.id, makeImage());
      expect(updated.updatedAt >= note.updatedAt).toBe(true);
    });

    it('throws for non-existent note', () => {
      expect(() => store.addImage('nope', makeImage())).toThrow('Note not found');
    });

    it('returns a defensive copy', () => {
      const note = store.create('test');
      const result = store.addImage(note.id, makeImage());
      result.images!.push(makeImage({ blobId: 'extra' }));
      const fresh = store.getById(note.id);
      expect(fresh!.images).toHaveLength(1);
    });
  });

  describe('removeImage', () => {
    it('removes an image by blobId', () => {
      const note = store.create('test');
      store.addImage(note.id, makeImage({ blobId: 'keep' }));
      store.addImage(note.id, makeImage({ blobId: 'remove-me' }));
      const updated = store.removeImage(note.id, 'remove-me');
      expect(updated.images).toHaveLength(1);
      expect(updated.images![0].blobId).toBe('keep');
    });

    it('updates updatedAt timestamp', () => {
      const note = store.create('test');
      const added = store.addImage(note.id, makeImage());
      const removed = store.removeImage(note.id, added.images![0].blobId);
      expect(removed.updatedAt >= added.updatedAt).toBe(true);
    });

    it('throws for non-existent note', () => {
      expect(() => store.removeImage('nope', 'any')).toThrow('Note not found');
    });

    it('throws for non-existent image', () => {
      const note = store.create('test');
      expect(() => store.removeImage(note.id, 'nope')).toThrow('Image not found');
    });
  });
});

describe('Schema migration v1→v2', () => {
  it('adds images[] to notes without it', () => {
    const doc: ScratchPadDoc = {
      schemaVersion: 1,
      notes: {
        n1: { id: 'n1', content: 'old', createdAt: '', updatedAt: '', archived: false },
        n2: { id: 'n2', content: 'also old', createdAt: '', updatedAt: '', archived: false },
      },
    };
    migrateDoc(doc);
    expect(doc.schemaVersion).toBe(4);
    expect(doc.notes.n1.images).toEqual([]);
    expect(doc.notes.n2.images).toEqual([]);
    expect(doc.notes.n1.labels).toEqual([]);
    expect(doc.notes.n2.labels).toEqual([]);
    expect(doc.notes.n1.isTask).toBe(false);
    expect(doc.notes.n2.isTask).toBe(false);
  });

  it('does not overwrite existing images', () => {
    const img = makeImage();
    const doc: ScratchPadDoc = {
      schemaVersion: 1,
      notes: {
        n1: { id: 'n1', content: 'has img', images: [img], createdAt: '', updatedAt: '', archived: false },
      },
    };
    migrateDoc(doc);
    expect(doc.notes.n1.images).toHaveLength(1);
    expect(doc.notes.n1.images![0].blobId).toBe(img.blobId);
  });

  it('is idempotent — skips if already at current version', () => {
    const doc: ScratchPadDoc = {
      schemaVersion: 4,
      notes: {
        n1: { id: 'n1', content: 'ok', images: [], labels: [], isTask: false, taskDone: false, createdAt: '', updatedAt: '', archived: false },
      },
    };
    migrateDoc(doc);
    expect(doc.schemaVersion).toBe(4);
  });

  it('migrates v2→v3: adds labels[] to notes without it', () => {
    const img = makeImage();
    const doc: ScratchPadDoc = {
      schemaVersion: 2,
      notes: {
        n1: { id: 'n1', content: 'has image', images: [img], createdAt: '', updatedAt: '', archived: false },
        n2: { id: 'n2', content: 'no image', images: [], createdAt: '', updatedAt: '', archived: false },
      },
    };
    migrateDoc(doc);
    expect(doc.schemaVersion).toBe(4);
    expect(doc.notes.n1.labels).toEqual([]);
    expect(doc.notes.n2.labels).toEqual([]);
    expect(doc.notes.n1.images).toEqual([img]); // preserved
    expect(doc.notes.n2.images).toEqual([]);
  });
});
