# ADR-005: Swipe Action Menu on Note Cards

## Status

Accepted

## Date

2025-07-18

## Context

In previous versions (≤ v0.7.x), note management actions — Archive, Attach Image, and Manage Labels — lived inside the Note Detail page. This meant users had to tap into a note just to perform a quick action. The detail view was cluttered with action buttons that distracted from the primary use case: reading and editing text.

Additionally, the swipe gesture was previously used only for archiving (swipe left or right). This was a binary gesture with no room for additional actions.

## Decision

Replace the dedicated action buttons in the detail view with a **swipe-left action menu** on each note card in the list view. Swiping left on a card reveals three action buttons:

1. **Archivar** — archive the note
2. **Imagen** — attach an image from camera/gallery
3. **Etiqueta** — assign or remove labels

The detail view is simplified to focus on content editing, auto-save, and undo/redo — no action buttons.

### Design rationale

- **Discoverability vs. efficiency** — swipe menus are a well-established mobile pattern (iOS Mail, Android Gmail). Users expect quick-actions behind a swipe.
- **Clean detail view** — removing actions from the detail page reduces cognitive load and lets the user focus on text.
- **Single swipe direction** — only swipe-left reveals the menu, avoiding conflicts with system gestures (Android back swipe) and keeping the interaction model simple.
- **Three-button limit** — keeps the action tray compact. If more actions are needed in the future, consider a bottom sheet or long-press menu instead of adding more swipe buttons.

## Consequences

- **Positive**: Faster access to common actions without opening the note. Cleaner detail view.
- **Positive**: Archive no longer needs a full-swipe dismiss animation — it's an explicit button tap, reducing accidental archives.
- **Negative**: Swipe actions are less discoverable than visible buttons for first-time users.
- **Negative**: Adding a fourth action would require rethinking the swipe tray layout.

## Alternatives Considered

1. **Long-press context menu** — more discoverable on desktop but awkward on mobile with variable press durations.
2. **Bottom sheet on swipe** — more flexible but heavier UI for just three actions.
3. **Keep actions in detail view** — rejected because it cluttered the editing experience.
