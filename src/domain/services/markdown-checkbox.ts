const CHECKBOX_REGEX = /^(\s*)-\s\[([ xX])\]/gm;

export function toggleCheckbox(content: string, checkboxIndex: number): string {
  const matches: { index: number; length: number; checked: boolean; prefix: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = CHECKBOX_REGEX.exec(content)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      checked: match[2] !== ' ',
      prefix: match[1],
    });
  }

  if (checkboxIndex < 0 || checkboxIndex >= matches.length) {
    throw new RangeError(
      `Checkbox index ${checkboxIndex} out of bounds (found ${matches.length} checkboxes)`
    );
  }

  const target = matches[checkboxIndex];
  const replacement = target.checked
    ? `${target.prefix}- [ ]`
    : `${target.prefix}- [x]`;

  return (
    content.slice(0, target.index) +
    replacement +
    content.slice(target.index + target.length)
  );
}

export function countCheckboxes(content: string): { total: number; checked: number } {
  let total = 0;
  let checked = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(CHECKBOX_REGEX.source, CHECKBOX_REGEX.flags);
  while ((match = regex.exec(content)) !== null) {
    total++;
    if (match[2] !== ' ') checked++;
  }

  return { total, checked };
}

export function hasCheckboxes(content: string): boolean {
  const regex = new RegExp(CHECKBOX_REGEX.source, CHECKBOX_REGEX.flags);
  return regex.test(content);
}
