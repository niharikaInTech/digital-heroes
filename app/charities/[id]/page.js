import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CharityImage } from '@/components/CharityCard';
import { donate } from '@/app/actions/billing';
import { MIN_DONATION } from '@/lib/config';
import { fmtDate, inr } from '@/lib/format';

export default async function CharityPage({ params, searchParams }) {
  const supabase = createClient();
  const { data: charity } = await supabase.from('charities').select('*').eq('id', params.id).single();
  if (!charity) notFound();

  const events = [...(charity.events || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <Link href="/charities" className="text-sm text-sage hover:text-cream">Back to charities</Link>

      <div className="mt-5 overflow-hidden rounded-3xl">
        <CharityImage charity={charity} className="h-64" />
      </div>

      <h1 className="mt-8 text-3xl font-semibold sm:text-5xl">{charity.name}</h1>
      <p className="muted mt-4 max-w-2xl whitespace-pre-line text-lg leading-relaxed">{charity.description}</p>
      {charity.website && (
        <a href={charity.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-sage hover:text-cream">
          Visit website
        </a>
      )}

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Upcoming events</h2>
          {events.length === 0 ? (
            <p className="muted mt-3 text-sm">No events announced yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {events.map((e, i) => (
                <li key={i} className="panel !p-4">
                  <p className="font-medium">{e.title}</p>
                  <p className="muted text-sm">{[fmtDate(e.date), e.location].filter((x) => x && x !== '-').join(' - ')}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold">Give directly</h2>
          <p className="muted mt-3 text-sm">A one-off donation. It has nothing to do with the prize draw.</p>
          {searchParams?.thanks && <p className="success mt-4" role="status">Thank you. Your donation is on its way.</p>}
          {searchParams?.error === 'amount' && <p className="error mt-4" role="alert">Enter at least {inr(MIN_DONATION)}.</p>}
          <form action={donate} className="mt-4 flex gap-3">
            <input type="hidden" name="charity_id" value={charity.id} />
            <input name="amount" type="number" min={MIN_DONATION} step="1" defaultValue={500} className="field" aria-label="Donation amount in rupees" />
            <button className="btn btn-copper shrink-0">Donate</button>
          </form>
        </section>
      </div>
    </div>
  );
}
