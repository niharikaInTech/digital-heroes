import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CharityCard from '@/components/CharityCard';
import SplitDemo from '@/components/SplitDemo';
import { PLANS, MIN_CHARITY_PERCENT } from '@/lib/config';
import { POOL_SPLIT } from '@/lib/draw.mjs';
import { inr } from '@/lib/format';

const steps = [
  { title: 'Subscribe', text: `Pick monthly or yearly. At least ${MIN_CHARITY_PERCENT}% of your fee goes to your chosen charity from the first payment.` },
  { title: 'Log your scores', text: 'Keep your five latest Stableford scores (1 to 45) up to date. A new score replaces your oldest one.' },
  { title: 'Match the draw', text: 'Every month five numbers are drawn. Matching three, four or five of your scores wins a share of the pool.' },
  { title: 'Prove it and get paid', text: 'Winners upload a screenshot of their scores. Once we approve it, the prize is paid out.' },
];

const tiers = [
  { match: 5, note: 'Jackpot. If nobody wins, it rolls over to next month.' },
  { match: 4, note: 'Shared equally between all four-number winners.' },
  { match: 3, note: 'Shared equally between all three-number winners.' },
];

export default async function Home() {
  const supabase = createClient();
  const { data: featured } = await supabase
    .from('charities')
    .select('*')
    .eq('featured', true)
    .limit(3);

  const stagger = (i) => ({ animationDelay: `${i * 110}ms` });

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-10 pt-16 md:grid-cols-[1.15fr_1fr] md:pt-24">
        <div>
          <h1 className="rise text-4xl font-semibold leading-[1.05] sm:text-6xl" style={stagger(0)}>
            Every score you log helps fund a cause you choose.
          </h1>
          <p className="rise muted mt-6 max-w-xl text-lg" style={stagger(1)}>
            Subscribe from {inr(PLANS.monthly.price)} a month, pick your charity, and keep your five latest golf scores up
            to date. You're in the monthly prize draw automatically.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={stagger(2)}>
            <Link href="/signup" className="btn btn-primary !px-7 !py-3 text-base">Start giving</Link>
            <Link href="/charities" className="btn btn-ghost !px-7 !py-3 text-base">Meet the charities</Link>
          </div>
        </div>
        <div className="rise" style={stagger(3)}>
          <SplitDemo />
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24">
        <h2 className="max-w-lg text-3xl font-semibold sm:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t border-cream/15 pt-5">
              <span className="font-serif text-3xl italic text-copper">{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Prize tiers ---------- */}
      <section className="mx-auto mt-24 grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-semibold sm:text-4xl">Three ways to win each month</h2>
          <p className="muted mt-4 max-w-md">
            A fixed share of every subscription goes into the prize pool. The pool is split into three tiers,
            calculated automatically from the number of active subscribers.
          </p>
        </div>
        <div className="space-y-4">
          {tiers.map((t) => (
            <div key={t.match} className="panel !p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{t.match} numbers matched</h3>
                <span className="font-serif text-2xl italic text-copper">{POOL_SPLIT[t.match] * 100}% of the pool</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-ink">
                <div className="h-full rounded-full bg-copper" style={{ width: `${POOL_SPLIT[t.match] * 100 * 2}%` }} />
              </div>
              <p className="muted mt-3 text-sm">{t.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Charity spotlight ---------- */}
      {featured?.length > 0 && (
        <section className="mx-auto mt-24 max-w-6xl px-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="max-w-lg text-3xl font-semibold sm:text-4xl">Charities you can back</h2>
            <Link href="/charities" className="text-sm text-sage hover:text-cream">See all charities</Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((c) => <CharityCard key={c.id} charity={c} />)}
          </div>
        </section>
      )}

      {/* ---------- Final call to action ---------- */}
      <section className="mx-auto mt-24 max-w-6xl px-5">
        <div className="rounded-3xl bg-forest px-8 py-14 text-center sm:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">
            Your next round can do more than lower your handicap.
          </h2>
          <p className="muted mx-auto mt-4 max-w-lg">Choose a charity, log your scores, and you're in this month's draw.</p>
          <Link href="/signup" className="btn btn-copper mt-8 !px-8 !py-3 text-base">Subscribe now</Link>
        </div>
      </section>
    </>
  );
}
