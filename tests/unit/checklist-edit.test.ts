import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';

describe('editChecklistItem', () => {
  let store: InMemoryNoteStore;
  let noteId: string;

  beforeEach(() => {
    store = new InMemoryNoteStore();
    const note = store.create('My checklist');
    noteId = note.id;
    store.addChecklistItem(noteId, 'Buy milk');
    store.addChecklistItem(noteId, 'Walk the dog');
  });

  it('changes the text of a valid checklist item', () => {
    const updated = store.editChecklistItem(noteId, 0, 'Buy oat milk');
    expect(updated.checklistItems![0].text).toBe('Buy oat milk');
  });

  it('preserves the done status when editing text', () => {
    store.toggleChecklistItem(noteId, 1);
    const updated = store.editChecklistItem(noteId, 1, 'Feed the cat');
    expect(updated.checklistItems![1].text).toBe('Feed the cat');
    expect(updated.checklistItems![1].done).toBe(true);
  });

  it('throws for an out-of-bounds index', () => {
    expect(() => store.editChecklistItem(noteId, 99, 'Nope')).toThrow(
      'Checklist item index out of bounds: 99'
    );
  });

  it('throws for a negative index', () => {
    expect(() => store.editChecklistItem(noteId, -1, 'Nope')).toThrow(
      'Checklist item index out of bounds: -1'
    );
  });

  it('throws when the note has no checklist items', () => {
    const plainNote = store.create('plain note');
    expect(() => store.editChecklistItem(plainNote.id, 0, 'Nope')).toThrow(
      'Checklist item index out of bounds: 0'
    );
  });

  it('throws when the note does not exist', () => {
    expect(() => store.editChecklistItem('nonexistent', 0, 'Nope')).toThrow(
      'Note not found: nonexistent'
    );
  });

  it('updates the updatedAt timestamp', () => {
    const before = store.getById(noteId)!.updatedAt;
    const updated = store.editChecklistItem(noteId, 0, 'New text');
    expect(updated.updatedAt >= before).toBe(true);
  });
});
