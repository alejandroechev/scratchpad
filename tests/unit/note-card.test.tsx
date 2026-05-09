import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteCard } from "../../src/ui/components/NoteCard";
import type { Note } from "../../src/domain/models/note";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "test-1",
    content: "default content",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archived: false,
    ...overrides,
  };
}

describe("NoteCard", () => {
  it("renders note content with whitespace-pre-line so line breaks are visible", () => {
    const note = makeNote({ content: "line1\nline2" });
    render(<NoteCard note={note} onClick={vi.fn()} />);

    const contentEl = screen.getByText(/line1/);
    expect(contentEl).toHaveClass("whitespace-pre-line");
  });
});
