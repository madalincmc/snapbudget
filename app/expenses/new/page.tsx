import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createManualExpense } from './actions';

export default async function NewExpensePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-muted/40 flex flex-1 justify-center px-6 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Button
          variant="link"
          className="self-start px-0"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft />
          Înapoi la dashboard
        </Button>

        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-semibold">Adaugă cheltuială manuală</h1>
          <p className="text-muted-foreground text-sm">
            Pentru cheltuieli fără bon: cash, parcare, transport, etc.
          </p>
        </div>

        <form action={createManualExpense} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Sumă (lei) — obligatoriu</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Categorie — obligatoriu</Label>
            <Select name="category" required defaultValue="Altele">
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Alege o categorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purchase_date">Data — obligatoriu</Label>
            <Input
              id="purchase_date"
              type="date"
              name="purchase_date"
              required
              defaultValue={today}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="merchant">Comerciant / titlu (opțional)</Label>
            <Input id="merchant" name="merchant" placeholder="ex: Parcare centru" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notițe (opțional)</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="ex: plătit cash" />
          </div>

          <Button type="submit" size="lg" className="mt-2 h-12 rounded-full">
            Salvează
          </Button>
        </form>
      </div>
    </div>
  );
}
