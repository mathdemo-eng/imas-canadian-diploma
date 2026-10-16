import { getSupabase } from './supabase';

/** The server function that creates student accounts and sets passwords (supabase/functions/manage-students). */
const FUNCTION = 'manage-students';

const NOT_SET_UP = 'The student accounts function isn’t set up yet. See “Student accounts” in the Hosting & Maintenance Guide.';

/** Calls the student-accounts server function. Throws an Error with a readable message. */
export async function callStudentsFunction<T>(body: Record<string, unknown>): Promise<T> {
  const sb = await getSupabase();
  const { data, error } = await sb.functions.invoke(FUNCTION, { body });
  if (!error) return data as T;

  const ctx = (error as { context?: unknown }).context;
  if (ctx instanceof Response) {
    let detail: string | undefined;
    try {
      detail = ((await ctx.clone().json()) as { error?: string }).error;
    } catch {
      /* not a message from our function */
    }
    if (detail) throw new Error(detail);
    if (ctx.status === 404) throw new Error(NOT_SET_UP);
    if (ctx.status === 401) throw new Error('Your sign-in has expired. Sign out, sign in again and try once more.');
    throw new Error(`The server replied with an error (${ctx.status}). Please try again.`);
  }
  if (/failed to send/i.test(error.message)) {
    throw new Error('The server couldn’t be reached. Check your internet connection and try again. If it keeps happening: ' + NOT_SET_UP);
  }
  throw new Error(error.message);
}
