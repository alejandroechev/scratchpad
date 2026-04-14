import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNoteStore } from '../../src/infra/memory/note-store';

describe('InMemoryNoteStore - Tasks', () => {
  let store: InMemoryNoteStore;

  beforeEach(() => {
    store = new InMemoryNoteStore();
  });

  describe('toggleTask', () => {
    it('converts a note to a task (isTask=true)', () => {
      const note = store.create('buy groceries');
      expect(note.isTask).toBe(false);

      const toggled = store.toggleTask(note.id);
      expect(toggled.isTask).toBe(true);
    });

    it('converts a task back to a regular note (isTask=false)', () => {
      const note = store.create('buy groceries');
      store.toggleTask(note.id);
      const toggled = store.toggleTask(note.id);
      expect(toggled.isTask).toBe(false);
    });

    it('resets taskDone to false when converting back to a note', () => {
      const note = store.create('buy groceries');
      store.toggleTask(note.id);
      store.toggleTaskDone(note.id);
      const toggled = store.toggleTask(note.id);
      expect(toggled.isTask).toBe(false);
      expect(toggled.taskDone).toBe(false);
    });

    it('throws error for non-existent note', () => {
      expect(() => store.toggleTask('non-existent')).toThrow('Note not found');
    });
  });

  describe('toggleTaskDone', () => {
    it('marks a task as done', () => {
      const note = store.create('buy groceries');
      store.toggleTask(note.id);
      const done = store.toggleTaskDone(note.id);
      expect(done.taskDone).toBe(true);
    });

    it('marks a done task as undone', () => {
      const note = store.create('buy groceries');
      store.toggleTask(note.id);
      store.toggleTaskDone(note.id);
      const undone = store.toggleTaskDone(note.id);
      expect(undone.taskDone).toBe(false);
    });

    it('throws error for non-existent note', () => {
      expect(() => store.toggleTaskDone('non-existent')).toThrow('Note not found');
    });
  });

  describe('list with tasksOnly filter', () => {
    it('returns only task notes when tasksOnly is true', () => {
      const note1 = store.create('regular note');
      const note2 = store.create('task note');
      const note3 = store.create('another regular note');

      store.toggleTask(note2.id);

      const tasks = store.list({ tasksOnly: true });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(note2.id);
    });

    it('returns all notes when tasksOnly is not set', () => {
      store.create('regular note');
      store.create('task note');
      store.toggleTask(store.list()[0].id);

      const all = store.list();
      expect(all).toHaveLength(2);
    });

    it('combines tasksOnly with label filter', () => {
      const note1 = store.create('task with label');
      const note2 = store.create('task without label');
      const note3 = store.create('regular note with label');

      store.toggleTask(note1.id);
      store.toggleTask(note2.id);
      store.addLabel(note1.id, 'work');
      store.addLabel(note3.id, 'work');

      const result = store.list({ tasksOnly: true, label: 'work' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(note1.id);
    });

    it('returns empty array when no tasks exist', () => {
      store.create('regular note');
      const result = store.list({ tasksOnly: true });
      expect(result).toEqual([]);
    });
  });

  describe('createNote defaults', () => {
    it('creates a note with isTask=false and taskDone=false by default', () => {
      const note = store.create('test note');
      expect(note.isTask).toBe(false);
      expect(note.taskDone).toBe(false);
    });
  });
});
