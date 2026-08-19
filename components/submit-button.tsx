'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

/**
 * A submit button that disables itself while its form's Server Action is
 * running.
 *
 * A plain `<form action={serverAction}>` gives the button no pending state on
 * its own, so it stays clickable for the whole round trip. On a slow
 * connection a second tap reads as "it didn't register" and fires the action
 * again — two identical rows instead of one.
 */
export function SubmitButton({
  pendingLabel,
  children,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
