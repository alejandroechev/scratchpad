interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  if (!value && value === "") {
    // Show a subtle search trigger
  }

  return (
    <div className="px-3 py-2 bg-amber-50">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar notas..."
        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm text-gray-900
                   placeholder:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        data-testid="search-input"
      />
    </div>
  );
}
