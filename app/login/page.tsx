import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="bg-muted/40 flex flex-1 items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl">SnapBudget</CardTitle>
          <CardDescription>Fotografiază bonul, restul îl facem noi.</CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleSignInButton next={next ?? '/dashboard'} />
        </CardContent>
      </Card>
    </div>
  );
}
