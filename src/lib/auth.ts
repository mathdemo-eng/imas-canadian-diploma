import { useEffect, useState } from 'react';
import { demo } from './demo-backend';
import { callStudentsFunction } from './server-function';
import { getSupabase, supabaseConfigured } from './supabase';

/** Student accounts are <Student ID>@imas.edu.my. */
export const SCHOOL_DOMAIN = 'imas.edu.my';

/** "260001" → "260001@imas.edu.my". A full email address is used as typed. */
export function loginEmail(identifier: string) {
  const v = identifier.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${SCHOOL_DOMAIN}`;
}

export interface SignedInUser {
  id: string;
  email: string;
}

export type AuthState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: SignedInUser };

/** Who is signed in. Updates when someone signs in or out. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!supabaseConfigured) {
      const update = () =>
        setState(demo.signedIn ? { status: 'signed-in', user: { id: demo.signedIn.id, email: demo.signedIn.email } } : { status: 'signed-out' });
      update();
      demo.listeners.add(update);
      return () => {
        demo.listeners.delete(update);
      };
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getSupabase().then(async (sb) => {
      const apply = (s: { user: { id: string; email?: string } } | null) => {
        if (cancelled) return;
        setState(s?.user ? { status: 'signed-in', user: { id: s.user.id, email: s.user.email ?? '' } } : { status: 'signed-out' });
      };
      const { data } = await sb.auth.getSession();
      apply(data.session);
      const sub = sb.auth.onAuthStateChange((_event, session) => apply(session));
      unsubscribe = () => sub.data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return state;
}

/** Signs in with a Student ID (or staff email) and password. Returns an error message, or null. */
export async function signIn(identifier: string, password: string): Promise<string | null> {
  const email = loginEmail(identifier);
  if (!identifier.trim() || !password) return 'Enter your ID and password.';

  if (!supabaseConfigured) {
    const account = demo.accounts.get(email);
    if (!account || account.password !== password) return 'That ID or password isn’t right. Check them and try again.';
    demo.signedIn = account;
    demo.notify();
    return null;
  }

  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) return null;
  if (/invalid login credentials/i.test(error.message)) return 'That ID or password isn’t right. Check them and try again.';
  return `Sign-in didn’t work: ${error.message}`;
}

export async function signOut() {
  if (!supabaseConfigured) {
    demo.signedIn = null;
    demo.notify();
    return;
  }
  const sb = await getSupabase();
  await sb.auth.signOut();
}

/** Rules for a student's own password. Returns the rules that are not met yet. */
export function passwordProblems(password: string, studentId: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('At least 8 characters');
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) problems.push('Letters and numbers');
  if (studentId && password.toLowerCase().includes(studentId.toLowerCase())) problems.push('Not your Student ID');
  return problems;
}

export const SAME_PASSWORD_MESSAGE = 'Choose a password that is different from your current one.';

/**
 * Saves a new password for the signed-in student. The server function sets it and records
 * that the first password has been replaced, so the portal can't be unlocked any other way.
 */
export async function changePassword(newPassword: string): Promise<string | null> {
  if (!supabaseConfigured) {
    const me = demo.signedIn;
    if (!me) return 'You are not signed in.';
    if (me.password === newPassword) return SAME_PASSWORD_MESSAGE;
    me.password = newPassword;
    const record = demo.students.find((s) => s.id === me.id);
    if (record) record.must_change_password = false;
    demo.notify();
    return null;
  }
  try {
    await callStudentsFunction({ action: 'set-password', password: newPassword });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Staff change their own password (editors aren't asked to on first sign-in). */
export async function changeStaffPassword(newPassword: string): Promise<string | null> {
  if (newPassword.length < 8) return 'Use at least 8 characters.';
  if (!supabaseConfigured) return null;
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (!error) return null;
  if (/different from the old password/i.test(error.message)) return SAME_PASSWORD_MESSAGE;
  return `Your password wasn’t saved: ${error.message}`;
}
