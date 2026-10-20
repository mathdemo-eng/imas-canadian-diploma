// IMAS Canadian Diploma: student accounts server function ("manage-students").
//
// Creating sign-in accounts and setting passwords needs Supabase's service role key,
// which must never be in the website. This function holds it on Supabase's servers.
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor,
// name it  manage-students , replace the example code with this whole file, Deploy.
// (The Hosting & Maintenance Guide walks through it.)
//
// Actions (POST JSON):
//   { action: 'import', rows: [{ student_id, full_name, password, track_id, current_grade?, academic_year? }] }   editors only
//   { action: 'reset',  student_id, password }                                     editors only
//   { action: 'delete', student_id }                                               editors only
//   { action: 'block',  student_id, reason }   stops sign-in and hides records      editors only
//   { action: 'unblock', student_id }                                              editors only
//   { action: 'set-password', password }       the signed-in student sets their own password

import { createClient } from 'npm:@supabase/supabase-js@2';

/** Student accounts are <Student ID>@imas.edu.my. */
const DOMAIN = 'imas.edu.my';
const MAX_ROWS = 50;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
const fail = (error: string, status = 400) => reply({ error }, status);

const ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const YEAR_PATTERN = /^[0-9]{4}-[0-9]{4}$/;
/** Long enough to mean "until unblocked". */
const BLOCK_DURATION = '876000h';
const emailFor = (studentId: string) => `${studentId.trim().toLowerCase()}@${DOMAIN}`;
/** For ilike: match the text exactly, ignoring case. */
const exact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

type Row = { student_id?: unknown; full_name?: unknown; password?: unknown; track_id?: unknown; current_grade?: unknown; academic_year?: unknown };
type Result = { student_id: string; status: 'created' | 'exists' | 'error'; message?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail('Use POST.', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return fail('The function is missing its Supabase settings.', 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is calling?
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who, error: whoError } = await admin.auth.getUser(token);
  if (whoError || !who.user) return fail('Please sign in again.', 401);
  const caller = who.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('The request was not valid.');
  }

  // ---- A student creates their own password ---------------------------------
  if (body.action === 'set-password') {
    const { data: me } = await admin.from('students').select('id, student_id').eq('id', caller.id).maybeSingle();
    if (!me) return fail('Only student accounts can do this.', 403);
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8) return fail('Your password needs at least 8 characters.');
    if (password.length > 72) return fail('Your password can have at most 72 characters.');
    if (!/[a-z]/i.test(password) || !/\d/.test(password)) return fail('Your password needs both letters and numbers.');
    if (password.toLowerCase().includes(String(me.student_id).toLowerCase())) return fail('Your password can’t contain your Student ID.');
    const { data: same, error: sameError } = await admin.rpc('is_current_password', { p_user: caller.id, p_password: password });
    if (!sameError && same === true) return fail('Choose a password that is different from your current one.');

    const { error } = await admin.auth.admin.updateUserById(caller.id, { password });
    if (error) return fail(error.code === 'weak_password' ? 'That password is too easy to guess. Try a longer one.' : `Your password wasn’t saved: ${error.message}`);
    const { error: flagError } = await admin.from('students').update({ must_change_password: false }).eq('id', caller.id);
    if (flagError) return fail(`Your password was saved, but your account wasn’t updated: ${flagError.message}`, 500);
    return reply({ ok: true });
  }

  // ---- Everything else is for editors ---------------------------------------
  const { data: editor } = await admin.from('admins').select('email').eq('email', (caller.email ?? '').toLowerCase()).maybeSingle();
  if (!editor) return fail('Only editors can manage student accounts.', 403);

  if (body.action === 'import') {
    const rows = Array.isArray(body.rows) ? (body.rows as Row[]) : [];
    if (rows.length === 0) return fail('No students were sent.');
    if (rows.length > MAX_ROWS) return fail(`Send at most ${MAX_ROWS} students at a time.`);

    const { data: trackRows } = await admin.from('tracks').select('id');
    const tracks = new Set((trackRows ?? []).map((t: { id: string }) => t.id));
    const { data: adminRows } = await admin.from('admins').select('email');
    const staff = new Set((adminRows ?? []).map((a: { email: string }) => a.email));

    const results: Result[] = [];
    for (const row of rows) {
      const student_id = String(row.student_id ?? '').trim();
      const full_name = String(row.full_name ?? '').trim();
      const password = String(row.password ?? '').trim();
      const track_id = row.track_id ? String(row.track_id) : null;
      const current_grade = row.current_grade ? Number(row.current_grade) : null;
      const academic_year = row.academic_year ? String(row.academic_year).trim() : null;
      const bad = (message: string) => results.push({ student_id, status: 'error', message });

      if (!ID_PATTERN.test(student_id)) { bad('The Student ID can only use letters, numbers, dots, dashes and underscores.'); continue; }
      if (!full_name) { bad('The full name is missing.'); continue; }
      if (password.length < 6) { bad('The ID number must be at least 6 characters.'); continue; }
      if (track_id && !tracks.has(track_id)) { bad(`The track “${track_id}” doesn’t exist.`); continue; }
      if (current_grade !== null && ![10, 11, 12].includes(current_grade)) { bad('The grade must be 10, 11 or 12.'); continue; }
      if (academic_year !== null && !YEAR_PATTERN.test(academic_year)) { bad('The academic year must look like 2026-2027.'); continue; }
      const email = emailFor(student_id);
      if (staff.has(email)) { bad(`${email} is an editor’s email, so it can’t be a student account.`); continue; }

      const { data: existing } = await admin.from('students').select('id').ilike('student_id', exact(student_id)).maybeSingle();
      if (existing) { results.push({ student_id, status: 'exists' }); continue; }

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { student_id, full_name },
        app_metadata: { role: 'student' },
      });
      if (error || !created.user) {
        if (error?.code === 'email_exists' || /already been registered/i.test(error?.message ?? '')) {
          bad(`${email} already has a sign-in account that isn’t linked to a student. Delete it in Supabase → Authentication → Users, then add the student again.`);
        } else {
          bad(error?.code === 'weak_password' ? 'Supabase rejected the ID number as a password (too short or too simple).' : `The account couldn’t be created: ${error?.message}`);
        }
        continue;
      }

      const record: Record<string, unknown> = { id: created.user.id, student_id, full_name, track_id, must_change_password: true };
      if (current_grade !== null) record.current_grade = current_grade;
      if (academic_year !== null) record.academic_year = academic_year;
      const { error: insertError } = await admin.from('students').insert(record);
      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id);
        bad(insertError.code === '23505' ? 'This Student ID is already used.' : `The student record couldn’t be saved: ${insertError.message}`);
        continue;
      }
      results.push({ student_id, status: 'created' });
    }
    return reply({ results });
  }

  if (body.action === 'block' || body.action === 'unblock') {
    const student_id = String(body.student_id ?? '').trim();
    const { data: student } = await admin.from('students').select('id').eq('student_id', student_id).maybeSingle();
    if (!student) return fail(`There is no student with the ID ${student_id}.`);
    const blocking = body.action === 'block';
    const { error } = await admin.auth.admin.updateUserById(student.id, { ban_duration: blocking ? BLOCK_DURATION : 'none' });
    if (error) return fail(`The account couldn’t be ${blocking ? 'blocked' : 'unblocked'}: ${error.message}`);
    const { error: flagError } = await admin.from('students').update({ blocked: blocking }).eq('id', student.id);
    if (flagError) return fail(`Sign-in was ${blocking ? 'stopped' : 'restored'}, but the record wasn’t updated: ${flagError.message}`, 500);
    const reason = blocking ? String(body.reason ?? '').trim().slice(0, 500) : '';
    await admin.from('student_notes').upsert({ student_id: student.id, blocked_reason: reason });
    return reply({ ok: true });
  }

  if (body.action === 'reset' || body.action === 'delete') {
    const student_id = String(body.student_id ?? '').trim();
    const { data: student } = await admin.from('students').select('id').eq('student_id', student_id).maybeSingle();
    if (!student) return fail(`There is no student with the ID ${student_id}.`);

    if (body.action === 'reset') {
      const password = String(body.password ?? '').trim();
      if (password.length < 6) return fail('The temporary password must be at least 6 characters.');
      const { error } = await admin.auth.admin.updateUserById(student.id, { password });
      if (error) return fail(`The password couldn’t be reset: ${error.message}`);
      const { error: flagError } = await admin.from('students').update({ must_change_password: true }).eq('id', student.id);
      if (flagError) return fail(`The password was reset, but the student won’t be asked to change it: ${flagError.message}`, 500);
      return reply({ ok: true });
    }

    const { error } = await admin.auth.admin.deleteUser(student.id);
    if (error && !/not found/i.test(error.message)) return fail(`The account couldn’t be removed: ${error.message}`);
    // Removing the account removes the record too; this catches a record whose account had already gone.
    await admin.from('students').delete().eq('id', student.id);
    return reply({ ok: true });
  }

  return fail('Unknown action.');
});
