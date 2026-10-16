import type { Course } from '../types';

// Source: "For Claude - website" (IMAS subject plan, Google Drive).
// Each New Brunswick course is 4 credit-hours (90 hours of instruction).
// School and preparation courses carry no New Brunswick credit.

type Row = Omit<Course, 'sort' | 'credit_hours'> & { credit_hours?: number };

const rows: Row[] = [
  // Language Arts and Languages
  { id: 'arabic-110', name: 'Additional Language (Arabic)', code: '110', cluster: 'language-arts', kind: 'nb', description: 'Builds communication in Arabic across listening, speaking, reading and writing. This is the Additional Language course in the diploma.' },
  { id: 'ela-f10', name: 'English Language Arts Foundational', code: '10', cluster: 'language-arts', kind: 'nb', description: 'Reading, writing, speaking and listening across literary and informational texts. The foundation for English in Grades 11 and 12.' },
  { id: 'ela-f11', name: 'English Language Arts Foundational', code: '11', cluster: 'language-arts', kind: 'nb', description: 'Critical reading, analytical writing and oral communication with longer and more complex texts.' },
  { id: 'ela-12', name: 'English Language Arts', code: '12', cluster: 'language-arts', kind: 'nb', description: 'The Grade 12 English course: critical analysis, research and extended writing that prepare you for university study.' },
  { id: 'writing-110', name: 'Writing', code: '110', cluster: 'language-arts', kind: 'nb', description: 'Writing for different purposes and audiences, from argument to narrative, with drafting, feedback and revision.' },
  { id: 'reading-tutor-120', name: 'Reading Tutor', code: '120', cluster: 'language-arts', kind: 'nb', description: 'You learn evidence-based reading strategies and tutor younger learners in literacy, building communication, empathy and leadership.' },

  // Humanities
  { id: 'civics', name: 'Civics', code: '', cluster: 'humanities', kind: 'nb', description: 'How government, law and citizenship work, and how citizens take part in public life.' },
  { id: 'world-issues-120', name: 'World Issues', code: '120', cluster: 'humanities', kind: 'nb', description: 'Global challenges such as human rights, inequality and the environment, examined through evidence and different perspectives.' },
  { id: 'economics-120', name: 'Economics', code: '120', cluster: 'humanities', kind: 'nb', description: 'Markets, supply and demand, government policy and the global economy.' },

  // Sciences
  { id: 'biology-111', name: 'Biology', code: '111/2', cluster: 'sciences', kind: 'nb', description: 'Cells, genetics, ecology and human body systems, with laboratory investigation.' },
  { id: 'chemistry-111', name: 'Chemistry', code: '111/2', cluster: 'sciences', kind: 'nb', description: 'Matter, chemical reactions and quantitative chemistry, with laboratory work.' },
  { id: 'physics-111', name: 'Physics', code: '111/2', cluster: 'sciences', kind: 'nb', description: 'Motion, forces, energy and waves, applied through experiments and problem solving.' },
  { id: 'human-physiology', name: 'Human Physiology', code: '', cluster: 'sciences', kind: 'nb', description: 'How the systems of the human body work together to keep us healthy.' },
  { id: 'sss-10', name: 'Science for Sustainable Society', code: '10', cluster: 'sciences', kind: 'nb', description: 'Scientific inquiry applied to sustainability: ecosystems, climate, human impact and practical solutions to environmental problems.' },

  // Mathematics
  { id: 'nrf-10', name: 'Numbers, Relations, and Functions', code: '10', cluster: 'mathematics', kind: 'nb', description: 'Number, relations, linear functions and systems: the algebra that later mathematics builds on.' },
  { id: 'precalc-110', name: 'Pre-Calculus', code: '110', cluster: 'mathematics', kind: 'nb', description: 'Functions, trigonometry and algebraic reasoning that lead into Pre-Calculus A 120.' },
  { id: 'precalc-a-120', name: 'Pre-Calculus A', code: '120', cluster: 'mathematics', kind: 'nb', description: 'Grade 12 pre-calculus: advanced functions and trigonometry, laying the groundwork for university calculus.' },

  // Creative Arts
  { id: 'graphic-art-110', name: 'Graphic Art and Design', code: '110', cluster: 'creative-arts', kind: 'nb', description: 'Visual communication through design principles, typography, image-making and digital tools.' },

  // Wellness and Physical Education
  { id: 'psychology-110', name: 'Psychology', code: '110', cluster: 'wellness', kind: 'nb', description: 'How people think, learn, feel and behave, and how psychologists study the mind.' },
  { id: 'kinesiology-120', name: 'Introduction to Kinesiology', code: '120', cluster: 'wellness', kind: 'nb', description: 'The science of human movement: anatomy, biomechanics, fitness and health.' },

  // Career Connected Learning
  { id: 'career-pathway-design', name: 'Career Pathway Design', code: '', cluster: 'career', kind: 'nb', description: 'Explore careers and further study, and build the personalised Career Life Plan you need to graduate.' },
  { id: 'entrepreneurship-120', name: 'Entrepreneurship', code: '120', cluster: 'career', kind: 'nb', description: 'Generating and testing business ideas, planning a venture, and the habits of successful entrepreneurs.' },
  { id: 'cybersecurity-120', name: 'Cyber Security', code: '120', cluster: 'career', kind: 'nb', description: 'Protecting systems and data: threats, defences, networks and responsible digital practice.' },
  { id: 'computer-science-110', name: 'Computer Science', code: '110', cluster: 'career', kind: 'nb', description: 'Computational thinking and programming: algorithms, data and building software solutions.' },
  { id: 'business-management-120', name: 'Business Management', code: '120', cluster: 'career', kind: 'nb', description: 'How organisations are run: management, marketing, operations and decision-making.' },
  { id: 'financial-accounting-120', name: 'Financial Accounting', code: '120', cluster: 'career', kind: 'nb', description: 'Recording, reporting and interpreting the financial information of a business.' },

  // IMAS school course
  { id: 'islamiyat', name: 'Islamiyat', code: '', cluster: 'school', kind: 'school', credit_hours: 0, description: 'IMAS school course in Islamic studies, taken alongside the diploma courses in Grade 10.' },

  // Grade 12 preparation courses (CAN Grade 11, Semester 2: Canadian Preparatory Program)
  { id: 'prep-kinesiology', name: 'Introduction to Kinesiology – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for Introduction to Kinesiology 120 in Grade 12.' },
  { id: 'prep-psychology', name: 'Psychology – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for Psychology 110 in Grade 12.' },
  { id: 'prep-civics', name: 'Civics – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for Civics in Grade 12.' },
  { id: 'prep-world-issues', name: 'World Issues – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for World Issues 120 in Grade 12.' },
  { id: 'prep-visual-arts', name: 'Visual Arts 10 – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for Graphic Art and Design 110 in Grade 12.' },
  { id: 'prep-mathematics', name: 'Mathematics – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for Pre-Calculus A 120 in Grade 12.' },
  { id: 'prep-english', name: 'English – Prep', code: '', cluster: 'prep', kind: 'prep', credit_hours: 0, description: 'Prepares you for English Language Arts 12 in Grade 12.' },
];

export const courses: Course[] = rows.map((r, i) => ({ credit_hours: 4, ...r, sort: (i + 1) * 10 }));
