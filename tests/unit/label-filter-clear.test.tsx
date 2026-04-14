import { renderHook, act } from '@testing-library/react';
import { useState, useMemo, useEffect } from 'react';
import { describe, it, expect } from 'vitest';

/**
 * Reproduces the exact useState/useMemo/useEffect pattern from App.tsx
 * to test that activeLabel auto-clears when the label disappears from allLabels.
 */
function useLabelFilter(noteLabels: string[][]) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const allLabels = useMemo(() => [...new Set(noteLabels.flat())].sort(), [noteLabels]);

  useEffect(() => {
    if (activeLabel && !allLabels.includes(activeLabel)) {
      setActiveLabel(null);
    }
  }, [allLabels, activeLabel]);

  return { activeLabel, setActiveLabel, allLabels };
}

describe('Label filter auto-clear', () => {
  it('clears activeLabel when it no longer exists in allLabels', () => {
    const { result, rerender } = renderHook(
      ({ noteLabels }) => useLabelFilter(noteLabels),
      { initialProps: { noteLabels: [['bug', 'feature'], ['bug']] } },
    );

    act(() => { result.current.setActiveLabel('feature'); });
    expect(result.current.activeLabel).toBe('feature');

    // Remove 'feature' from all notes
    rerender({ noteLabels: [['bug'], ['bug']] });
    expect(result.current.activeLabel).toBeNull();
  });

  it('keeps activeLabel when it still exists in allLabels', () => {
    const { result, rerender } = renderHook(
      ({ noteLabels }) => useLabelFilter(noteLabels),
      { initialProps: { noteLabels: [['bug', 'feature'], ['bug']] } },
    );

    act(() => { result.current.setActiveLabel('bug'); });
    expect(result.current.activeLabel).toBe('bug');

    // Remove 'feature' but keep 'bug'
    rerender({ noteLabels: [['bug'], ['bug']] });
    expect(result.current.activeLabel).toBe('bug');
  });

  it('does nothing when activeLabel is already null', () => {
    const { result, rerender } = renderHook(
      ({ noteLabels }) => useLabelFilter(noteLabels),
      { initialProps: { noteLabels: [['bug']] } },
    );

    expect(result.current.activeLabel).toBeNull();
    rerender({ noteLabels: [] });
    expect(result.current.activeLabel).toBeNull();
  });
});
