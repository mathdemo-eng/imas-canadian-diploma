import { motion, useReducedMotion } from 'framer-motion';
import { MapleLeafIcon } from '../components/media';
import { endYear } from '../lib/academic-year';
import type { StudentRecord } from '../lib/students';

/** The "Canadian Diploma Graduate" label: a seal that turns into place, with the class year. */
export function GraduateSeal({ student }: { student: StudentRecord }) {
  const reduced = useReducedMotion();
  const year = student.graduated_year ? endYear(student.graduated_year) : null;
  return (
    <motion.section
      aria-label="Canadian Diploma Graduate"
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 0.8, 0.3, 1] }}
      className="relative grid items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-deep via-blue to-forest p-6 text-on-blue sm:grid-cols-[auto_1fr] sm:p-8"
    >
      <motion.div
        initial={reduced ? false : { rotate: -120, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 0.8, 0.3, 1], delay: 0.15 }}
        className="relative grid h-32 w-32 place-items-center"
      >
        <svg viewBox="0 0 120 120" aria-hidden className="absolute inset-0 h-full w-full">
          <defs>
            <path id="seal-ring" d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
          </defs>
          <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="2 4" />
          <circle cx="60" cy="60" r="38" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" />
          <text fontSize="9.5" letterSpacing="2.4" fill="currentColor" fontFamily="var(--font-mono)">
            <textPath href="#seal-ring">NEW BRUNSWICK · CANADA · IMAS · MALAYSIA ·</textPath>
          </text>
        </svg>
        <MapleLeafIcon size={46} className="relative" />
      </motion.div>
      <div className="relative grid gap-1">
        <p className="t-label opacity-80">Congratulations</p>
        <p className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Canadian Diploma Graduate</p>
        <p className="opacity-90">
          {student.full_name}
          {year ? ` · Class of ${year}` : ''}
        </p>
      </div>
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: '0%' }}
          animate={{ x: '450%' }}
          transition={{ duration: 1.8, delay: 1, ease: 'easeInOut' }}
        />
      )}
    </motion.section>
  );
}
