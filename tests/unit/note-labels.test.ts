import { describe, it, expect } from 'vitest';
import { createNote } from '../../src/domain/models/note';

describe('Note labels', () => {
  describe('createNote', () => {
    it('initializes labels as empty array', () => {
      const note = createNote('test-123', 'hello world');
      expect(note.labels).toEqual([]);
    });
  });
});