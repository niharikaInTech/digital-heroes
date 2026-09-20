import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CharityCard from '@/components/CharityCard';

export const metadata = { title: 'Charities - Digital Heroes' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'featured', label: 'Featured' },
  { key: 'events', label: 'Has events' },
];

export default async function CharitiesPage({ searchParams }) {
  const q = (searchParams?.q || '').trim();
  const filter = searchParams?.filter || 'all';

  const supabase = createClient();
  let query = supabase.from('charities').select('*').order('name');

  // strip characters that would break the PostgREST filter syntax
  const safeQ = q.replace(/[,()%*]/g, ' ');
  if (safeQ) query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
  if (filter === 'featured') query = query.eq('featured', true);

  let { data: charities } = await query;
  charities = charities ?? [];
  if (filter === 'events') charities = charities.filter((c) => (c.events || []).length > 0);

  const href = (f) => `/charities?${new URLSearchParams({ ...(q && { q }), filter: f })}`;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-3xl font-semibold sm:text-5xl">Choose who you play for</h1>
      <p className="muted mt-3 max-w-xl">Every subscriber directs part of their fee to one of these causes.</p>

      <form className="mt-8 flex flex-wrap items-center gap-3">
        <input type="hidden" name="filter" value={filter} />
        <input name="q" defaultValue={q} placeholder="Search charities" className="field max-w-xs" aria-label="Search charities" />
        <button className="btn btn-ghost">Search</button>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href(f.key)}
              className={`badge !px-3.5 !py-1.5 ${filter === f.key ? 'badge-green' : 'badge-grey hover:bg-cream/20'}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </form>

      {charities.length === 0 ? (
        <p className="muted mt-12">No charities match that search. Clear the search or pick "All".</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {charities.map((c) => <CharityCard key={c.id} charity={c} />)}
        </div>
      )}
    </div>
  );
}
