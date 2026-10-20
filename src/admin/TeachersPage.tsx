import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Mail, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { deleteTeacher, saveTeacher, type Teacher } from '../lib/records';
import { TeacherPhoto } from '../portal/ui';
import { Field, Message, btn, errorText, input, refreshRecords, useStudents, useTeachers } from './kit';

const EMPTY: Omit<Teacher, 'id'> = {
  full_name: '',
  email: '',
  title: '',
  subjects: '',
  qualifications: [],
  experience: '',
  joined_imas: null,
  photo: '',
  active: true,
  sort: 0,
};

/** Shrinks a photo to a small square-ish JPEG, so it loads fast and fits in the database. */
async function resizePhoto(file: File, max = 400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file couldn’t be opened as a picture. Try a JPG or PNG.'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.7, 0.55]) {
      const data = canvas.toDataURL('image/jpeg', q);
      if (data.length < 380_000) return data;
    }
    throw new Error('That photo is too detailed to store. Try a smaller picture.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TeachersPage() {
  const teachers = useTeachers();
  const students = useStudents();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const advisees = (id: string) => (students.data ?? []).filter((s) => s.advisor_id === id).length;

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="t-h1">Teachers</h1>
          <p className="measure text-ink-2">
            Teacher profiles are used in three places: as a student’s <strong className="text-ink">academic advisor</strong> (shown from Grade 12 with a button to
            book an appointment), as the teacher of each course, and in the feedback results. Assign advisors on each student’s page or for a group on the
            Students page.
          </p>
        </div>
        <button type="button" className={btn.primary} onClick={() => setEditing('new')} disabled={editing === 'new'}>
          <Plus size={18} aria-hidden /> Add a teacher
        </button>
      </div>

      {editing === 'new' && <TeacherForm teacher={{ ...EMPTY, sort: (teachers.data?.length ?? 0) + 1 }} onDone={() => setEditing(null)} />}

      {teachers.isLoading && <p role="status" className="text-ink-3">Loading teachers…</p>}
      {teachers.isError && <Message tone="error">{errorText(teachers.error)}</Message>}
      {teachers.data?.length === 0 && editing !== 'new' && (
        <p className="rounded-xl border border-dashed border-rule-strong p-6 text-ink-3">No teachers yet. Add the Grade 12 teachers who will be academic advisors first.</p>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {(teachers.data ?? []).map((t) =>
          editing === t.id ? (
            <li key={t.id} className="lg:col-span-2">
              <TeacherForm teacher={t} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={t.id} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl border border-rule bg-sheet p-5 ${t.active ? '' : 'opacity-70'}`}>
              <TeacherPhoto name={t.full_name} photo={t.photo} className="h-16 w-16 text-xl" />
              <div className="grid min-w-0 gap-1">
                <p className="font-display text-xl font-semibold">{t.full_name}</p>
                {t.title && <p className="text-ink-2">{t.title}</p>}
                {t.email && (
                  <p className="flex items-center gap-1.5 truncate text-sm text-ink-3">
                    <Mail size={14} aria-hidden /> {t.email}
                  </p>
                )}
                <p className="text-sm text-ink-3">
                  {advisees(t.id)} {advisees(t.id) === 1 ? 'advisee' : 'advisees'}
                  {t.active ? '' : ' · hidden from students'}
                  {t.photo ? '' : ' · no photo yet'}
                </p>
                <button type="button" onClick={() => setEditing(t.id)} className={`${btn.quiet} -ml-3 w-fit`} aria-label={`Edit ${t.full_name}`}>
                  <Pencil size={15} aria-hidden /> Edit
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function TeacherForm({ teacher, onDone }: { teacher: Omit<Teacher, 'id'> & { id?: string }; onDone: () => void }) {
  const qc = useQueryClient();
  const [t, setT] = useState(teacher);
  const [quals, setQuals] = useState(teacher.qualifications.join('\n'));
  const [joined, setJoined] = useState(teacher.joined_imas ? String(teacher.joined_imas) : '');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const k = `teacher-${teacher.id ?? 'new'}`;
  const set = <K extends keyof Teacher>(key: K, v: Teacher[K]) => setT((x) => ({ ...x, [key]: v }));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await refreshRecords(qc);
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!t.full_name.trim()) return setMsg({ ok: false, text: 'Enter the teacher’s name.' });
    if (t.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.email.trim())) return setMsg({ ok: false, text: 'That email address doesn’t look right.' });
    const year = joined.trim() ? Number(joined) : null;
    if (year !== null && !(Number.isInteger(year) && year >= 1980 && year <= 2100)) return setMsg({ ok: false, text: 'The year they joined IMAS should look like 2019.' });
    void run(() =>
      saveTeacher({
        ...t,
        full_name: t.full_name.trim(),
        email: t.email.trim().toLowerCase(),
        title: t.title.trim(),
        subjects: t.subjects.trim(),
        experience: t.experience.trim(),
        qualifications: quals
          .split('\n')
          .map((q) => q.trim())
          .filter(Boolean),
        joined_imas: year,
      }),
    );
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      set('photo', await resizePhoto(file));
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 rounded-2xl border-2 border-blue bg-sheet p-5 sm:p-6" aria-label={teacher.id ? `Edit ${teacher.full_name}` : 'New teacher'}>
      <div className="flex flex-wrap items-center gap-4">
        <TeacherPhoto name={t.full_name || '?'} photo={t.photo} className="h-20 w-20 text-2xl" />
        <div className="flex flex-wrap gap-2">
          <label className={`${btn.secondary} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-blue`}>
            <ImagePlus size={16} aria-hidden /> {t.photo ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          </label>
          {t.photo && (
            <button type="button" onClick={() => set('photo', '')} className={btn.quiet}>
              <X size={15} aria-hidden /> Remove photo
            </button>
          )}
        </div>
        <p className="w-full text-sm text-ink-3">A head-and-shoulders photo works best. It is made smaller automatically. Without one, the teacher’s initials are shown.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${k}-name`} label="Full name" help="As students address them, e.g. Ms Sarah Lim">
          <input id={`${k}-name`} value={t.full_name} onChange={(e) => set('full_name', e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-email`} label="Email" help="Appointment requests open Gmail addressed to this email.">
          <input id={`${k}-email`} type="email" value={t.email} onChange={(e) => set('email', e.target.value)} placeholder="name@imas.edu.my" className={input} />
        </Field>
        <Field id={`${k}-title`} label="Role" help="e.g. Grade 12 Physics teacher · Academic advisor">
          <input id={`${k}-title`} value={t.title} onChange={(e) => set('title', e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-subjects`} label="Subjects taught" help="e.g. Physics 122, Pre-Calculus 120">
          <input id={`${k}-subjects`} value={t.subjects} onChange={(e) => set('subjects', e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-quals`} label="Qualifications" help="One per line, e.g. MSc Physics, University of Malaya">
          <textarea id={`${k}-quals`} value={quals} onChange={(e) => setQuals(e.target.value)} rows={3} className={`${input} py-2`} />
        </Field>
        <Field id={`${k}-exp`} label="Experience" help="A sentence or two students will read.">
          <textarea id={`${k}-exp`} value={t.experience} onChange={(e) => set('experience', e.target.value)} rows={3} className={`${input} py-2`} />
        </Field>
        <Field id={`${k}-joined`} label="Joined IMAS in" help="The year, e.g. 2019. Shown as years at IMAS.">
          <input id={`${k}-joined`} inputMode="numeric" value={joined} onChange={(e) => setJoined(e.target.value)} className={input} />
        </Field>
        <Field id={`${k}-sort`} label="Order in lists">
          <input id={`${k}-sort`} type="number" value={t.sort} onChange={(e) => set('sort', Number(e.target.value) || 0)} className={input} />
        </Field>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={t.active} onChange={(e) => set('active', e.target.checked)} className="h-5 w-5 accent-blue" />
        <span className="font-semibold">Shown to students</span>
        <span className="text-sm text-ink-3">(untick when a teacher leaves; their past courses keep their name for staff)</span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={btn.primary}>
          {busy ? 'Saving…' : 'Save teacher'}
        </button>
        <button type="button" onClick={onDone} className={btn.quiet}>
          Cancel
        </button>
        {teacher.id && (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {confirm ? (
              <>
                <span className="text-sm">Delete {teacher.full_name}? Their courses and advisees will show no teacher.</span>
                <button type="button" disabled={busy} onClick={() => void run(() => deleteTeacher(teacher.id!))} className={btn.danger}>
                  Yes, delete
                </button>
                <button type="button" onClick={() => setConfirm(false)} className={btn.quiet}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className={`${btn.quiet} text-maroon`}>
                <Trash2 size={15} aria-hidden /> Delete
              </button>
            )}
          </span>
        )}
      </div>
      {msg && <Message tone={msg.ok ? 'ok' : 'error'}>{msg.text}</Message>}
    </form>
  );
}
