import type { Settings } from '../content/types';

/**
 * Opens a new Gmail message to an admissions team (Selangor unless another address is given), ready to send.
 * Visitors who use another email service can copy the address shown beside the button.
 */
export function gmailEnquiryUrl(s: Pick<Settings, 'admissions_email' | 'enquiry_subject'>, to = s.admissions_email) {
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
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, su: s.enquiry_subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

export interface Campus {
  id: 'selangor' | 'kl';
  name: string;
  short: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
}

/** The IMAS campuses and their admissions teams. A campus without a phone or email is left out. */
export function campuses(
  s: Pick<Settings, 'admissions_phone' | 'admissions_email' | 'website_selangor' | 'admissions_phone_kl' | 'admissions_mobile_kl' | 'admissions_email_kl' | 'website_kl'>,
): Campus[] {
  const list: Campus[] = [
    { id: 'selangor', name: 'IMAS Selangor', short: 'Selangor', phone: s.admissions_phone, mobile: '', email: s.admissions_email, website: s.website_selangor },
    { id: 'kl', name: 'IMAS Kuala Lumpur', short: 'Kuala Lumpur', phone: s.admissions_phone_kl ?? '', mobile: s.admissions_mobile_kl ?? '', email: s.admissions_email_kl ?? '', website: s.website_kl },
  ];
  return list.filter((c) => c.phone.trim() || c.email.trim());
}

/** A phone number as a tap-to-call link: "03-2202 7000" becomes tel:+60322027000. */
export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? digits : digits.startsWith('0') ? `+60${digits.slice(1)}` : digits}`;
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
