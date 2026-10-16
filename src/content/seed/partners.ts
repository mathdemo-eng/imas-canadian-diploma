import type { Partner } from '../types';

// Sources: "NBOSP and St. Thomas University.pdf", "NBOSP and Mount Allison University.pdf"
// (IMAS Drive, Supporting Documents), and AEI's list of partner universities, which names
// Mount Allison, St. Thomas and Saint Mary's. All amounts are in Canadian dollars.

export const partners: Partner[] = [
  {
    id: 'st-thomas',
    name: 'St. Thomas University',
    location: 'Fredericton, New Brunswick',
    website: 'https://www.stu.ca',
    figure: '≈ CA$45,000',
    figure_label: 'tuition discount over a four-year degree',
    summary:
      'STU charges graduates of accredited New Brunswick offshore schools a discounted tuition rate for every year of an undergraduate degree.',
    highlights: [
      'Discounted tuition for all four years of study',
      'Entrance scholarships from CA$500 to CA$100,000',
      'Take STU courses while in Grade 12 at the domestic rate (Advanced Standing), with starts in January, May and September',
      'Free application for students who tour the campus, virtually or in person',
      'Average class size of 23 students in Fredericton, the capital of New Brunswick',
    ],
    eligibility_note: '',
    contact_email: 'admissions@stu.ca',
    image_url: '',
    image_credit: '',
    sort: 10,
    published: true,
  },
  {
    id: 'mount-allison',
    name: 'Mount Allison University',
    location: 'Sackville, New Brunswick',
    website: 'https://mta.ca',
    figure: '≈ CA$20,000',
    figure_label: 'saved through domestic tuition in years one and two',
    summary:
      'Through the NB Advantage Global Program, Mount Allison charges New Brunswick offshore graduates domestic tuition for the first two years of their degree.',
    highlights: [
      'Domestic tuition fees for the first two years',
      'Scholarships from CA$4,000 to CA$56,000, plus bursaries and campus jobs',
      'English proficiency test waived with strong results in English 121 or 122',
      'More than 50 programmes across arts, science, commerce, fine arts and music',
      'Ranked Canada’s top primarily undergraduate university by Maclean’s more often than any other',
    ],
    eligibility_note: '',
    contact_email: 'admissions@mta.ca',
    image_url: '',
    image_credit: '',
    sort: 20,
    published: true,
  },
  {
    id: 'saint-marys',
    name: 'Saint Mary’s University',
    location: 'Halifax, Nova Scotia',
    website: 'https://www.smu.ca',
    figure: 'CA$1,000',
    figure_label: 'off every 3-credit course (≈ CA$40,000 over a degree)',
    summary:
      'An AEI partner university offering tuition reductions to graduates of the New Brunswick programme, subject to its eligibility requirements.',
    highlights: [
      'Tuition reduction on every 3-credit course for the whole undergraduate degree',
      'Estimated total saving of about CA$40,000',
      'Located in Halifax, the largest city in Atlantic Canada',
    ],
    eligibility_note:
      'Saint Mary’s publishes this reduction for New Brunswick programme graduates. Confirm eligibility for offshore-school graduates with its admissions office before applying.',
    contact_email: '',
    image_url: '',
    image_credit: '',
    sort: 30,
    published: true,
  },
];
