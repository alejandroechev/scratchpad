import { useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface FilterChipRowProps {
  labels: string[];           // all unique labels from notes
  activeLabel: string | null; // currently selected label filter
  onLabelSelect: (label: string | null) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  tasksOnly: boolean;
  onTasksOnlyToggle: () => void;
}

export function FilterChipRow({ labels, activeLabel, onLabelSelect, searchText, onSearchChange, tasksOnly, onTasksOnlyToggle }: FilterChipRowProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <div className="px-3 py-2 bg-amber-500 flex gap-2 overflow-x-auto" data-testid="filter-chip-row">
      {/* Search chip */}
      {searchExpanded ? (
        <div className="flex items-center gap-1 min-w-[200px]">
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            autoFocus
            className="flex-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-gray-900
                       placeholder:text-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
            data-testid="search-chip-input"
          />
          <button
            onClick={() => { setSearchExpanded(false); onSearchChange(""); }}
            className="text-amber-600 text-xs"
          ><XMarkIcon className="w-3 h-3" /></button>
        </div>
      ) : (
        <button
          onClick={() => setSearchExpanded(true)}
          className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-700
                     hover:bg-amber-100"
          data-testid="search-chip"
        >
          <MagnifyingGlassIcon className="w-4 h-4 inline" /> Buscar
        </button>
      )}

      {/* Tasks chip */}
      <button
        onClick={onTasksOnlyToggle}
        className={`shrink-0 rounded-full px-3 py-1 text-xs border flex items-center gap-1
          ${tasksOnly
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
          }`}
        data-testid="tasks-filter-chip"
      >
        <CheckCircleIcon className="w-4 h-4" /> Tareas
      </button>

      {/* Label chips */}
      {labels.map((label) => (
        <button
          key={label}
          onClick={() => onLabelSelect(activeLabel === label ? null : label)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs border
            ${activeLabel === label
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
            }`}
          data-testid={`label-chip-${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}