# ADR-006: Task Notes Model — isTask/taskDone Fields vs Separate Entity

## Status

Accepted

## Date

2025-01-19

## Context

ScratchPad v0.9.0 introduces the ability to convert any note into a task with a checkbox UI. Users can toggle the task status (done/undone) via the swipe action menu or desktop context menu. The system also provides a dedicated task filter ("Tareas" chip) to show only task notes.

The fundamental question: should tasks be modeled as a **separate entity** (with a foreign key to Note) or as **boolean fields** on the existing Note model?

### Option A: Separate Task Entity

```typescript
interface Note {
  id: string;
  text: string;
  labels: string[];
  // ... other fields
}

interface Task {
  id: string;
  noteId: string;  // FK to Note
  isDone: boolean;
  dueDate?: Date;  // future extensibility
  priority?: number;
}
```

**Pros:**
- Clean separation of concerns
- Easier to add task-specific fields (dueDate, priority, reminders) without bloating Note
- Simpler queries: `tasks.filter(t => t.isDone === false)` is separate from notes logic

**Cons:**
- Requires maintaining referential integrity (orphaned tasks if note is deleted)
- Two Automerge tables/arrays to sync instead of one
- More complex CRDT merge logic for task-note relationships
- Overhead for a simple checkbox feature

### Option B: Add isTask/taskDone Boolean Fields to Note

```typescript
interface Note {
  id: string;
  text: string;
  labels: string[];
  isTask: boolean;       // new in v0.9.0 (schema v4)
  taskDone: boolean;     // new in v0.9.0 (schema v4)
  // ... other fields
}
```

**Pros:**
- Single entity, single source of truth
- No referential integrity issues
- Simpler CRDT sync (one doc.notes array)
- Minimal schema change (two booleans)
- Fast filtering: `notes.filter(n => n.isTask)` or `notes.filter(n => n.isTask && !n.taskDone)`

**Cons:**
- Note model grows with every feature (could bloat over time)
- Cannot add task-specific complex fields cleanly (e.g., recurring tasks, subtasks)
- taskDone is meaningless when isTask is false (dead field)

## Decision

**Use Option B: Add `isTask` and `taskDone` boolean fields to the existing Note model.**

Rationale:
1. **YAGNI** — We don't need task-specific fields like dueDate or priority yet. If we add them in the future, we can migrate.
2. **CRDT simplicity** — A single `doc.notes` array is easier to sync and reason about than managing two related entities in Automerge.
3. **Fast implementation** — Adding two booleans unblocks the feature without restructuring the data layer.
4. **User mental model** — Tasks **are** notes with a checkbox. They're not separate items. This aligns with how users think.

### Schema v4

```typescript
export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  labels: string[];
  imageIds: string[];
  isTask: boolean;       // NEW
  taskDone: boolean;     // NEW
}
```

Default values for new notes: `isTask: false`, `taskDone: false`.

## Consequences

### Positive
- Fast to implement and ship in v0.9.0
- No complex migration or data integrity code
- UI can toggle `isTask` and `taskDone` with simple boolean updates
- Filtering is straightforward: `notes.filter(n => n.isTask && !n.taskDone)` for active tasks

### Negative
- If we add 5+ task-specific fields later (dueDate, priority, recurrence, subtasks, assignee), the Note model will bloat
- Dead fields: `taskDone` is unused when `isTask` is false

### Migration Path (if needed in the future)

If task features grow complex enough to justify a separate entity:
1. Create a new `Task` entity with a `noteId` FK
2. Migrate all `note.isTask === true` to new Task records
3. Deprecate `isTask`/`taskDone` fields (or use them as cached flags)

For now, this is premature optimization. The two-boolean approach is sufficient for v0.9.0.

## Alternatives Considered

1. **Separate Task entity** — rejected because it's over-engineering for a simple checkbox feature.
2. **Use a `type` enum** (`type: 'note' | 'task'`) instead of `isTask` boolean — rejected because it's less flexible (a note can be both text content and a task checkbox).
3. **Store tasks as a computed view** (filter notes with a special label like `#task`) — rejected because it's implicit and harder to toggle via UI.
