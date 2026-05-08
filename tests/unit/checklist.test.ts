import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';

describe('Checklist', () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  describe('convertToChecklist', () => {
    it('splits content lines into checklist items', () => {
      const note = store.create('Buy milk\nBuy eggs\nBuy bread');
      const result = store.convertToChecklist(note.id);
      expect(result.checklistItems).toHaveLength(3);
      expect(result.checklistItems![0]).toEqual({ text: 'Buy milk', done: false });
      expect(result.checklistItems![1]).toEqual({ text: 'Buy eggs', done: false });
      expect(result.checklistItems![2]).toEqual({ text: 'Buy bread', done: false });
    });

    it('clears content after conversion', () => {
      const note = store.create('Buy milk\nBuy eggs');
      const result = store.convertToChecklist(note.id);
      expect(result.content).toBe('');
    });

    it('skips empty lines', () => {
      const note = store.create('Buy milk\n\n\nBuy eggs\n');
      const result = store.convertToChecklist(note.id);
      expect(result.checklistItems).toHaveLength(2);
      expect(result.checklistItems![0].text).toBe('Buy milk');
      expect(result.checklistItems![1].text).toBe('Buy eggs');
    });

    it('does nothing if already has checklist items', () => {
      const note = store.create('Original content');
      store.convertToChecklist(note.id);
      // Convert again — should not overwrite existing items
      const result = store.convertToChecklist(note.id);
      expect(result.checklistItems).toHaveLength(1);
      expect(result.checklistItems![0].text).toBe('Original content');
      expect(result.content).toBe('');
    });

    it('throws for non-existent note', () => {
      expect(() => store.convertToChecklist('nope')).toThrow('Note not found');
    });
  });

  describe('toggleChecklistItem', () => {
    it('toggles item done status', () => {
      const note = store.create('Item A\nItem B');
      store.convertToChecklist(note.id);

      const toggled = store.toggleChecklistItem(note.id, 0);
      expect(toggled.checklistItems![0].done).toBe(true);
      expect(toggled.checklistItems![1].done).toBe(false);

      const toggledBack = store.toggleChecklistItem(note.id, 0);
      expect(toggledBack.checklistItems![0].done).toBe(false);
    });

    it('throws on invalid index', () => {
      const note = store.create('Item A');
      store.convertToChecklist(note.id);

      expect(() => store.toggleChecklistItem(note.id, -1)).toThrow('out of bounds');
      expect(() => store.toggleChecklistItem(note.id, 5)).toThrow('out of bounds');
    });

    it('throws for non-existent note', () => {
      expect(() => store.toggleChecklistItem('nope', 0)).toThrow('Note not found');
    });
  });

  describe('addChecklistItem', () => {
    it('adds a new item with done=false', () => {
      const note = store.create('Existing');
      store.convertToChecklist(note.id);

      const result = store.addChecklistItem(note.id, 'New item');
      expect(result.checklistItems).toHaveLength(2);
      expect(result.checklistItems![1]).toEqual({ text: 'New item', done: false });
    });

    it('initializes checklistItems array if empty', () => {
      const note = store.create('Some content');
      const result = store.addChecklistItem(note.id, 'First checklist item');
      expect(result.checklistItems).toHaveLength(1);
      expect(result.checklistItems![0]).toEqual({ text: 'First checklist item', done: false });
    });

    it('throws for non-existent note', () => {
      expect(() => store.addChecklistItem('nope', 'item')).toThrow('Note not found');
    });
  });

  describe('removeChecklistItem', () => {
    it('removes item at index', () => {
      const note = store.create('A\nB\nC');
      store.convertToChecklist(note.id);

      const result = store.removeChecklistItem(note.id, 1);
      expect(result.checklistItems).toHaveLength(2);
      expect(result.checklistItems![0].text).toBe('A');
      expect(result.checklistItems![1].text).toBe('C');
    });

    it('throws on invalid index', () => {
      const note = store.create('A\nB');
      store.convertToChecklist(note.id);

      expect(() => store.removeChecklistItem(note.id, -1)).toThrow('out of bounds');
      expect(() => store.removeChecklistItem(note.id, 5)).toThrow('out of bounds');
    });

    it('throws for non-existent note', () => {
      expect(() => store.removeChecklistItem('nope', 0)).toThrow('Note not found');
    });
  });
});
