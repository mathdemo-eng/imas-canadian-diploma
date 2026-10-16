import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { getSupabase, supabaseConfigured } from '../lib/supabase';

export type AdminState =
  | { status: 'demo' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; email: string; message: string }
  | { status: 'not-admin'; email: string }
  | { status: 'admin'; email: string };

/**
 * Who is using the admin panel. Without a database the panel runs in demo mode.
 * With one, staff sign in with their email and password, and the email must be listed in the `admins` table.
 */
export function useAdminAuth(): AdminState {
  const auth = useAuth();
  const email = auth.status === 'signed-in' ? auth.user.email.toLowerCase() : '';
  const check = useQuery({
    queryKey: ['is-admin', email],
    enabled: supabaseConfigured && Boolean(email),
    queryFn: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.rpc('is_admin');
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  if (!supabaseConfigured) return { status: 'demo' };
  if (auth.status === 'loading') return { status: 'loading' };
  if (auth.status === 'signed-out') return { status: 'signed-out' };
  if (check.isPending) return { status: 'loading' };
  if (check.isError) return { status: 'error', email, message: check.error.message };
  return check.data ? { status: 'admin', email } : { status: 'not-admin', email };
}
