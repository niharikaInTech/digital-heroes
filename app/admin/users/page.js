import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Users - Admin' };

const STATUS_CLASS = { active: 'badge-green', past_due: 'badge-red', canceled: 'badge-grey', inactive: 'badge-grey' };

export default async function UsersPage({ searchParams }) {
  const q = (searchParams?.q || '').trim().replace(/[,()%*]/g, ' ');
  const supabase = createClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, plan, subscription_status, current_period_end, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: users } = await query;

  return (
    <div>
      <form className="mb-5 flex gap-3">
        <input name="q" defaultValue={q} placeholder="Search by name or email" className="field max-w-sm" aria-label="Search users" />
        <button className="btn btn-ghost">Search</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>Renews</th><th></th></tr></thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name || '-'} {u.role === 'admin' && <span className="badge badge-copper ml-1">admin</span>}</td>
                <td className="muted">{u.email}</td>
                <td>{u.plan || '-'}</td>
                <td><span className={`badge ${STATUS_CLASS[u.subscription_status]}`}>{u.subscription_status}</span></td>
                <td className="muted">{fmtDate(u.current_period_end)}</td>
                <td><Link href={`/admin/users/${u.id}`} className="text-sage hover:text-cream">Manage</Link></td>
              </tr>
            ))}
            {(users ?? []).length === 0 && (
              <tr><td colSpan={6} className="muted py-8 text-center">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
