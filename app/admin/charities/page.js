import { createClient } from '@/lib/supabase/server';
import { createCharity, updateCharity, deleteCharity } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';

export const metadata = { title: 'Charities - Admin' };

const eventsToText = (events) =>
  (events || []).map((e) => [e.title, e.date, e.location].filter(Boolean).join(' | ')).join('\n');

// Same fields for "add" and "edit"
function CharityFields({ c }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={c?.name} className="field" required />
        </div>
        <div>
          <label className="label">Website</label>
          <input name="website" type="url" defaultValue={c?.website ?? ''} className="field" placeholder="https://" />
        </div>
      </div>
      <div>
        <label className="label">Image URL</label>
        <input name="image_url" type="url" defaultValue={c?.image_url ?? ''} className="field" placeholder="https://" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" defaultValue={c?.description} rows={3} className="field" />
      </div>
      <div>
        <label className="label">Events (one per line: Title | 2026-11-02 | Location)</label>
        <textarea name="events" defaultValue={eventsToText(c?.events)} rows={3} className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={c?.featured} className="accent-[#6b9e78]" />
        Show on the homepage
      </label>
    </div>
  );
}

export default async function AdminCharities() {
  const supabase = createClient();
  const { data: charities } = await supabase.from('charities').select('*').order('name');

  return (
    <div className="space-y-8">
      <details className="panel">
        <summary className="cursor-pointer text-lg font-semibold">Add a charity</summary>
        <form action={createCharity} className="mt-5 space-y-4">
          <CharityFields />
          <button className="btn btn-primary">Add charity</button>
        </form>
      </details>

      <div className="space-y-4">
        {(charities ?? []).map((c) => (
          <details key={c.id} className="panel">
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-lg font-semibold">{c.name}</span>
              {c.featured && <span className="badge badge-green">Featured</span>}
            </summary>
            <form action={updateCharity} className="mt-5 space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <CharityFields c={c} />
              <div className="flex gap-3">
                <button className="btn btn-primary">Save changes</button>
              </div>
            </form>
            <form action={deleteCharity} className="mt-3">
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton className="btn btn-danger" message={`Delete ${c.name}? Users who chose it will have no charity selected.`}>
                Delete charity
              </ConfirmButton>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
