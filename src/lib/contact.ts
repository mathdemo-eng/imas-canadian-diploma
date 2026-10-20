import type { Settings } from '../content/types';

/**
 * Opens a new Gmail message to the admissions team, ready to send.
 * Visitors who use another email service can copy the address shown beside the button.
 */
export function gmailEnquiryUrl(s: Pick<Settings, 'admissions_email' | 'enquiry_subject'>) {
  const body = [
    'Dear IMAS Admissions,',
    '',
    'I would like to find out more about the Canadian Diploma at IMAS.',
    '',
    'Student’s name:',
    'Current grade and school:',
    'Pathway of interest (CAN or Dual Program):',
    'Phone number:',
    '',
    'Thank you.',
  ].join('\n');
  const q = new URLSearchParams({ view: 'cm', fs: '1', to: s.admissions_email, su: s.enquiry_subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

export const SCHOOL_SITES = (s: Pick<Settings, 'website_selangor' | 'website_kl'>) => [
  { label: 'IMAS Selangor', href: s.website_selangor },
  { label: 'IMAS Kuala Lumpur', href: s.website_kl },
];

/** A new Gmail message with the address, subject and text filled in. */
export function gmailComposeUrl(to: string, subject: string, body: string) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
