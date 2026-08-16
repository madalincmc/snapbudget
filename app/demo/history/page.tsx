import { DEMO_ME, DEMO_MEMBERS } from '@/lib/demo/fixtures';
import { HistoryList } from '@/components/history-list';
import { PageHeader } from '@/components/page-header';

/**
 * The history screen, on the demo household — the real list component, with
 * its search, its date range, its category and member filters and its six
 * sorts, pointed at `/api/demo/history` instead of the endpoint that asks who
 * you are.
 *
 * Read-only: a row does not open for editing and nothing can be deleted,
 * because both need an account and a database behind them.
 */
export default async function DemoHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };

  return (
    <div className="pb-nav flex flex-1 justify-center px-4 pt-5">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <PageHeader
          title="Istoric"
          description="Caută, filtrează și sortează toate cheltuielile"
          backHref={null}
        />
        <HistoryList
          members={DEMO_MEMBERS}
          meUserId={DEMO_ME}
          endpoint="/api/demo/history"
          basePath="/demo/history"
          readOnly
          initial={{
            q: one('q'),
            category: one('category'),
            period: one('period'),
            from: one('from'),
            to: one('to'),
            sort: one('sort'),
            who: one('who'),
            month: one('month'),
            year: one('year'),
          }}
        />
      </div>
    </div>
  );
}
