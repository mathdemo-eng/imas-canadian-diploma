// Content model shared by the public site, the admin panel and the database.
// Every type here maps 1:1 to a Supabase table (see supabase/migrations).

export type Cluster =
  | 'language-arts'
  | 'humanities'
  | 'sciences'
  | 'mathematics'
  | 'creative-arts'
  | 'wellness'
  | 'career'
  | 'school'
  | 'prep';

export type CourseKind = 'nb' | 'school' | 'prep';

export interface Course {
  id: string;
  name: string;
  /** New Brunswick course number, e.g. "110", "111/2", "120". Empty for unnumbered courses. */
  code: string;
  cluster: Cluster;
  kind: CourseKind;
  credit_hours: number;
  description: string;
  sort: number;
}

export type Stream = 'CAN' | 'CAD';
export type Focus = 'science' | 'commerce' | null;

export interface Track {
  id: string;
  name: string;
  stream: Stream;
  focus: Focus;
  entry_grade: 10 | 11;
  duration_years: number;
  /** The course total as published by IMAS for this track. */
  stated_total: number;
  summary: string;
  sort: number;
}

/** FY = taught across Semesters 1 & 2. */
export type Term = 'FY' | 'S1' | 'S2';

export interface Placement {
  id: string;
  track_id: string;
  grade: 10 | 11 | 12;
  term: Term;
  /** Courses sharing a slot within the same grade and term are shown together on one card. */
  slot: number;
  course_id: string;
  /** "Extension to Grade 10": the course continues from Grade 10 and is not a new subject. */
  extension: boolean;
  note: string;
}

export interface Partner {
  id: string;
  name: string;
  location: string;
  website: string;
  figure: string;
  figure_label: string;
  summary: string;
  highlights: string[];
  eligibility_note: string;
  contact_email: string;
  /** Optional photo of the campus or city: a full https:// image link. */
  image_url: string;
  image_credit: string;
  sort: number;
  published: boolean;
}

export type Audience = 'all' | 'new' | 'current';

export interface Faq {
  id: string;
  question: string;
  answer: string;
  audience: Audience;
  sort: number;
  published: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  published_at: string;
  published: boolean;
}

export interface DocumentLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  sort: number;
  published: boolean;
}

export interface Settings {
  admissions_phone: string;
  admissions_email: string;
  /** Subject line used when a visitor opens an enquiry email in Gmail. */
  enquiry_subject: string;
  website_selangor: string;
  website_kl: string;
  ielts_min_band: number;
  ca_weight: number;
  exam_weight: number;
  pass_mark: number;
  attendance_min: number;
  total_credit_hours: number;
  grade12_credit_hours: number;
  hero_title: string;
  hero_lede: string;
}

export interface ContentBundle {
  settings: Settings;
  courses: Course[];
  tracks: Track[];
  placements: Placement[];
  partners: Partner[];
  faqs: Faq[];
  announcements: Announcement[];
  documents: DocumentLink[];
  /** Where this content came from, and any error reaching the database. */
  source?: 'database' | 'built-in';
  loadError?: string;
}

/** Collections the admin panel can edit (settings is edited as a single form). */
export type CollectionKey = 'courses' | 'tracks' | 'placements' | 'partners' | 'faqs' | 'announcements' | 'documents';
