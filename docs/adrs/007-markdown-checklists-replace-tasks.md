# ADR-007: Markdown Checklists Replace isTask/taskDone Fields

## Status

Accepted (supersedes ADR-006)

## Date

2025-07-14

## Context

ADR-006 introduced `isTask` and `taskDone` boolean fields on the Note model to support single-checkbox task notes. While this was a pragmatic choice for v0.9.0, users want rich checklists with multiple items per note — not just a single checkbox.

The boolean approach cannot scale to multi-item checklists without significant model changes:

- A note like "Shopping list" needs 5–10 individually toggleable items.
- Adding an `items: ChecklistItem[]` array to the Note model would duplicate state already expressible in the note content.
- Managing a parallel array alongside free-text content creates sync complexity in Automerge CRDTs.

GitHub-Flavored Markdown (GFM) already defines a widely understood checklist syntax (`- [ ]` / `- [x]`) that users know from GitHub issues, README files, and other tools.

## Decision

**Replace `isTask`/`taskDone` boolean fields with markdown-based checklists using GFM checkbox syntax.**

### How it works

1. **Checklist state lives in the note content string** — no schema change needed. A note with checklists looks like:

   ```markdown
   ## Shopping list
   - [x] Milk
   - [ ] Eggs
   - [ ] Bread
   ```

2. **Rendering** — Added `react-markdown` + `remark-gfm` to render note content as markdown with clickable checkboxes.

3. **Domain functions** handle checkbox manipulation by operating on the content string:
   - `toggleCheckbox(text, index)` — toggles the nth checkbox between `[ ]` and `[x]`
   - `countCheckboxes(text)` — returns `{ checked, total }` for progress display
   - `hasCheckboxes(text)` — returns `true` if the note contains any GFM checkboxes

4. **NoteDetailPage view/edit toggle** — rendered markdown is the default view with clickable checkboxes. Tap to switch to raw markdown editing mode.

5. **Removed fields** — `isTask` and `taskDone` are removed from the Note interface and schema.

### Schema change

```typescript
export interface Note {
  id: string;
  text: string;         // may contain GFM checkboxes
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  labels: string[];
  imageIds: string[];
  // isTask: removed
  // taskDone: removed
}
```

## Options Considered

### Option 1: Extend isTask/taskDone to an array of checklist items

```typescript
interface Note {
  // ...existing fields
  isTask: boolean;
  taskItems: { text: string; done: boolean }[];
}
```

**Rejected.** Duplicates state already expressible in the content string. Two sources of truth for "what items exist" (content text vs. taskItems array) creates sync conflicts and maintenance burden.

### Option 2: Markdown checkboxes in content (chosen)

Checklist state is encoded in the note's text using GFM syntax. Domain functions parse and manipulate checkboxes via regex.

**Chosen.** Natural syntax, no schema change, CRDT-friendly (content is a single string field), and markdown rendering provides rich formatting (bold, headers, code, links) for free.

### Option 3: Rich text editor (TipTap, ProseMirror)

Replace the plain text editor with a full rich text editor that natively supports checklists.

**Rejected.** Over-engineering for a scratchpad app. Rich text editors add significant bundle size, complexity, and mobile compatibility issues. Markdown is simpler and aligns with the app's lightweight philosophy.

## Consequences

### Positive

- **Multi-item checklists** — Users can create notes with any number of toggleable checkboxes.
- **Markdown rendering for free** — Notes now support bold, italic, headers, code blocks, links, and other GFM formatting.
- **No schema migration** — Checklist state lives in the existing `text` field. No new fields, no Automerge schema version bump.
- **CRDT-friendly** — A single string field is simpler to merge than a parallel array of items.
- **Familiar syntax** — GFM checkboxes are widely known from GitHub, VS Code, and other tools.

### Negative

- **Regex-based manipulation is fragile** — If users write unusual markdown (nested lists, checkboxes inside code blocks), the regex-based `toggleCheckbox()` may misfire. Acceptable risk for a personal scratchpad.
- **Checkbox state is not separately queryable** — Cannot efficiently query "all notes with unchecked items" without parsing every note's content. For a personal app with hundreds (not millions) of notes, this is acceptable.
- **Loss of existing task state** — Existing notes with `isTask: true` become regular notes. The `taskDone` state is lost. This is an acceptable tradeoff given the small number of existing task notes and the richer replacement.

### Migration

- Notes with `isTask: true` and `taskDone: true` could theoretically be converted to `- [x] <text>`, but the simple approach is to drop the fields and let users re-create checklists manually.
- The `isTask`/`taskDone` fields are removed from the schema. Automerge handles unknown fields gracefully (they are ignored), so no explicit migration step is needed.
