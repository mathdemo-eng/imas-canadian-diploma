import type { Faq } from '../types';

type Row = Omit<Faq, 'sort' | 'published'>;

const rows: Row[] = [
  {
    id: 'what-is',
    audience: 'new',
    question: 'What is the Canadian Diploma at IMAS?',
    answer:
      'It is the official New Brunswick High School Diploma from Canada, taught at IMAS. Graduates receive the same diploma as students in New Brunswick, signed by the province’s Minister of Education.',
  },
  {
    id: 'recognised-malaysia',
    audience: 'new',
    question: 'Is the diploma recognised in Malaysia?',
    answer:
      'Yes. The programme is approved by the Ministry of Education Malaysia, and the New Brunswick High School Graduation Diploma is listed by the Malaysian Qualifications Agency (MQA) as an entry qualification for bachelor’s degree programmes.',
  },
  {
    id: 'can-vs-cad',
    audience: 'new',
    question: 'What is the difference between CAN and the Dual Program (CAD)?',
    answer:
      'CAN students follow the Canadian curriculum only. Dual Program (CAD) students also take Cambridge IGCSE examinations, so they finish with two certificates: the IGCSE and the New Brunswick High School Diploma.',
  },
  {
    id: 'when-join',
    audience: 'new',
    question: 'When can I join?',
    answer:
      'You can join in Grade 10 (a three-year programme) or in Grade 11 (a two-year programme). Two years is the minimum.',
  },
  {
    id: 'assessment',
    audience: 'all',
    question: 'How am I assessed?',
    answer:
      'Each CAN course is marked 60% on continuous assessment (assignments, end-of-chapter tests and a project) and 40% on the final examination. There are no midterm examinations.',
  },
  {
    id: 'ielts',
    audience: 'all',
    question: 'What IELTS score do I need?',
    answer:
      'IMAS requires IELTS band 6 or higher to graduate. The school prepares you for IELTS during the programme and arranges for you to sit the exam.',
  },
  {
    id: 'credit-hour',
    audience: 'all',
    question: 'What is a credit-hour?',
    answer:
      'It is how New Brunswick measures study. Each course is worth 4 credit-hours and is designed for 90 hours of teaching. You need 100 credit-hours to graduate.',
  },
  {
    id: 'pass-mark',
    audience: 'current',
    question: 'What mark do I need to pass a course?',
    answer: 'You need at least 60% in every course.',
  },
  {
    id: 'extension',
    audience: 'current',
    question: 'What does “continues from Grade 10” mean?',
    answer:
      'The course started in Grade 10 and carries on into Grade 11. It is the same course, so it is not counted as a new subject.',
  },
  {
    id: 'prep',
    audience: 'current',
    question: 'What are Prep courses?',
    answer:
      'Prep courses prepare you for your Grade 12 Canadian subjects. CAN students take them in Semester 2 of Grade 11, in the Canadian Preparatory Program.',
  },
  {
    id: 'attendance',
    audience: 'current',
    question: 'Is there an attendance requirement?',
    answer:
      'Yes. You must keep at least 80% attendance. Below that, you may not be registered for the final examination.',
  },
  {
    id: 'drop-subject',
    audience: 'current',
    question: 'Can I drop a subject?',
    answer: 'CAN students cannot drop subjects in Grades 10 and 11.',
  },
  {
    id: 'career-plan',
    audience: 'current',
    question: 'What is the Career Life Plan?',
    answer:
      'A personal plan for your studies and career that you build and keep up to date for the whole programme. It is a graduation requirement, and Career Pathway Design helps you develop it.',
  },
  {
    id: 'canada-university',
    audience: 'all',
    question: 'Can I study at a university in Canada?',
    answer:
      'Yes. The diploma is recognised by universities across Canada and worldwide. AEI’s partner universities, St. Thomas, Mount Allison and Saint Mary’s, offer tuition savings to graduates of the New Brunswick programme.',
  },
  {
    id: 'fees',
    audience: 'new',
    question: 'How much does the programme cost?',
    answer: 'Please speak to our admissions team for the current fees for your entry year.',
  },
];

export const faqs: Faq[] = rows.map((r, i) => ({ ...r, sort: (i + 1) * 10, published: true }));
