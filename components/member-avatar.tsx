import { cn } from '@/lib/utils';

/**
 * A household member's picture, falling back to the first letter of their name.
 * Google gives us an avatar for most accounts, but never for an invitee who has
 * not signed in yet — so the initial is the case to design for, not the edge.
 */
export function MemberAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string | null;
  avatarUrl: string | null;
  size?: 'md' | 'sm';
}) {
  const box = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={cn('flex-none rounded-full object-cover', box)} />
    );
  }

  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className={cn(
        'bg-accent text-accent-foreground flex flex-none items-center justify-center rounded-full font-semibold',
        box,
      )}
    >
      {initial}
    </div>
  );
}
