import { CLUSTER_LABEL, TERM_LABEL } from '../content/labels';
import type { CollectionKey, ContentBundle } from '../content/types';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'list' | 'date' | 'url' | 'email';

export interface Option {
  value: string;
  label: string;
}

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  /** Static options, or options built from the current content (e.g. the list of courses). */
  options?: Option[] | ((b: ContentBundle) => Option[]);
  /** Stored as a number even though it is chosen from a list. */
  numeric?: boolean;
  /** Nullable select: the empty choice saves as null. */
  nullable?: boolean;
}

export interface CollectionConfig {
  key: CollectionKey;
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  /** New rows get an id made from this field (readable ids for courses and tracks), or a random id. */
  idFrom?: string;
  /** What each row shows in the list. */
  summary: (row: Record<string, unknown>, b: ContentBundle) => { title: string; meta: string };
  defaults: Record<string, unknown>;
  /** Placements are edited one track at a time. */
  filterBy?: { field: string; label: string; options: (b: ContentBundle) => Option[] };
}

const audience: Option[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'new', label: 'New students & parents' },
  { value: 'current', label: 'Current students' },
];
const published: Field = { key: 'published', label: 'Show on the website', type: 'boolean' };
const sort: Field = { key: 'sort', label: 'Order', type: 'number', help: 'Lower numbers appear first. Use steps of 10 so you can slot items in between.' };

const trackOptions = (b: ContentBundle): Option[] => [...b.tracks].sort((x, y) => x.sort - y.sort).map((t) => ({ value: t.id, label: t.name }));

export const COLLECTIONS: Record<CollectionKey, CollectionConfig> = {
  courses: {
    key: 'courses',
    title: 'Courses',
    singular: 'course',
    description: 'Every subject that can appear in a cohort’s academic plan. Edit a course once and every plan that uses it updates.',
    idFrom: 'name',
    fields: [
      { key: 'name', label: 'Course name', type: 'text', required: true, help: 'Without the course number, e.g. “Pre-Calculus”.' },
      { key: 'code', label: 'Course number', type: 'text', help: 'New Brunswick number, e.g. 110, 111/2 or 120. Leave empty if there is none.' },
      { key: 'cluster', label: 'Cluster', type: 'select', required: true, options: Object.entries(CLUSTER_LABEL).map(([value, label]) => ({ value, label })) },
      {
        key: 'kind',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'nb', label: 'New Brunswick course' },
          { value: 'school', label: 'IMAS school course' },
          { value: 'prep', label: 'Grade 12 preparation course' },
        ],
      },
      { key: 'credit_hours', label: 'Credit-hours', type: 'number', help: 'New Brunswick courses are 4. School and prep courses are 0.' },
      { key: 'description', label: 'Short description', type: 'textarea', help: 'One or two sentences students see when they open the course.' },
      sort,
    ],
    defaults: { name: '', code: '', cluster: 'language-arts', kind: 'nb', credit_hours: 4, description: '', sort: 1000 },
    summary: (r) => ({ title: `${r.name}${r.code ? ` ${r.code}` : ''}`, meta: CLUSTER_LABEL[r.cluster as keyof typeof CLUSTER_LABEL] ?? '' }),
  },

  tracks: {
    key: 'tracks',
    title: 'Cohort tracks',
    singular: 'track',
    description: 'Each combination of stream and entry grade. The subjects inside each track are edited under “Subjects in tracks”.',
    idFrom: 'name',
    fields: [
      { key: 'name', label: 'Track name', type: 'text', required: true },
      { key: 'stream', label: 'Stream', type: 'select', required: true, options: [{ value: 'CAN', label: 'CAN · Canadian Diploma' }, { value: 'CAD', label: 'Dual Program (CAD)' }] },
      {
        key: 'focus',
        label: 'Dual Program stream',
        type: 'select',
        nullable: true,
        options: [
          { value: '', label: 'Not applicable (CAN)' },
          { value: 'science', label: 'Science' },
          { value: 'commerce', label: 'Commerce' },
        ],
      },
      { key: 'entry_grade', label: 'Entry grade', type: 'select', numeric: true, required: true, options: [{ value: '10', label: 'Grade 10' }, { value: '11', label: 'Grade 11' }] },
      { key: 'duration_years', label: 'Programme length (years)', type: 'number', required: true },
      { key: 'stated_total', label: 'Number of diploma courses', type: 'number', required: true, help: 'The course total published for this cohort.' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      sort,
    ],
    defaults: { name: '', stream: 'CAN', focus: null, entry_grade: 10, duration_years: 3, stated_total: 0, summary: '', sort: 1000 },
    summary: (r) => ({ title: String(r.name), meta: `${r.duration_years} years · ${r.stated_total} courses` }),
  },

  placements: {
    key: 'placements',
    title: 'Subjects in tracks',
    singular: 'subject',
    description: 'Which course each cohort takes, in which grade and semester. Pick a track to see its subjects.',
    fields: [
      { key: 'track_id', label: 'Track', type: 'select', required: true, options: trackOptions },
      { key: 'grade', label: 'Grade', type: 'select', numeric: true, required: true, options: [10, 11, 12].map((g) => ({ value: String(g), label: `Grade ${g}` })) },
      {
        key: 'term',
        label: 'Semester',
        type: 'select',
        required: true,
        options: (['FY', 'S1', 'S2'] as const).map((t) => ({ value: t, label: TERM_LABEL[t] })),
      },
      {
        key: 'course_id',
        label: 'Course',
        type: 'select',
        required: true,
        options: (b) => [...b.courses].sort((x, y) => x.name.localeCompare(y.name)).map((c) => ({ value: c.id, label: c.code ? `${c.name} ${c.code}` : c.name })),
      },
      { key: 'extension', label: 'Continues from Grade 10 (not a new subject)', type: 'boolean' },
      {
        key: 'slot',
        label: 'Position',
        type: 'number',
        required: true,
        help: 'Order within the semester. Two courses with the same position appear together on one card (e.g. Pre-Calculus 110 & NRF 10).',
      },
      { key: 'note', label: 'Note (optional)', type: 'text' },
    ],
    defaults: { track_id: '', grade: 10, term: 'S1', slot: 100, course_id: '', extension: false, note: '' },
    summary: (r, b) => {
      const c = b.courses.find((x) => x.id === r.course_id);
      return {
        title: c ? `${c.name}${c.code ? ` ${c.code}` : ''}` : String(r.course_id),
        meta: `Grade ${r.grade} · ${TERM_LABEL[r.term as keyof typeof TERM_LABEL]} · position ${r.slot}${r.extension ? ' · continues from Grade 10' : ''}`,
      };
    },
    filterBy: { field: 'track_id', label: 'Track', options: trackOptions },
  },

  partners: {
    key: 'partners',
    title: 'Partner universities',
    singular: 'university',
    description: 'Universities shown in Chapter VII and on the home page.',
    idFrom: 'name',
    fields: [
      { key: 'name', label: 'University', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'figure', label: 'Headline figure', type: 'text', help: 'e.g. “≈ CA$45,000”' },
      { key: 'figure_label', label: 'What the figure means', type: 'text', help: 'e.g. “tuition discount over a four-year degree”' },
      { key: 'summary', label: 'Summary', type: 'textarea' },
      { key: 'highlights', label: 'Highlights', type: 'list', help: 'One highlight per line.' },
      { key: 'eligibility_note', label: 'Eligibility note', type: 'textarea', help: 'Shown in a highlighted box. Leave empty if not needed.' },
      { key: 'contact_email', label: 'Admissions email', type: 'email' },
      {
        key: 'image_url',
        label: 'Photo link (optional)',
        type: 'url',
        help: 'A link to a campus or city photo you have permission to use, ending in .jpg, .png or .webp. Without one, the card shows a designed postcard instead.',
      },
      { key: 'image_credit', label: 'Photo credit', type: 'text', help: 'e.g. “Photo: Mount Allison University”' },
      sort,
      published,
    ],
    defaults: { name: '', location: '', website: '', figure: '', figure_label: '', summary: '', highlights: [], eligibility_note: '', contact_email: '', image_url: '', image_credit: '', sort: 1000, published: true },
    summary: (r) => ({ title: String(r.name), meta: `${r.location}${r.published ? '' : ' · hidden'}` }),
  },

  faqs: {
    key: 'faqs',
    title: 'Questions & answers',
    singular: 'question',
    description: 'The questions in Appendix A.',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      { key: 'audience', label: 'Mainly for', type: 'select', options: audience },
      sort,
      published,
    ],
    defaults: { question: '', answer: '', audience: 'all', sort: 1000, published: true },
    summary: (r) => ({ title: String(r.question), meta: `${audience.find((a) => a.value === r.audience)?.label ?? ''}${r.published ? '' : ' · hidden'}` }),
  },

  announcements: {
    key: 'announcements',
    title: 'Announcements',
    singular: 'announcement',
    description: 'News shown in the Student Hub, newest first.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Message', type: 'textarea', required: true },
      { key: 'audience', label: 'For', type: 'select', options: audience },
      { key: 'published_at', label: 'Date', type: 'date', required: true },
      published,
    ],
    defaults: { title: '', body: '', audience: 'current', published_at: new Date().toISOString().slice(0, 10), published: true },
    summary: (r) => ({ title: String(r.title), meta: `${r.published_at}${r.published ? '' : ' · hidden'}` }),
  },

  documents: {
    key: 'documents',
    title: 'Documents',
    singular: 'document',
    description: 'Handbooks, forms and guides listed in the Student Hub.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
      {
        key: 'url',
        label: 'Link',
        type: 'url',
        required: true,
        help: 'For a Google Drive file: Share → General access → “Anyone with the link” (Viewer), then copy the link and paste it here.',
      },
      { key: 'category', label: 'Category', type: 'text', help: 'e.g. Handbook, Form, Guide' },
      sort,
      published,
    ],
    defaults: { title: '', description: '', url: '', category: 'Guide', sort: 1000, published: true },
    summary: (r) => ({ title: String(r.title), meta: `${r.category}${r.published ? '' : ' · hidden'}` }),
  },
};

export const COLLECTION_ORDER: CollectionKey[] = ['courses', 'tracks', 'placements', 'partners', 'faqs', 'announcements', 'documents'];

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
