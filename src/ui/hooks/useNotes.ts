import { useState, useEffect, useCallback } from "react";
import type { Note } from "../../domain/models/note.js";
import type { NoteFilters } from "../../domain/services/note-repository.js";
import * as store from "../../infra/store-provider.js";

export function useNotes(filters?: NoteFilters) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch notes when filters change
  useEffect(() => {
    let cancelled = false;
    store.listNotes(filters).then((result) => {
      if (!cancelled) {
        setNotes(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [filters]);

  const refresh = useCallback(async () => {
    const result = await store.listNotes(filters);
    setNotes(result);
    setLoading(false);
  }, [filters]);

  // Listen for remote doc changes (real-time sync)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    store.onDocChange(() => refresh()).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => { unsubscribe?.(); };
  }, [refresh]);

  const addNote = useCallback(async (content: string) => {
    await store.createNote(content);
    await refresh();
  }, [refresh]);

  const editNote = useCallback(async (id: string, content: string) => {
    await store.updateNote(id, content);
    await refresh();
  }, [refresh]);

  const archiveNote = useCallback(async (id: string) => {
    await store.archiveNote(id);
    await refresh();
  }, [refresh]);

  const removeNote = useCallback(async (id: string) => {
    await store.deleteNote(id);
    await refresh();
  }, [refresh]);

  return { notes, loading, addNote, editNote, archiveNote, removeNote, refresh };
}
