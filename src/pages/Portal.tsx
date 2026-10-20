import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, KeyRound, LogOut, X } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { PasswordInput } from '../components/PasswordInput';
import { BLOCKED_MESSAGE, changePassword, passwordProblems, signIn, signOut, useAuth } from '../lib/auth';
import { DEMO_STUDENT } from '../lib/demo-backend';
import { fetchMyStudent, type StudentRecord } from '../lib/students';
import { isPreviewBuild, supabaseConfigured } from '../lib/supabase';

// The portal itself loads only after a student signs in, so the public pages stay light.
const StudentPortal = lazy(() => import('../portal/StudentPortal').then((m) => ({ default: m.StudentPortal })));

/** The Student Portal: sign in, create your own password, then your profile. */
export function Portal() {
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.user.id : null;
  const student = useQuery({
    queryKey: ['my-student', userId],
    queryFn: () => fetchMyStudent(userId!),
    enabled: Boolean(userId),
  });

  let body: ReactNode;
  if (auth.status === 'loading' || (userId && student.isLoading)) {
    body = <p role="status" className="text-ink-3">Checking your sign-in…</p>;
  } else if (auth.status === 'signed-out') {
    body = (
      <>
        {auth.error && (
          <div role="alert" className="grid gap-1 rounded-xl border-l-4 border-maroon bg-maroon-tint px-5 py-4">
            <p className="t-h3">The portal can’t connect right now</p>
            <p className="text-ink-2">Please try again later, or tell the Canadian Diploma coordinator.</p>
            <p className="text-sm text-ink-3">{auth.error}</p>
          </div>
        )}
        <SignInForm />
      </>
    );
  } else if (student.isError) {
    body = <Notice title="Your portal couldn’t be loaded" text={(student.error as Error).message} />;
  } else if (!student.data) {
    body = (
      <Notice
        title="This account isn’t a student account"
        text="You are signed in, but there is no student record for this account. Staff should use the admin panel instead."
      />
    );
  } else if (student.data.blocked) {
    body = <Notice title="Your portal access is paused" text={BLOCKED_MESSAGE} />;
  } else if (student.data.must_change_password) {
    body = <CreatePassword student={student.data} first />;
  } else {
    body = (
      <Suspense fallback={<p role="status" className="text-ink-3">Opening your portal…</p>}>
        <StudentPortal student={student.data} viewer="student" footer={<AccountSection student={student.data} />} />
      </Suspense>
    );
  }
  const wide = auth.status === 'signed-in' && student.data && !student.data.must_change_password && !student.data.blocked;

  return (
    <div className="gutter py-6 sm:py-10">
      <div className={`sheet mx-auto grid ${wide ? 'max-w-[1120px]' : 'max-w-[880px]'} gap-8 px-5 py-10 sm:px-10 sm:py-12`}>
        <header className="grid gap-2 border-b border-rule pb-6">
          <p className="t-label text-blue">Student Portal</p>
          <h1 className="t-h1">{auth.status === 'signed-in' && student.data && !student.data.must_change_password ? `Welcome, ${firstName(student.data.full_name)}` : 'Your Student Portal'}</h1>
        </header>
        {body}
      </div>
    </div>
  );
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || 'student';
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border-l-4 border-maroon bg-maroon-tint px-5 py-4">
        <p className="t-h3">{title}</p>
        <p className="text-ink-2">{text}</p>
      </div>
      <SignOutButton />
    </div>
  );
}

function SignOutButton({ quiet = false }: { quiet?: boolean }) {
  const qc = useQueryClient();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        qc.removeQueries({ queryKey: ['my-student'] });
      }}
      className={
        quiet
          ? 'inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-blue'
          : 'inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-rule-strong px-5 font-semibold hover:border-blue hover:text-blue'
      }
    >
      <LogOut size={16} aria-hidden /> Sign out
    </button>
  );
}

function SignInForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await signIn(id, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_0.9fr]">
      <form onSubmit={submit} className="grid content-start gap-4" noValidate>
        <div className="grid gap-1.5">
          <label htmlFor="portal-student-id" className="font-semibold">
            Student ID
          </label>
          <input
            id="portal-student-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
            inputMode="text"
            placeholder="e.g. 260001"
            className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3"
          />
          <p className="text-sm text-ink-3">Just the ID. We add @imas.edu.my for you.</p>
        </div>
        <PasswordInput id="portal-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && (
          <p role="alert" className="rounded-lg bg-maroon-tint px-3 py-2 text-sm text-maroon">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="min-h-11 w-fit rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <aside className="grid content-start gap-3 rounded-2xl bg-sheet-2 p-6">
        <KeyRound size={22} aria-hidden className="text-blue" />
        <p className="t-h3">Signing in for the first time?</p>
        <p className="text-ink-2">Your first password is your ID number. Straight after signing in, you’ll create your own password.</p>
        <p className="text-sm text-ink-3">Forgotten your password? Ask the Canadian Diploma coordinator to reset it.</p>
        {!supabaseConfigured && (
          <p className="rounded-lg border border-dashed border-rule-strong px-3 py-2 text-sm text-ink-2">
            {isPreviewBuild ? 'Preview' : 'Demo'}: sign in with Student ID <strong className="font-mono">{DEMO_STUDENT.studentId}</strong> and password{' '}
            <strong className="font-mono">{DEMO_STUDENT.password}</strong>.
          </p>
        )}
      </aside>
    </div>
  );
}

function CreatePassword({ student, first, onDone }: { student: StudentRecord; first: boolean; onDone?: () => void }) {
  const qc = useQueryClient();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const problems = passwordProblems(pw, student.student_id);
  const rules = ['At least 8 characters', 'Letters and numbers', 'Not your Student ID'];
  const matches = pw.length > 0 && pw === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length) return setError('Your new password doesn’t meet all the rules yet.');
    if (!matches) return setError('The two passwords don’t match.');
    setBusy(true);
    setError('');
    const err = await changePassword(pw);
    setBusy(false);
    if (err) return setError(err);
    await qc.invalidateQueries({ queryKey: ['my-student'] });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="grid max-w-[520px] gap-5" noValidate>
      {first && (
        <div className="grid gap-1 rounded-xl border-l-4 border-blue bg-blue-tint px-5 py-4">
          <p className="t-h3">Create your own password to continue</p>
          <p className="text-ink-2">
            You signed in with your ID number. Choose a password only you know before you use your portal. You can’t skip this step.
          </p>
        </div>
      )}
      <PasswordInput id="new-password" label="New password" value={pw} onChange={setPw} autoComplete="new-password" />
      <ul className="grid gap-1 text-sm" aria-label="Password rules">
        {rules.map((r) => {
          const ok = pw.length > 0 && !problems.includes(r);
          return (
            <li key={r} className={`flex items-center gap-2 ${ok ? 'text-green-ink' : 'text-ink-3'}`}>
              {ok ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
              {r}
            </li>
          );
        })}
      </ul>
      <PasswordInput id="confirm-password" label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error && (
        <p role="alert" className="rounded-lg bg-maroon-tint px-3 py-2 text-sm text-maroon">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep disabled:opacity-60">
          {busy ? 'Saving…' : 'Save my password'}
        </button>
        {first ? <SignOutButton quiet /> : onDone && (
          <button type="button" onClick={onDone} className="text-sm font-semibold text-ink-3 hover:text-blue">
            Cancel
          </button>
        )}
      </div>
      {first && <p className="text-sm text-ink-3">On a shared computer? You can sign out, but you’ll be asked to create your password the next time you sign in.</p>}
    </form>
  );
}

function AccountSection({ student }: { student: StudentRecord }) {
  const [changing, setChanging] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section className="grid gap-4 border-t border-rule pt-6">
      <p className="t-label text-ink-3">My account</p>
      {saved && (
        <p role="status" className="rounded-lg bg-green-tint px-4 py-3 font-semibold text-green-ink">
          Your new password is saved.
        </p>
      )}
      {changing ? (
        <CreatePassword
          student={student}
          first={false}
          onDone={() => {
            setChanging(false);
            setSaved(true);
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setChanging(true);
              setSaved(false);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rule-strong px-5 font-semibold hover:border-blue hover:text-blue"
          >
            <KeyRound size={16} aria-hidden /> Change password
          </button>
          <SignOutButton />
        </div>
      )}
    </section>
  );
}
