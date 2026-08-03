import { GoogleSignInButton } from '@/components/google-sign-in-button';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            SnapBudget
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fotografiază bonul, restul îl facem noi.
          </p>
        </div>
        <GoogleSignInButton next={next ?? '/dashboard'} />
      </div>
    </div>
  );
}
