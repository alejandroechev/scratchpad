import { describe, it, expect } from 'vitest';
import { toggleCheckbox, countCheckboxes, hasCheckboxes } from '../../src/domain/services/markdown-checkbox';

describe('toggleCheckbox', () => {
  it('toggles unchecked to checked', () => {
    const content = '- [ ] Buy milk';
    expect(toggleCheckbox(content, 0)).toBe('- [x] Buy milk');
  });

  it('toggles checked to unchecked', () => {
    const content = '- [x] Buy milk';
    expect(toggleCheckbox(content, 0)).toBe('- [ ] Buy milk');
  });

  it('toggles uppercase X to unchecked', () => {
    const content = '- [X] Buy milk';
    expect(toggleCheckbox(content, 0)).toBe('- [ ] Buy milk');
  });

  it('handles mixed content with text before and after checkboxes', () => {
    const content = '# Shopping List\n\n- [ ] Eggs\n\nSome notes here.';
    expect(toggleCheckbox(content, 0)).toBe('# Shopping List\n\n- [x] Eggs\n\nSome notes here.');
  });

  it('handles multiple checkboxes and toggles the correct index', () => {
    const content = '- [ ] First\n- [x] Second\n- [ ] Third';
    expect(toggleCheckbox(content, 1)).toBe('- [ ] First\n- [ ] Second\n- [ ] Third');
    expect(toggleCheckbox(content, 2)).toBe('- [ ] First\n- [x] Second\n- [x] Third');
  });

  it('handles indented/nested checkboxes', () => {
    const content = '- [ ] Parent\n  - [ ] Child\n    - [x] Grandchild';
    expect(toggleCheckbox(content, 1)).toBe('- [ ] Parent\n  - [x] Child\n    - [x] Grandchild');
    expect(toggleCheckbox(content, 2)).toBe('- [ ] Parent\n  - [ ] Child\n    - [ ] Grandchild');
  });

  it('throws on negative index', () => {
    const content = '- [ ] Item';
    expect(() => toggleCheckbox(content, -1)).toThrow();
  });

  it('throws on out-of-bounds index', () => {
    const content = '- [ ] Item';
    expect(() => toggleCheckbox(content, 1)).toThrow();
  });

  it('throws on empty content with any index', () => {
    expect(() => toggleCheckbox('', 0)).toThrow();
  });

  it('preserves surrounding content exactly', () => {
    const content = 'Header\n\n- [ ] Task 1\n\n  Some indented text\n\n- [x] Task 2\n\nFooter';
    const result = toggleCheckbox(content, 0);
    expect(result).toBe('Header\n\n- [x] Task 1\n\n  Some indented text\n\n- [x] Task 2\n\nFooter');
  });
});

describe('countCheckboxes', () => {
  it('returns {total: 0, checked: 0} for empty string', () => {
    expect(countCheckboxes('')).toEqual({ total: 0, checked: 0 });
  });

  it('returns {total: 0, checked: 0} for text without checkboxes', () => {
    expect(countCheckboxes('Just some plain text\nWith multiple lines')).toEqual({ total: 0, checked: 0 });
  });

  it('counts mixed checked and unchecked', () => {
    const content = '- [ ] One\n- [x] Two\n- [ ] Three\n- [x] Four';
    expect(countCheckboxes(content)).toEqual({ total: 4, checked: 2 });
  });

  it('handles uppercase X as checked', () => {
    const content = '- [X] Done\n- [ ] Not done';
    expect(countCheckboxes(content)).toEqual({ total: 2, checked: 1 });
  });
});

describe('hasCheckboxes', () => {
  it('returns false for plain text', () => {
    expect(hasCheckboxes('Hello world')).toBe(false);
  });

  it('returns true for content with unchecked checkbox', () => {
    expect(hasCheckboxes('- [ ] Task')).toBe(true);
  });

  it('returns true for content with checked checkbox', () => {
    expect(hasCheckboxes('- [x] Done')).toBe(true);
  });

  it('returns true for content with uppercase X checkbox', () => {
    expect(hasCheckboxes('- [X] Done')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(hasCheckboxes('')).toBe(false);
  });
});
