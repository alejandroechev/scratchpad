import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';

describe('InMemoryNoteStore', () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  describe('create', () => {
    it('creates a note and returns it with an id', () => {
      const note = store.create('hello world');
      expect(note.id).toBeTruthy();
      expect(note.content).toBe('hello world');
      expect(note.archived).toBe(false);
    });
  });

  describe('getById', () => {
    it('returns the note by id', () => {
      const created = store.create('test');
      const found = store.getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.content).toBe('test');
    });

    it('returns null for non-existent id', () => {
      expect(store.getById('nope')).toBeNull();
    });
  });

  describe('list', () => {
    it('returns notes newest first, excluding archived by default', () => {
      const a = store.create('first');
      const b = store.create('second');
      store.archive(a.id);
      const result = store.list();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(b.id);
    });

    it('includes archived notes when filter set', () => {
      store.create('one');
      const archived = store.create('two');
      store.archive(archived.id);
      const result = store.list({ includeArchived: true });
      expect(result).toHaveLength(2);
    });

    it('filters by search text (case-insensitive)', () => {
      store.create('Buy groceries');
      store.create('Read about TypeScript');
      store.create('grocery list');
      const result = store.list({ search: 'grocer' });
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates note content and updatedAt', () => {
      const note = store.create('original');
      const updated = store.update(note.id, 'changed');
      expect(updated.content).toBe('changed');
      expect(updated.updatedAt >= note.updatedAt).toBe(true);
    });

    it('throws for non-existent id', () => {
      expect(() => store.update('nope', 'x')).toThrow('Note not found');
    });
  });

  describe('archive', () => {
    it('sets archived to true', () => {
      const note = store.create('test');
      const archived = store.archive(note.id);
      expect(archived.archived).toBe(true);
    });

    it('throws for non-existent id', () => {
      expect(() => store.archive('nope')).toThrow('Note not found');
    });
  });

  describe('delete', () => {
    it('removes the note', () => {
      const note = store.create('test');
      store.delete(note.id);
      expect(store.getById(note.id)).toBeNull();
    });

    it('throws for non-existent id', () => {
      expect(() => store.delete('nope')).toThrow('Note not found');
    });
  });
});
