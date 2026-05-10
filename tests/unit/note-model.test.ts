import { describe, it, expect } from 'vitest';
import { extractUrls, createNote, isNoteEmpty } from '../../src/domain/models/note';

describe('extractUrls', () => {
  it('returns empty array for text with no URLs', () => {
    expect(extractUrls('just plain text')).toEqual([]);
  });

  it('extracts a single HTTP URL', () => {
    expect(extractUrls('check http://example.com for info')).toEqual([
      'http://example.com',
    ]);
  });

  it('extracts a single HTTPS URL', () => {
    expect(extractUrls('see https://example.com/path?q=1')).toEqual([
      'https://example.com/path?q=1',
    ]);
  });

  it('extracts multiple URLs from text', () => {
    const text = 'Visit https://a.com and http://b.org/page for details';
    expect(extractUrls(text)).toEqual([
      'https://a.com',
      'http://b.org/page',
    ]);
  });

  it('handles URLs with fragments and query params', () => {
    expect(extractUrls('https://docs.com/page#section?key=val')).toEqual([
      'https://docs.com/page#section?key=val',
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(extractUrls('')).toEqual([]);
  });
});

describe('isNoteEmpty', () => {
  it('returns true for a note with no content, images, or checklist items', () => {
    const note = createNote('e1', '');
    expect(isNoteEmpty(note)).toBe(true);
  });

  it('returns true for whitespace-only content', () => {
    const note = createNote('e2', '   \n\t ');
    expect(isNoteEmpty(note)).toBe(true);
  });

  it('returns false when note has text content', () => {
    const note = createNote('e3', 'hello');
    expect(isNoteEmpty(note)).toBe(false);
  });

  it('returns false when note has images', () => {
    const note = { ...createNote('e4', ''), images: [{ blobId: 'abc', fileName: 'img.png', sizeBytes: 100, createdAt: '' }] };
    expect(isNoteEmpty(note)).toBe(false);
  });

  it('returns false when note has checklist items', () => {
    const note = { ...createNote('e5', ''), checklistItems: [{ text: 'task', done: false }] };
    expect(isNoteEmpty(note)).toBe(false);
  });

  it('returns true when images and checklistItems are undefined', () => {
    const note = { ...createNote('e6', ''), images: undefined, checklistItems: undefined };
    expect(isNoteEmpty(note)).toBe(true);
  });
});

describe('createNote', () => {
  it('creates a note with the given id and content', () => {
    const note = createNote('abc-123', 'hello world');
    expect(note.id).toBe('abc-123');
    expect(note.content).toBe('hello world');
    expect(note.archived).toBe(false);
  });

  it('sets createdAt and updatedAt to the same ISO timestamp', () => {
    const note = createNote('x', 'test');
    expect(note.createdAt).toBe(note.updatedAt);
    expect(() => new Date(note.createdAt)).not.toThrow();
  });
});
