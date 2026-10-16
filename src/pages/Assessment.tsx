import { ClipboardCheck, Eye, FileText, MessagesSquare, Percent, UserCheck } from 'lucide-react';
import { Chapter } from '../components/Chapter';
import { SplitBar } from '../components/charts';
import { ParallaxBanner, PhotoCaption, RevealImage } from '../components/media';
import library from '../assets/photos/library.webp';
import studentPath from '../assets/photos/student-path.webp';
import { Callout, Section } from '../components/ui';
import { useSite } from '../content/useSite';

export function Assessment() {
  const { settings: s } = useSite();
  return (
    <Chapter
      lede={`In the CAN stream, every course is marked ${s.ca_weight}% on continuous assessment and ${s.exam_weight}% on the final examination. There are no midterm examinations.`}
    >
      <Section eyebrow="How a course is marked" title={`${s.ca_weight}% continuous assessment, ${s.exam_weight}% final exam`}>
        <SplitBar
          caption={`Each course: ${s.ca_weight}% continuous assessment and ${s.exam_weight}% final examination.`}
          parts={[
            { label: 'Continuous assessment', value: s.ca_weight, detail: 'Assignments, end-of-chapter tests and a project, across the semester' },
            { label: 'Final examination', value: s.exam_weight, detail: 'One summative examination at the end of the semester' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: FileText, t: 'Assignments', d: 'Regular tasks that show what you have learned and how you apply it.' },
            { icon: ClipboardCheck, t: 'End-of-chapter tests', d: 'A short test at the end of each chapter, so you know where you stand as you go.' },
            { icon: Percent, t: 'Project', d: 'An extended piece of work that brings a unit together and shows deeper understanding.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="grid content-start gap-2 rounded-xl border border-rule p-5">
              <Icon size={22} aria-hidden className="text-viz-1" />
              <p className="t-h3">{t}</p>
              <p className="text-ink-2">{d}</p>
            </div>
          ))}
        </div>
        <Callout tone="blue" title="No midterm examinations">
          CAN students do not sit midterm examinations. Your continuous assessment builds up over the whole semester instead.
        </Callout>
      </Section>

      <ParallaxBanner src={library} alt="An IMAS student reading in the school library" sizeClass="aspect-[4/3] sm:aspect-[2/1]" position="60% 40%">
        <PhotoCaption
          title="Steady work, all semester"
          text={`${s.ca_weight}% of every course comes from what you do before the final examination.`}
        />
      </ParallaxBanner>

      <Section
        eyebrow="Assessment for and of learning"
        title="Two kinds of assessment"
        intro={<p>New Brunswick separates assessment that helps you improve from assessment that measures what you have achieved.</p>}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid content-start gap-3 rounded-2xl bg-blue-tint p-6">
            <p className="t-label text-blue-deep">Assessment for learning</p>
            <p className="font-display text-2xl font-semibold">Formative</p>
            <p className="text-ink-2">Happens during teaching, to help you improve while you are still learning.</p>
            <ul className="grid list-disc gap-1 pl-5 text-ink-2">
              <li>Exit tickets and quick checks of understanding</li>
              <li>Conferences with your teacher</li>
              <li>Peer feedback and self-assessment</li>
              <li>Drafts, learning logs and journals</li>
            </ul>
          </div>
          <div className="grid content-start gap-3 rounded-2xl bg-forest-tint p-6">
            <p className="t-label text-forest">Assessment of learning</p>
            <p className="font-display text-2xl font-semibold">Summative</p>
            <p className="text-ink-2">Happens at the end of a unit or course, to measure what you have achieved.</p>
            <ul className="grid list-disc gap-1 pl-5 text-ink-2">
              <li>End-of-chapter tests</li>
              <li>Projects and performance tasks</li>
              <li>Final essays and lab reports</li>
              <li>The final examination</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Triangulation"
        title="Evidence from three sources"
        intro={
          <p>
            Your teachers build each grade from three kinds of evidence gathered across the semester, not from written work alone. This is how New
            Brunswick makes sure a grade reflects what you really know and can do.
          </p>
        }
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, t: 'Products', d: 'What you produce: essays, tests, lab reports, projects and the final exam.' },
            { icon: Eye, t: 'Observations', d: 'What your teacher sees: lab technique, group work, presentations and problem solving.' },
            { icon: MessagesSquare, t: 'Conversations', d: 'What you explain: conferences, oral reasoning and defending an argument.' },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="grid content-start gap-2 border-t-2 border-blue pt-4">
              <Icon size={22} aria-hidden className="text-blue" />
              <p className="t-h3">{t}</p>
              <p className="text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="The rules" title="Passing and attendance">
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,0.75fr)_1fr]">
        <RevealImage src={studentPath} alt="An IMAS student with a backpack on the way to class" aspect="3 / 4" position="45% 40%" />
        <div className="grid content-start gap-6">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule">
          <div className="grid content-start gap-1 bg-sheet p-6">
            <dt className="flex items-center gap-2 font-semibold">
              <Percent size={18} aria-hidden className="text-maroon" /> Pass mark
            </dt>
            <dd className="font-display text-4xl font-semibold t-num">{s.pass_mark}%</dd>
            <dd className="text-ink-2">The minimum mark in every course. It is a New Brunswick graduation requirement.</dd>
          </div>
          <div className="grid content-start gap-1 bg-sheet p-6">
            <dt className="flex items-center gap-2 font-semibold">
              <UserCheck size={18} aria-hidden className="text-maroon" /> Attendance
            </dt>
            <dd className="font-display text-4xl font-semibold t-num">{s.attendance_min}%</dd>
            <dd className="text-ink-2">The minimum attendance. Below it, you may not be registered for the final examination.</dd>
          </div>
        </dl>
        <Callout tone="green" title="Showing up counts">
          Regular attendance keeps your continuous assessment on track: every assignment, test and project adds to your final mark.
        </Callout>
        <p className="measure text-sm text-ink-3">
          Dual Program students’ IGCSE subjects are assessed by Cambridge examinations, graded A* to G.
        </p>
        </div>
        </div>
      </Section>

      <Section eyebrow="Our assessment vision" title="High school assessment will model and promote excellence.">
        <blockquote className="measure border-l-4 border-maroon pl-5 font-display text-xl italic leading-relaxed text-ink-2">
          Assessment practices accurately align with learning outcomes, promote a culture of continuous learning, and engage professional judgment through
          ongoing professional learning.
        </blockquote>
      </Section>
    </Chapter>
  );
}
