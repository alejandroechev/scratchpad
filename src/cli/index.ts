import { Command } from "commander";
import { InMemoryNoteStore } from "../infra/memory/note-store.js";
import { extractUrls } from "../domain/models/note.js";

const store = new InMemoryNoteStore();
const program = new Command();

program
  .name("scratchpad")
  .description("ScratchPad CLI — quick notes and links")
  .version("0.1.0");

program
  .command("add")
  .description("Add a new note")
  .argument("<text...>", "Note content")
  .action((textParts: string[]) => {
    const content = textParts.join(" ");
    const note = store.create(content);
    console.log(`✅ Created note ${note.id}`);
    const urls = extractUrls(content);
    if (urls.length > 0) {
      console.log(`🔗 Links found: ${urls.join(", ")}`);
    }
  });

program
  .command("list")
  .description("List all notes")
  .option("-s, --search <query>", "Filter by text")
  .option("-a, --archived", "Include archived notes")
  .action((opts: { search?: string; archived?: boolean }) => {
    const notes = store.list({
      search: opts.search,
      includeArchived: opts.archived,
    });
    if (notes.length === 0) {
      console.log("No notes found.");
      return;
    }
    for (const note of notes) {
      const status = note.archived ? " [archived]" : "";
      const preview =
        note.content.length > 60
          ? note.content.slice(0, 60) + "..."
          : note.content;
      console.log(`${note.id}${status}: ${preview}`);
    }
  });

program
  .command("view")
  .description("View a note")
  .argument("<id>", "Note ID")
  .action((id: string) => {
    const note = store.getById(id);
    if (!note) {
      console.error(`❌ Note not found: ${id}`);
      process.exit(1);
    }
    console.log(`ID: ${note.id}`);
    console.log(`Created: ${note.createdAt}`);
    console.log(`Updated: ${note.updatedAt}`);
    console.log(`Archived: ${note.archived}`);
    console.log(`\n${note.content}`);
    const urls = extractUrls(note.content);
    if (urls.length > 0) {
      console.log(`\n🔗 Links: ${urls.join(", ")}`);
    }
  });

program
  .command("edit")
  .description("Edit a note")
  .argument("<id>", "Note ID")
  .argument("<text...>", "New content")
  .action((id: string, textParts: string[]) => {
    try {
      const note = store.update(id, textParts.join(" "));
      console.log(`✅ Updated note ${note.id}`);
    } catch {
      console.error(`❌ Note not found: ${id}`);
      process.exit(1);
    }
  });

program
  .command("archive")
  .description("Archive a note")
  .argument("<id>", "Note ID")
  .action((id: string) => {
    try {
      store.archive(id);
      console.log(`📦 Archived note ${id}`);
    } catch {
      console.error(`❌ Note not found: ${id}`);
      process.exit(1);
    }
  });

program
  .command("delete")
  .description("Delete a note")
  .argument("<id>", "Note ID")
  .action((id: string) => {
    try {
      store.delete(id);
      console.log(`🗑️ Deleted note ${id}`);
    } catch {
      console.error(`❌ Note not found: ${id}`);
      process.exit(1);
    }
  });

program.parse();
