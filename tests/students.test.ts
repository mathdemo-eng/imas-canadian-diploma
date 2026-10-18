import { describe, expect, it } from 'vitest';
import { seedBundle } from '../src/content/seed';
import { changePassword, loginEmail, passwordProblems, signIn, signOut } from '../src/lib/auth';
import { demo, DEMO_STUDENT } from '../src/lib/demo-backend';
import { importStudents, parseStudentList } from '../src/lib/students';

const { tracks } = seedBundle;

describe('sign-in names', () => {
  it('turns a Student ID into the school email', () => {
    expect(loginEmail('260001')).toBe('260001@imas.edu.my');
    expect(loginEmail('  S26-01 ')).toBe('s26-01@imas.edu.my');
  });
  it('uses a full email as typed, in lower case', () => {
    expect(loginEmail('Math.Demo@IMAS.edu.my')).toBe('math.demo@imas.edu.my');
  });
});

describe('password rules', () => {
  it('needs 8 characters, letters and numbers, and not the Student ID', () => {
    expect(passwordProblems('abc', '260001')).toEqual(['At least 8 characters', 'Letters and numbers']);
    expect(passwordProblems('12345678', '260001')).toEqual(['Letters and numbers']);
    expect(passwordProblems('maple260001', '260001')).toEqual(['Not your Student ID']);
    expect(passwordProblems('Maple-leaf7', '260001')).toEqual([]);
  });
});

describe('reading a pasted student list', () => {
  it('reads tab-separated rows from a spreadsheet, matching tracks by name or code', () => {
    const text = [
      'Student ID\tFull name\tID number\tTrack',
      '260001\tAisha Rahman\t080512101234\tCAN · Grade 10 entry',
      '260002\tDaniel Lim\tA12345678\tcad-sci-g11',
      '260003\tPriya Nair\t090101145678\tDual Commerce Grade 10',
      '260004\tOmar Ali\t070707101111\t',
    ].join('\n');
    const { rows, problems } = parseStudentList(text, tracks);
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { student_id: '260001', full_name: 'Aisha Rahman', password: '080512101234', track_id: 'can-g10' },
      { student_id: '260002', full_name: 'Daniel Lim', password: 'A12345678', track_id: 'cad-sci-g11' },
      { student_id: '260003', full_name: 'Priya Nair', password: '090101145678', track_id: 'cad-com-g10' },
      { student_id: '260004', full_name: 'Omar Ali', password: '070707101111', track_id: null },
    ]);
  });

  it('reads a CSV file with quoted names and other heading words', () => {
    const text = 'name,student id,IC\r\n"Tan, Mei Ling",260010,080808088888\r\n';
    expect(parseStudentList(text, tracks).rows).toEqual([{ student_id: '260010', full_name: 'Tan, Mei Ling', password: '080808088888', track_id: null }]);
  });

  it('explains what is wrong instead of guessing', () => {
    const text = [
      'Student ID,Full name,ID number,Track',
      '260001,Aisha Rahman,080512101234,CAN Grade 13',
      '260 002,Daniel Lim,A12345678,',
      '260003,,090101145678,',
      '260004,Omar Ali,123,',
      '260001,Aisha Again,080512101234,',
    ].join('\n');
    const { rows, problems } = parseStudentList(text, tracks);
    expect(rows.map((r) => r.student_id)).toEqual(['260001']);
    expect(rows[0].track_id).toBeNull();
    expect(problems).toHaveLength(5);
    expect(problems[0]).toMatch(/track “CAN Grade 13” wasn’t recognised/);
    expect(problems[1]).toMatch(/can only use letters, numbers/);
    expect(problems[2]).toMatch(/full name is missing/);
    expect(problems[3]).toMatch(/at least 6 characters/);
    expect(problems[4]).toMatch(/appears twice/);
  });

  it('asks for the heading row when it is missing', () => {
    const { rows, problems } = parseStudentList('260001\tAisha\t080512101234', tracks);
    expect(rows).toEqual([]);
    expect(problems[0]).toMatch(/first row must be headings/);
  });
});

describe('demo sign-in (no database)', () => {
  it('signs a student in, makes them replace the first password, and signs out', async () => {
    expect(await signIn(DEMO_STUDENT.studentId, 'wrong')).toMatch(/isn’t right/);
    expect(await signIn(DEMO_STUDENT.studentId, DEMO_STUDENT.password)).toBeNull();
    expect(demo.signedIn?.email).toBe('260001@imas.edu.my');
    expect(await changePassword(DEMO_STUDENT.password)).toMatch(/different/);
    expect(await changePassword('Maple-leaf7')).toBeNull();
    expect(demo.students.find((s) => s.student_id === DEMO_STUDENT.studentId)?.must_change_password).toBe(false);
    await signOut();
    expect(demo.signedIn).toBeNull();
    expect(await signIn(DEMO_STUDENT.studentId, 'Maple-leaf7')).toBeNull();
    await signOut();
  });

  it('imports new students and leaves existing ones alone', async () => {
    const results = await importStudents([
      { student_id: '260001', full_name: 'Demo Student', password: 'A1234567', track_id: null },
      { student_id: '269999', full_name: 'New Student', password: '080808088888', track_id: 'can-g11' },
    ]);
    expect(results.map((r) => r.status)).toEqual(['exists', 'created']);
    expect(await signIn('269999', '080808088888')).toBeNull();
    await signOut();
  });
});

describe('database address from Netlify', () => {
  it('accepts the Project URL, or common slips when it was pasted', async () => {
    const { normaliseSupabaseUrl } = await import('../src/lib/supabase');
    expect(normaliseSupabaseUrl('https://aazcizznxzhkonwbzkiu.supabase.co')).toBe('https://aazcizznxzhkonwbzkiu.supabase.co');
    expect(normaliseSupabaseUrl('aazcizznxzhkonwbzkiu')).toBe('https://aazcizznxzhkonwbzkiu.supabase.co');
    expect(normaliseSupabaseUrl(' aazcizznxzhkonwbzkiu.supabase.co/ ')).toBe('https://aazcizznxzhkonwbzkiu.supabase.co');
    expect(normaliseSupabaseUrl('https://aazcizznxzhkonwbzkiu.supabase.co/rest/v1/')).toBe('https://aazcizznxzhkonwbzkiu.supabase.co');
    expect(normaliseSupabaseUrl('')).toBeUndefined();
  });
});
