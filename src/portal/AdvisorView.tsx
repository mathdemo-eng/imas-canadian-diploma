import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Award, BookOpen, CalendarPlus, ExternalLink, GraduationCap, Mail, School } from 'lucide-react';
import { useState } from 'react';
import { CopyText } from '../components/ui';
import { MapleLeafIcon } from '../components/media';
import { gmailComposeUrl } from '../lib/contact';
import type { Teacher } from '../lib/records';
import type { PortalData } from './StudentPortal';
import { TeacherPhoto } from './ui';

export const APPOINTMENT_REASONS = [
  'Discuss my grades and progress',
  'University applications and scholarships',
  'IELTS preparation',
  'Choosing or changing courses',
  'My Career Life Plan',
  'A personal or wellbeing matter',
  'Other',
];

/** The Grade 12 academic advisor: a real IMAS teacher assigned by the school. */
export function AdvisorView({ d }: { d: PortalData }) {
  const { student } = d;
  const advisor = d.teacher(student.advisor_id);

  if (student.current_grade !== 12 && student.enrolment_status !== 'graduated') {
    return (
      <Placeholder
        title="Your academic advisor joins you in Grade 12"
        text="In your final year, IMAS assigns you a Grade 12 subject teacher as your academic advisor, to guide you through graduation, university applications and IELTS. Until then, your class teacher and the Canadian Diploma coordinator are there to help."
      />
    );
  }
  if (!advisor) {
    return <Placeholder title="Your academic advisor will be assigned soon" text="The school is matching every Grade 12 student with an advisor. Their profile and how to book an appointment will appear here." />;
  }
  return <AdvisorProfile d={d} advisor={advisor} />;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid justify-items-center gap-4 rounded-3xl border-2 border-dashed border-rule-strong px-6 py-12 text-center">
      <span className="grid h-24 w-24 place-items-center rounded-full bg-sheet-2 text-blue">
        <GraduationCap size={40} aria-hidden />
      </span>
      <h2 className="font-display text-3xl font-semibold">{title}</h2>
      <p className="measure text-ink-2">{text}</p>
    </div>
  );
}

function AdvisorProfile({ d, advisor }: { d: PortalData; advisor: Teacher }) {
  const reduced = useReducedMotion();
  const [booking, setBooking] = useState(false);
  const years = advisor.joined_imas ? new Date().getFullYear() - advisor.joined_imas : null;
  const enter = (delay: number) => (reduced ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.22, 0.8, 0.3, 1] as const } });

  return (
    <div className="grid gap-8">
      <section aria-labelledby="advisor-name" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-deep via-blue to-forest p-6 text-on-blue sm:p-10">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 opacity-15"
          initial={reduced ? false : { rotate: -25, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <MapleLeafIcon size={260} />
        </motion.span>
        <div className="relative grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <motion.div
            className="relative h-36 w-36 sm:h-44 sm:w-44"
            initial={reduced ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 16 }}
          >
            {!reduced && (
              <motion.span
                aria-hidden
                className="absolute -inset-2 rounded-full border-2 border-dashed border-current opacity-50"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              />
            )}
            <TeacherPhoto name={advisor.full_name} photo={advisor.photo} className="relative h-full w-full text-5xl ring-4 ring-current/30" />
          </motion.div>
          <div className="grid gap-2">
            <motion.p {...enter(0.1)} className="t-label opacity-85">
              Your academic advisor
            </motion.p>
            <motion.h2 {...enter(0.18)} id="advisor-name" className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              {advisor.full_name}
            </motion.h2>
            {advisor.title && (
              <motion.p {...enter(0.26)} className="text-lg opacity-90">
                {advisor.title}
              </motion.p>
            )}
            <motion.div {...enter(0.34)} className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setBooking((b) => !b)}
                aria-expanded={booking}
                aria-controls="booking"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sheet px-5 font-semibold text-blue-deep shadow-sm hover:opacity-90"
              >
                <CalendarPlus size={18} aria-hidden /> Book an appointment
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <AnimatePresence initial={false}>{booking && <Booking d={d} advisor={advisor} onClose={() => setBooking(false)} />}</AnimatePresence>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <motion.section {...enter(0.2)} aria-labelledby="advisor-quals" className="grid content-start gap-4 rounded-2xl border border-rule p-6">
          <h3 id="advisor-quals" className="flex items-center gap-2 t-label text-ink-3">
            <Award size={16} aria-hidden className="text-blue" /> Qualifications
          </h3>
          {advisor.qualifications.length ? (
            <ul className="grid gap-3">
              {advisor.qualifications.map((q, i) => (
                <motion.li
                  key={q}
                  initial={reduced ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex gap-3"
                >
                  <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue" />
                  <span>{q}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-3">Not added yet.</p>
          )}
          {advisor.experience && (
            <>
              <h3 className="mt-2 flex items-center gap-2 t-label text-ink-3">
                <School size={16} aria-hidden className="text-blue" /> Experience at IMAS
              </h3>
              <p className="text-ink-2">{advisor.experience}</p>
            </>
          )}
        </motion.section>

        <motion.section {...enter(0.3)} aria-label="Details" className="grid content-start gap-5 rounded-2xl bg-sheet-2 p-6">
          {years !== null && years >= 0 && (
            <div className="grid gap-0.5">
              <span className="t-label text-ink-3">At IMAS since</span>
              <span className="font-display text-3xl font-semibold t-num">{advisor.joined_imas}</span>
              <span className="text-sm text-ink-2">{years <= 1 ? 'Joined recently' : `${years} years with the school`}</span>
            </div>
          )}
          {advisor.subjects && (
            <div className="grid gap-1">
              <span className="flex items-center gap-2 t-label text-ink-3">
                <BookOpen size={15} aria-hidden /> Teaches
              </span>
              <span>{advisor.subjects}</span>
            </div>
          )}
          {advisor.email && (
            <div className="grid gap-1">
              <span className="flex items-center gap-2 t-label text-ink-3">
                <Mail size={15} aria-hidden /> Email
              </span>
              <CopyText value={advisor.email} label="advisor email" />
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

function Booking({ d, advisor, onClose }: { d: PortalData; advisor: Teacher; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const topic = reason === 'Other' ? other.trim() : reason;
  const track = d.site.tracks.find((t) => t.id === d.student.track_id);
  const greeting = advisor.full_name;
  const subject = topic ? `Appointment request: ${topic} (${d.student.full_name}, ${d.student.student_id})` : '';
  const body = [
    `Dear ${greeting},`,
    '',
    `I would like to book an appointment with you about: ${topic}.`,
    '',
    'A little more detail:',
    '',
    '',
    'Days and times that suit me:',
    '- ',
    '- ',
    '',
    'Thank you,',
    d.student.full_name,
    `Student ID ${d.student.student_id}${track ? ` · ${track.name}` : ''} · Grade ${d.student.current_grade ?? 12}`,
  ].join('\n');
  const href = topic && advisor.email ? gmailComposeUrl(advisor.email, subject, body) : undefined;

  return (
    <motion.section
      id="booking"
      aria-labelledby="booking-title"
      initial={reduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="grid gap-5 rounded-2xl border-2 border-blue p-6">
        <div className="grid gap-1">
          <h3 id="booking-title" className="font-display text-2xl font-semibold">
            What would you like to talk about?
          </h3>
          <p className="text-ink-2">Choose one. Next, Gmail opens a message to {advisor.full_name} that is ready for you to complete and send.</p>
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Reason for the appointment</legend>
          {APPOINTMENT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue ${
                reason === r ? 'border-blue bg-blue-tint font-semibold' : 'border-rule hover:border-blue'
              }`}
            >
              <input type="radio" name="appointment-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-blue" />
              {r}
            </label>
          ))}
        </fieldset>
        {reason === 'Other' && (
          <div className="grid gap-1.5">
            <label htmlFor="appointment-other" className="font-semibold">
              Tell your advisor what it’s about
            </label>
            <input
              id="appointment-other"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={120}
              className="min-h-11 rounded-lg border border-rule-strong bg-sheet px-3"
              placeholder="For example: a summer programme I’m applying to"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {d.readOnly ? (
            <p className="text-sm text-ink-3">Staff preview: students open the email from here.</p>
          ) : href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue px-6 font-semibold text-on-blue hover:bg-blue-deep"
            >
              Write the email in Gmail <ExternalLink size={16} aria-hidden />
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-full bg-sheet-2 px-6 font-semibold text-ink-3" aria-disabled="true">
              {advisor.email ? 'Choose a reason first' : 'Your advisor’s email hasn’t been added yet'}
            </span>
          )}
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-4 font-semibold text-ink-2 hover:text-blue">
            Close
          </button>
        </div>
        {advisor.email && <p className="text-sm text-ink-3">Not using Gmail? Email {advisor.email} directly.</p>}
      </div>
    </motion.section>
  );
}
