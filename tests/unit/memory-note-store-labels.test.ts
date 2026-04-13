import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';

describe('InMemoryNoteStore - Labels', () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  describe('addLabel', () => {
    it('adds a label to a note', async () => {
      const note = store.create('test content');
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamp
      const updated = store.addLabel(note.id, 'important');
      expect(updated.labels).toContain('important');
      expect(updated.updatedAt >= note.updatedAt).toBe(true);
    });

    it('does not duplicate existing labels', () => {
      const note = store.create('test content');
      store.addLabel(note.id, 'important');
      const updated = store.addLabel(note.id, 'important');
      expect(updated.labels).toEqual(['important']);
    });

    it('throws error for non-existent note', () => {
      expect(() => store.addLabel('non-existent', 'label')).toThrow('Note not found');
    });
  });

  describe('removeLabel', () => {
    it('removes a label from a note', async () => {
      const note = store.create('test content');
      await new Promise(resolve => setTimeout(resolve, 1));
      store.addLabel(note.id, 'important');
      store.addLabel(note.id, 'urgent');
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = store.removeLabel(note.id, 'important');
      expect(updated.labels).toEqual(['urgent']);
      expect(updated.updatedAt >= note.updatedAt).toBe(true);
    });

    it('does nothing if label does not exist', () => {
      const note = store.create('test content');
      const updated = store.removeLabel(note.id, 'non-existent');
      expect(updated.labels).toEqual([]);
    });

    it('throws error for non-existent note', () => {
      expect(() => store.removeLabel('non-existent', 'label')).toThrow('Note not found');
    });
  });

  describe('list with label filter', () => {
    it('filters notes by label', () => {
      const note1 = store.create('first note');
      const note2 = store.create('second note');
      const note3 = store.create('third note');
      
      store.addLabel(note1.id, 'work');
      store.addLabel(note2.id, 'personal');
      store.addLabel(note3.id, 'work');

      const workNotes = store.list({ label: 'work' });
      expect(workNotes).toHaveLength(2);
      expect(workNotes.map(n => n.id)).toContain(note1.id);
      expect(workNotes.map(n => n.id)).toContain(note3.id);

      const personalNotes = store.list({ label: 'personal' });
      expect(personalNotes).toHaveLength(1);
      expect(personalNotes[0].id).toBe(note2.id);
    });

    it('returns empty array when no notes match label', () => {
      store.create('test note');
      const result = store.list({ label: 'non-existent' });
      expect(result).toEqual([]);
    });

    it('combines label filter with other filters', () => {
      const note1 = store.create('first important note');
      const note2 = store.create('second note with different content');
      
      store.addLabel(note1.id, 'important');
      store.addLabel(note2.id, 'important');

      const result = store.list({ label: 'important', search: 'first' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(note1.id);
    });
  });
});