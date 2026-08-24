'use client';

import { useState, useTransition } from 'react';
import { Pencil } from 'lucide-react';
import { updateBudgetAmount } from '@/app/budgets/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Changes the limit on a category that already has one.
 *
 * Needed because the "adaugă o limită" form below the list only offers
 * categories that *don't* have one yet — correcting an existing limit meant
 * deleting it and setting it up again from scratch.
 *
 * A client component rather than the server-rendered dialog used for the
 * deletes on this page: those close on their own because revalidation removes
 * the row the dialog lives in, while an edited row stays exactly where it is,
 * so the dialog has to be told to close once the action has actually landed.
 */
export function EditBudgetDialog({
  budgetId,
  category,
  amount,
  spent,
}: {
  budgetId: string;
  category: string;
  amount: number;
  spent: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // Closing mid-save would unmount the form under its own submission — Base
    // UI unmounts the popup's contents — and leave the write's outcome
    // unreported. The dialog reopens clean, so the error is dropped on the way
    // in rather than kept from a previous attempt.
    if (pending) return;
    setError(null);
    setOpen(next);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateBudgetAmount(budgetId, formData);
        setOpen(false);
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Nu am putut salva limita. Încearcă din nou.',
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground/40 hover:text-foreground focus-visible:text-foreground"
          >
            <Pencil />
            <span className="sr-only">Schimbă limita pentru {category}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limita pentru {category}</DialogTitle>
          <DialogDescription>
            Ai cheltuit {spent.toFixed(0)} lei pe această categorie luna asta.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`budget-amount-${budgetId}`}>Limită lunară (lei)</Label>
            <Input
              id={`budget-amount-${budgetId}`}
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              defaultValue={String(amount)}
              autoFocus
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              Anulează
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Se salvează…' : 'Salvează'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
