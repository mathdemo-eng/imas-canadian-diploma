import type { Announcement, ContentBundle, DocumentLink, Settings } from '../types';
import { courses } from './courses';
import { faqs } from './faqs';
import { partners } from './partners';
import { placements, tracks } from './tracks';

export const settings: Settings = {
  admissions_phone: '+6019 999 9070',
  admissions_email: 'info@imas.edu.my',
  enquiry_subject: 'Canadian Diploma enquiry',
  website_selangor: 'https://imas.edu.my/',
  website_kl: 'https://kl.imas.edu.my/',
  ielts_min_band: 6,
  ca_weight: 60,
  exam_weight: 40,
  pass_mark: 60,
  attendance_min: 80,
  total_credit_hours: 100,
  grade12_credit_hours: 24,
  hero_title: 'Your Canadian high school diploma, earned at IMAS.',
  hero_lede:
    'IMAS is the first school in Malaysia accredited by New Brunswick, Canada. Our students graduate with the same diploma as students in Canada, without leaving home.',
};

export const announcements: Announcement[] = [
  {
    id: 'student-portal-coming',
    title: 'Your Student Portal is on the way',
    body: 'Soon you will sign in with your IMAS account to see the courses you have completed, your credit-hours, your grades and your projected graduation date.',
    audience: 'current',
    published_at: '2026-10-15',
    published: true,
  },
];

export const documents: DocumentLink[] = [];

export const seedBundle: ContentBundle = {
  settings,
  courses,
  tracks,
  placements,
  partners,
  faqs,
  announcements,
  documents,
};
