/**
 * Who added an expense, as a compact initial chip. Sits beside the merchant
 * name rather than at the tail of the metadata line, where it was easy to miss.
 * Rendered only for other people's expenses — tagging your own adds noise.
 */
export function MemberChip({ name }: { name: string | null }) {
  const label = (name ?? '').trim();
  const initial = label.charAt(0).toUpperCase() || '?';

  return (
    <span
      title={label || 'Alt membru'}
      className="bg-muted text-muted-foreground inline-flex h-4 min-w-4 flex-none items-center justify-center rounded-full px-1 text-[10px] font-medium"
    >
      {initial}
    </span>
  );
}
