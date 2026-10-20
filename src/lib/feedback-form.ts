// The course feedback form students complete after each course.
// Question ids are stored with the answers, so keep them stable when rewording a question.

export const AGREE = ['Strongly disagree', 'Disagree', 'Not sure', 'Agree', 'Strongly agree'];
const CONFIDENCE = ['Not at all', 'A little', 'Somewhat', 'Confident', 'Very confident'];

export type Question =
  | { id: string; kind: 'rating'; text: string; scale: string[] }
  | { id: string; kind: 'choice'; text: string; options: string[] }
  | { id: string; kind: 'text'; text: string; hint: string };

export interface FormSection {
  id: 'teacher' | 'course' | 'words';
  title: string;
  intro: string;
  questions: Question[];
}

export const FEEDBACK_FORM: FormSection[] = [
  {
    id: 'teacher',
    title: 'Your teacher',
    intro: 'How much do you agree with each statement about the teacher of this course?',
    questions: [
      { id: 't_mastery', kind: 'rating', text: 'My teacher knows the subject well and explains it accurately.', scale: AGREE },
      { id: 't_clarity', kind: 'rating', text: 'Explanations and instructions were clear.', scale: AGREE },
      { id: 't_design', kind: 'rating', text: 'Lessons were well planned and organised.', scale: AGREE },
      { id: 't_engagement', kind: 'rating', text: 'Lessons were engaging and kept me involved.', scale: AGREE },
      { id: 't_feedback', kind: 'rating', text: 'I received useful feedback that helped me improve.', scale: AGREE },
      { id: 't_assessment', kind: 'rating', text: 'Assignments, end-of-chapter tests and the project matched what we learned.', scale: AGREE },
      { id: 't_support', kind: 'rating', text: 'My teacher was available and willing to help when I needed it.', scale: AGREE },
      { id: 't_respect', kind: 'rating', text: 'My teacher treated every student fairly and respectfully.', scale: AGREE },
    ],
  },
  {
    id: 'course',
    title: 'The course',
    intro: 'Now think about the course itself.',
    questions: [
      { id: 'c_relevance', kind: 'rating', text: 'The course content was interesting and useful.', scale: AGREE },
      { id: 'c_resources', kind: 'rating', text: 'The materials and resources helped me learn.', scale: AGREE },
      { id: 'c_prepared', kind: 'rating', text: 'The course prepared me well for the next level or for university.', scale: AGREE },
      { id: 'c_workload', kind: 'choice', text: 'The workload was…', options: ['Too light', 'About right', 'Too heavy'] },
      { id: 'c_confidence', kind: 'rating', text: 'How confident do you feel in this subject now?', scale: CONFIDENCE },
      { id: 'overall', kind: 'rating', text: 'Overall, how would you rate this course?', scale: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] },
    ],
  },
  {
    id: 'words',
    title: 'In your own words',
    intro: 'Optional, but the most useful part for your teachers.',
    questions: [
      { id: 'o_best', kind: 'text', text: 'What helped you learn most in this course?', hint: 'For example: worked examples, group projects, feedback on drafts' },
      { id: 'o_improve', kind: 'text', text: 'What one change would make this course better?', hint: 'Be specific and respectful' },
    ],
  },
];

export const RATING_QUESTIONS = FEEDBACK_FORM.flatMap((s) => s.questions).filter((q) => q.kind === 'rating');
export const REQUIRED_IDS = FEEDBACK_FORM.flatMap((s) => s.questions).filter((q) => q.kind !== 'text').map((q) => q.id);

/** The questions still unanswered. */
export function missingAnswers(answers: Record<string, string | number>): string[] {
  return REQUIRED_IDS.filter((id) => answers[id] === undefined || answers[id] === '');
}
