export function FollowUpChips({
  chips,
  onSelect,
}: {
  chips: string[];
  onSelect: (text: string) => void;
}) {
  if (!chips?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className="rounded-full border border-border bg-background px-3 py-1 text-[12px] text-foreground hover:border-cars24-red hover:text-cars24-red"
        >
          {c}
        </button>
      ))}
    </div>
  );
}