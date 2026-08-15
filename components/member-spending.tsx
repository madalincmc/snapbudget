import Link from 'next/link';
import { MemberAvatar } from '@/components/member-avatar';
import { MonthPicker } from '@/components/month-picker';
import { money, monthKeyLabel } from '@/lib/dashboard/format';
import type { MonthKey } from '@/lib/dashboard/aggregate';
import type { HouseholdSpending, MemberSpending } from '@/lib/household/spending';
import { delay } from '@/lib/utils';

/**
 * Romanian puts "de" between the number and the noun from 20 upwards, and the
 * rule keys off the last two digits — so 21 is "21 de cheltuieli" but 101 is
 * "101 cheltuieli".
 */
function expenseCount(count: number): string {
  if (count === 0) return 'nicio cheltuială';
  if (count === 1) return 'o cheltuială';
  const lastTwo = count % 100;
  return lastTwo >= 1 && lastTwo <= 19 ? `${count} cheltuieli` : `${count} de cheltuieli`;
}

function MemberRow({
  member,
  max,
  meUserId,
  month,
  currentMonth,
  showShare,
  linkToDashboard,
  index,
}: {
  member: MemberSpending;
  max: number;
  meUserId: string;
  month: MonthKey;
  currentMonth: MonthKey;
  showShare: boolean;
  linkToDashboard: boolean;
  index: number;
}) {
  const { userId, displayName, avatarUrl, total, count, share } = member;
  const isMe = userId === meUserId;
  const name = userId === null ? 'Foști membri' : (displayName ?? 'Membru');

  const content = (
    <>
      <MemberAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-foreground min-w-0 truncate font-medium">
            {name}
            {isMe && <span className="text-muted-foreground font-normal"> (tu)</span>}
          </span>
          <span className="flex flex-none items-baseline gap-2">
            {showShare && (
              <span className="text-muted-foreground/70 text-xs tabular-nums">
                {Math.round(share)}%
              </span>
            )}
            <span className="text-foreground tabular-nums">
              {money(total)}
              <span className="text-muted-foreground/70 text-xs"> lei</span>
            </span>
          </span>
        </div>

        {/* Scaled to the biggest spender rather than to the household total, so
            two people who split the month evenly get two full-ish bars instead
            of two half ones — the comparison that matters here is between
            members, and the share percentage already carries the other one. */}
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="sb-widen bg-chart-accent h-full rounded-full"
            style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
          />
        </div>

        <p className="text-muted-foreground text-xs">{expenseCount(count)}</p>
      </div>
    </>
  );

  const className =
    '-mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60';

  return (
    // Offset past the card's own entrance, so the rows arrive into a card that
    // is already there rather than alongside it.
    <li className="sb-rise" style={delay(120 + index * 60)}>
      {userId === null || !linkToDashboard ? (
        // Either a roll-up of people who have left, with nobody to drill into,
        // or the demo, where the dashboard behind the link needs an account.
        <div className={className}>{content}</div>
      ) : (
        <Link
          href={{
            pathname: '/dashboard',
            query: month === currentMonth ? { who: userId } : { who: userId, month },
          }}
          className={className}
        >
          {content}
        </Link>
      )}
    </li>
  );
}

/**
 * Who spent what, for one month of the household's shared expenses.
 *
 * Counts only expenses tagged with the household — which is every expense any
 * member has added since joining. Anything from before that stays private to
 * its owner, so this list reads identically for everyone in the household
 * rather than quietly inflating whichever member happens to be looking.
 */
export function MemberSpendingCard({
  spending,
  meUserId,
  month,
  currentMonth,
  linkToDashboard = true,
}: {
  spending: HouseholdSpending;
  meUserId: string;
  month: MonthKey;
  currentMonth: MonthKey;
  /** Off for /demo, where the dashboard the rows point at needs a real account. */
  linkToDashboard?: boolean;
}) {
  const { total, members, max } = spending;
  const periodLabel = month === currentMonth ? 'luna aceasta' : monthKeyLabel(month);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Cine cât a cheltuit
        </h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          total {money(total, 0)} lei
        </span>
      </div>

      <div className="flex justify-center">
        <MonthPicker month={month} currentMonth={currentMonth} />
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nimeni nu a cheltuit nimic în {periodLabel}.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member, index) => (
            <MemberRow
              key={member.userId ?? 'departed'}
              member={member}
              max={max}
              meUserId={meUserId}
              month={month}
              currentMonth={currentMonth}
              // One member is not a comparison, so the percentage would only be
              // a permanent "100%".
              showShare={members.length > 1}
              linkToDashboard={linkToDashboard}
              index={index}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
