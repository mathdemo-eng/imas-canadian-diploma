import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const CHAPTERS = [
  ['/', 'Your Canadian high school diploma'],
  ['/diploma', 'The Diploma'],
  ['/pathways', 'Pathways'],
  ['/academic-plan', 'Academic Plan'],
  ['/assessment', 'Assessment'],
  ['/graduation', 'Graduation'],
  ['/academic-year', 'Academic Year'],
  ['/universities', 'Universities & Scholarships'],
  ['/student-hub', 'Student Hub'],
  ['/faq', 'Questions'],
  ['/contact', 'Contact & Admissions'],
] as const;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

for (const [path, heading] of CHAPTERS) {
  test(`${path} renders, fits the screen and passes accessibility checks`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // The axe package bundles its own Playwright types, so the page is passed through as-is.
    const axe = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('turning pages with the Next link and the arrow keys', async ({ page }, info) => {
  await page.goto('/diploma');
  await page.getByRole('navigation', { name: 'Turn the page' }).getByRole('link', { name: /Next/ }).click();
  await expect(page).toHaveURL(/\/pathways$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pathways');
  if (info.project.name === 'desktop') {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/academic-plan$/);
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/pathways$/);
  }
});

test('the contents menu lists every chapter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Contents' }).click();
  const menu = page.getByRole('navigation', { name: 'Contents', exact: true });
  await expect(menu.getByRole('link')).toHaveCount(CHAPTERS.length);
  await menu.getByRole('link', { name: /Graduation/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Graduation');
});

test('the academic plan switches between cohorts', async ({ page }) => {
  await page.goto('/academic-plan');
  await expect(page.getByRole('heading', { level: 2, name: 'CAN · Grade 10 entry' })).toBeVisible();
  await page.getByText('Dual · Commerce').click();
  await page.getByText('Grade 11', { exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Dual Program · Commerce · Grade 11 entry' })).toBeVisible();
  await expect(page.getByText('Human Physiology')).toBeVisible();
  await expect(page).toHaveURL(/track=cad-com-g11/);
  // Open a course to read about it.
  await page.getByRole('button', { name: /Economics/ }).click();
  await expect(page.getByText('Markets, supply and demand')).toBeVisible();
});

test('a deep link opens the right cohort', async ({ page }) => {
  await page.goto('/academic-plan?track=can-g11');
  await expect(page.getByRole('heading', { level: 2, name: 'CAN · Grade 11 entry' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Canadian Preparatory Program/ })).toBeVisible();
});

test('pages still change with reduced motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/assessment');
  await page.getByRole('navigation', { name: 'Turn the page' }).getByRole('link', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Graduation');
  await ctx.close();
});

test('the admin panel works in demo mode and edits show on the site', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByText('Demo mode:')).toBeVisible();
  await page.getByRole('link', { name: 'Questions & answers' }).first().click();
  await page.getByRole('button', { name: /How much does the programme cost/ }).click();
  const q = page.getByLabel('Question');
  await q.fill('How much are the fees?');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved. The website now shows this change.')).toBeVisible();
  await page.getByRole('link', { name: 'View site' }).click();
  await page.getByRole('button', { name: 'Contents' }).click();
  await page.getByRole('navigation', { name: 'Contents', exact: true }).getByRole('link', { name: /Questions/ }).click();
  await expect(page.getByText('How much are the fees?')).toBeVisible();
});

test('Make an enquiry opens a Gmail message to admissions, and both IMAS websites are linked', async ({ page }) => {
  await page.goto('/contact');
  const enquiry = page.getByRole('link', { name: /Make an enquiry in Gmail/ }).first();
  const href = await enquiry.getAttribute('href');
  expect(href).toContain('https://mail.google.com/mail/?');
  expect(href).toContain('to=info%40imas.edu.my');
  await expect(page.getByRole('link', { name: /IMAS Selangor/ }).first()).toHaveAttribute('href', 'https://imas.edu.my/');
  await expect(page.getByRole('link', { name: /IMAS Kuala Lumpur/ }).first()).toHaveAttribute('href', 'https://kl.imas.edu.my/');
});

test('student photos and the SKIPS badge load', async ({ page }) => {
  await page.goto('/assessment');
  const library = page.getByRole('img', { name: /reading in the school library/ });
  await library.scrollIntoViewIfNeeded();
  await expect(library).toBeVisible();
  expect(await library.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const badge = page.locator('footer img.only-light');
  expect(await badge.evaluate((img: HTMLImageElement) => img.naturalWidth > 0 || img.loading === 'lazy')).toBe(true);
  await page.goto('/universities');
  await expect(page.getByRole('img', { name: /St. Thomas University in autumn/ })).toBeVisible();
});

test('IELTS: the school prepares students and arranges the exam', async ({ page }) => {
  await page.goto('/graduation');
  await expect(page.getByText('IMAS arranges for you to sit the IELTS exam', { exact: false })).toBeVisible();
});

test('the admin panel refuses a wrong assessment split', async ({ page }) => {
  await page.goto('/admin/settings');
  await page.getByLabel('Final examination weight (%)').fill('50');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('The two assessment weights must add up to 100.')).toBeVisible();
});

async function expectAccessible(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const axe = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('Student Portal: first sign-in forces a new password, then sign out', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/student-hub');
  await page.getByRole('link', { name: 'Sign in to the portal' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Student Portal');
  await expectAccessible(page);

  await page.getByLabel('Student ID').fill('260001');
  await page.getByLabel('Password', { exact: true }).fill('wrong-one');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('isn’t right');

  await page.getByLabel('Password', { exact: true }).fill('A1234567');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Create your own password to continue')).toBeVisible();
  // The portal itself stays locked.
  await expect(page.getByText('My cohort')).toHaveCount(0);
  await expectAccessible(page);

  await page.getByLabel('New password').fill('260001abc');
  await expect(page.getByRole('list', { name: 'Password rules' })).toContainText('Not your Student ID');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('alert')).toContainText('doesn’t meet all the rules');

  await page.getByLabel('New password').fill('Maple-leaf7');
  await page.getByLabel('Type it again').fill('Maple-leaf8');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('alert')).toContainText('don’t match');

  await page.getByLabel('Type it again').fill('Maple-leaf7');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome, Demo');
  await expect(page.getByText('CAN · Grade 10 entry')).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Student ID')).toBeVisible();
  // The new password works; the first one no longer does.
  await page.getByLabel('Student ID').fill('260001');
  await page.getByLabel('Password', { exact: true }).fill('A1234567');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('isn’t right');
  await page.getByLabel('Password', { exact: true }).fill('Maple-leaf7');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome, Demo');
  expect(errors).toEqual([]);
});

test('admin Students: import from a pasted list, then the student can sign in', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/students');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Students');
  await page.getByRole('button', { name: 'Add students' }).click();
  await page.getByLabel('Paste the rows here').fill(
    [
      'Student ID\tFull name\tID number\tTrack\tGrade',
      '260101\tAisha Rahman\t080512101234\tCAN Grade 11\t11',
      '260102\tDaniel Lim\t12\t\t',
      '260001\tDemo Student\tA1234567\t\t',
    ].join('\n'),
  );
  await expect(page.getByText('2 students ready to add')).toBeVisible();
  await expect(page.getByText('the ID number must be at least 6 characters')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Create 2 accounts' }).click();
  await expect(page.getByText('1 created · 1 already had an account')).toBeVisible();

  const row = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Aisha Rahman' }) });
  await expect(row).toContainText('Waiting for first sign-in');
  await expect(row).toContainText('CAN · Grade 11 entry');
  await expect(row).toContainText('Grade 11 · ');
  await row.getByRole('link', { name: 'Aisha Rahman' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aisha Rahman');
  await page.getByLabel('Forgotten password? Set a temporary one').fill('Temp-2026');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Password reset.')).toBeVisible();
  await expectAccessible(page);

  // Back to the site without reloading (the demo keeps accounts in memory).
  await page.getByRole('link', { name: 'View site' }).click();
  await page.getByRole('link', { name: 'Student sign-in' }).click();
  await page.getByLabel('Student ID').fill('260101');
  await page.getByLabel('Password', { exact: true }).fill('Temp-2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Create your own password to continue')).toBeVisible();
  expect(errors).toEqual([]);
});

/** Changes page inside the app without reloading, so the demo's in-memory data is kept. */
async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

async function signInAsDemoStudent(page: Page) {
  await page.goto('/portal');
  await page.getByLabel('Student ID').fill('260001');
  await page.getByLabel('Password', { exact: true }).fill('A1234567');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('New password').fill('Maple-leaf7');
  await page.getByLabel('Type it again').fill('Maple-leaf7');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome, Demo');
}

test('Student Portal: a mark appears once the student sends feedback on the course', async ({ page }) => {
  const errors = collectErrors(page);
  await signInAsDemoStudent(page);
  await expect(page.getByText('2 courses are waiting for your feedback.')).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('tab', { name: 'My grades' }).click();
  const precalc = page.getByRole('listitem').filter({ hasText: 'Pre-Calculus 110' }).filter({ hasText: '2025–26' });
  await expect(precalc).not.toContainText('65%');
  await expectAccessible(page);
  await precalc.getByRole('button', { name: 'Give feedback to see your mark' }).click();

  await expect(page.getByRole('heading', { name: 'Pre-Calculus 110' })).toBeVisible();
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByRole('alert')).toContainText('14 left');
  const groups = page.locator('fieldset[id^="q-"]');
  for (let i = 0; i < (await groups.count()); i++) {
    const options = groups.nth(i).locator('label');
    await options.nth((await options.count()) === 5 ? 3 : 1).click();
  }
  await page.getByLabel(/What helped you learn most/).fill('Worked examples in class.');
  await expect(page.getByText('14 of 14 answered')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Send feedback' }).click();

  await page.getByRole('tab', { name: 'My grades' }).click();
  await expect(precalc).toContainText('65%');
  await expect(page.getByRole('tab', { name: /Feedback/ })).toContainText('1');

  for (const tab of ['My subjects', 'Time to graduate', 'Advisor']) {
    await page.getByRole('tab', { name: tab }).click();
    await expectAccessible(page);
  }
  await page.getByRole('button', { name: 'Book an appointment' }).click();
  await expect(page.getByText('Choose a reason first')).toBeVisible();
  await page.getByLabel('Other').check();
  await page.getByLabel('Tell your advisor what it’s about').fill('University applications');
  const gmail = page.getByRole('link', { name: 'Write the email in Gmail' });
  await expect(gmail).toHaveAttribute('href', /mail\.google\.com.*sarah\.lim%40imas\.edu\.my/);
  await expect(gmail).toHaveAttribute('href', /University\+applications/);
  expect(errors).toEqual([]);
});

test('admin: block a student, who then can’t sign in, and unblock them', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/students/260002');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nur Iman Hassan');
  await page.getByRole('button', { name: 'Block access' }).click();
  await expect(page.getByRole('alert')).toContainText('Write the reason');
  await page.getByLabel('Block access').fill('Fees unpaid for Semester 1');
  await page.getByRole('button', { name: 'Block access' }).click();
  await expect(page.getByText('Access is blocked', { exact: true })).toBeVisible();
  await expect(page.getByText('Fees unpaid for Semester 1')).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('link', { name: 'View site' }).click();
  await page.getByRole('link', { name: 'Student sign-in' }).click();
  await page.getByLabel('Student ID').fill('260002');
  await page.getByLabel('Password', { exact: true }).fill('Demo-260002');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Your portal access is paused');
  await expect(page.getByText('Fees unpaid')).toHaveCount(0);

  await go(page, '/admin/students/260002');
  await page.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText('can sign in again')).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin: View as student shows the student’s own portal, and nothing can be sent', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/students/260001');
  await page.getByRole('link', { name: 'View as student' }).click();
  await expect(page.getByText('Viewing as Demo Student.')).toBeVisible();
  await expect(page.getByText('Welcome, Demo')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('tab', { name: 'My grades' }).click();
  await expect(page.getByRole('button', { name: 'Give feedback to see your mark' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Give feedback to see your mark' }).first().click();
  await expect(page.getByText('Staff preview: only the student can send this form.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send feedback' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the student' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo Student');
  expect(errors).toEqual([]);
});

test('admin: upload marks from a sheet, and they show on the student’s page', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/records');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subjects & grades');
  await page.getByRole('tab', { name: 'Grades sheet' }).click();
  await page
    .getByLabel('Paste the rows here')
    .fill(['Student ID,Course,Final mark,Continuous assessment,Final exam', '260002,Biology 111/2,78,,', '260002,Chemistry 111/2,,72,65', '260002,Physics 111/2,,,', '260999,Physics 111/2,50,,'].join('\n'));
  await expect(page.getByText('there is no student with the ID 260999')).toBeVisible();
  await expect(page.getByText('1 row has no marks yet and will be skipped.')).toBeVisible();
  await expect(page.getByText('2 rows ready · 0 new · 2 updates')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Save 2 rows' }).click();
  await expect(page.getByText('Saved for 1 student: 0 new records, 2 updated.')).toBeVisible();

  await go(page, '/admin/students/260002');
  const chem = page.getByRole('listitem').filter({ hasText: 'Chemistry 111/2' });
  await expect(chem).toContainText('69.2%');
  await expect(chem).toContainText('mark hidden from the student until they send feedback');
  expect(errors).toEqual([]);
});

test('admin: promote a student with a retake, then undo it', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/promotion');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Promotion');
  const toDecide = page.getByRole('list', { name: 'Students to decide for 2026-2027' });
  const hana = toDecide.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Hana Yusof' }) });
  await expect(hana).toContainText('Promote');
  await expect(hana).toContainText('Pre-Calculus 110 (51%)');
  await expect(hana).toContainText('Grade 12 in 2027-2028');
  const adam = toDecide.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Adam Tan' }) });
  await expect(adam).toContainText('Repeat the grade');
  await expectAccessible(page);

  await hana.getByRole('checkbox').check();
  await page.getByLabel('Note for the history (optional)').fill('Academic board');
  await page.getByRole('button', { name: 'Apply 1 decision' }).click();
  await expect(page.getByText('1 promoted')).toBeVisible();
  await page.getByRole('button', { name: 'Yes, apply' }).click();
  await expect(page.getByText('1 decision applied.')).toBeVisible();
  await expect(hana).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Decided for 2026-2027' })).toContainText('Hana Yusof · Promoted');

  await go(page, '/admin/students/260005');
  await expect(page.getByText('Grade 12 · 2027–28')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Grade 12\s*2027-2028/ })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('button', { name: 'Yes, undo' }).click();
  await expect(page.getByText('Undone.', { exact: true })).toBeVisible();
  await expect(page.getByText('Grade 11 · 2026–27')).toBeVisible();
  await expect(page.getByRole('heading', { name: /2027-2028/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('admin: add a teacher who appears as a student’s advisor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/teachers');
  await page.getByRole('button', { name: 'Add a teacher' }).click();
  await page.getByLabel('Full name').fill('Mr Arif Hakim');
  await page.getByLabel('Email').fill('arif.hakim@imas.edu.my');
  await page.getByLabel('Role').fill('Grade 12 Physics teacher');
  await page.getByLabel('Qualifications').fill('MSc Physics, Universiti Malaya\nBEd Science');
  await page.getByLabel('Joined IMAS in').fill('2018');
  await page.getByRole('button', { name: 'Save teacher' }).click();
  await expect(page.getByText('Mr Arif Hakim')).toBeVisible();
  await expectAccessible(page);

  await go(page, '/admin/students/260004');
  await page.getByLabel('Academic advisor').selectOption({ label: 'Mr Arif Hakim' });
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.getByRole('link', { name: 'View as student' }).click();
  await page.getByRole('tab', { name: 'Advisor' }).click();
  await expect(page.getByRole('heading', { name: 'Mr Arif Hakim' })).toBeVisible();
  await expect(page.getByText('MSc Physics, Universiti Malaya')).toBeVisible();
  expect(errors).toEqual([]);
});

test('guide: getting the student system ready works as written (steps 5, 6, 7 and 10)', async ({ page }) => {
  const errors = collectErrors(page);
  // Step 10.1 (done first here, so step 5 has a student without a grade): add students from a comma-separated paste.
  await page.goto('/admin/students');
  await page.getByRole('button', { name: 'Add students' }).click();
  await page
    .getByLabel('Paste the rows here')
    .fill(['Student ID, Full name, ID number, Track', '999002, Old Student, OLD-2026, CAN Grade 11', '999001, Test Student, TEST-2026, CAN Grade 11'].join('\n'));
  await page.getByRole('button', { name: 'Create 2 accounts' }).click();
  await expect(page.getByText('2 created')).toBeVisible();

  // Step 5: students without a grade, one cohort at a time.
  await page.locator('#filter-grade').selectOption({ label: 'Not set' });
  await page.locator('#filter-cohort').selectOption({ label: 'CAN · Grade 11 entry' });
  await page.getByText(/Tick all 2 shown/).click();
  await page.locator('#group-field').selectOption({ label: 'Grade and academic year' });
  await page.locator('#group-grade').selectOption({ label: 'Grade 12' });
  await page.getByRole('button', { name: 'Apply to 2 students' }).click();
  await expect(page.getByText('Saved for 2 students.')).toBeVisible();
  await page.getByRole('button', { name: 'Untick all' }).click();
  await expect(page.getByText('No students match these filters.')).toBeVisible();

  // Step 6: plan the year for everyone.
  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Subjects & grades' }).click();
  await page.getByRole('tab', { name: 'Plan a year' }).click();
  await page.getByLabel('Or one student').fill('999001');
  await expect(page.getByText(/1 student in 2026-2027 · \d+ course records to add/)).toBeVisible();
  await page.getByRole('button', { name: 'Add subjects for 1 student' }).click();
  await expect(page.getByText(/Added \d+ subject records for 1 students/)).toBeVisible();

  // Step 7: download the ready-filled subjects sheet, add the teacher, upload it again.
  await page.getByRole('tab', { name: 'Subjects sheet' }).click();
  await page.locator('#subjects-sheet-one').fill('999001');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download for 1 student' }).click()]);
  const sheet = readFileSync((await download.path())!, 'utf8').replace(/^﻿/, '').trim().split(/\r\n/);
  expect(sheet[0]).toBe('Student ID,Full name,Academic year,Grade,Semester,Course,Status,Teacher');
  const filled = [sheet[0], ...sheet.slice(1).map((row) => row.replace(/,$/, ',sarah.lim@imas.edu.my'))].join('\n');
  await page.getByLabel('Paste the rows here').fill(filled);
  await expect(page.getByText(new RegExp(`${sheet.length - 1} rows ready · 0 new · ${sheet.length - 1} updates`))).toBeVisible();
  await expect(page.getByText('Please check')).toHaveCount(0);
  await page.getByRole('button', { name: `Save ${sheet.length - 1} rows` }).click();
  await expect(page.getByText(/Saved for 1 student: 0 new records/)).toBeVisible();

  // Step 10.3–10.5: a completed course with a mark, locked until feedback; an advisor.
  await go(page, '/admin/students/999001');
  const first = page.getByRole('button', { name: /^Edit / }).first();
  await first.click();
  await page.getByLabel('Status').selectOption({ label: 'Completed' });
  await page.getByLabel('Final mark (%)').fill('75');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('mark hidden from the student until they send feedback')).toBeVisible();
  await expect(page.getByText(/· Ms Sarah Lim/).first()).toBeVisible();
  await page.getByLabel('Academic advisor').selectOption({ label: 'Mr Daniel Okafor' });
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByRole('link', { name: 'View as student' }).click();
  await page.getByRole('tab', { name: 'My grades' }).click();
  await expect(page.getByRole('button', { name: 'Give feedback to see your mark' })).toBeVisible();
  await page.getByRole('tab', { name: 'Advisor' }).click();
  await expect(page.getByRole('heading', { name: 'Mr Daniel Okafor' })).toBeVisible();

  // Step 10.6–10.7: the student signs in, sends feedback and sees the mark.
  await go(page, '/portal');
  await page.getByLabel('Student ID').fill('999001');
  await page.getByLabel('Password', { exact: true }).fill('TEST-2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('New password').fill('Maple-leaf9');
  await page.getByLabel('Type it again').fill('Maple-leaf9');
  await page.getByRole('button', { name: 'Save my password' }).click();
  await page.getByRole('tab', { name: 'My grades' }).click();
  await page.getByRole('button', { name: 'Give feedback to see your mark' }).click();
  const groups = page.locator('fieldset[id^="q-"]');
  await expect(groups).toHaveCount(14);
  for (let i = 0; i < (await groups.count()); i++) {
    const options = groups.nth(i).locator('label');
    await options.nth((await options.count()) === 5 ? 3 : 1).click();
  }
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await page.getByRole('tab', { name: 'My grades' }).click();
  await expect(page.getByText('75%').first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();

  // Step 10.8–10.9: block, the student can't sign in, unblock, remove.
  await go(page, '/admin/students/999001');
  await page.getByLabel('Block access').fill('Test');
  await page.getByRole('button', { name: 'Block access' }).click();
  await go(page, '/portal');
  await page.getByLabel('Student ID').fill('999001');
  await page.getByLabel('Password', { exact: true }).fill('Maple-leaf9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Your portal access is paused');
  await go(page, '/admin/students/999001');
  await page.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText('can sign in again')).toBeVisible();
  await page.getByRole('button', { name: 'Remove student' }).click();
  await page.getByRole('button', { name: 'Yes, remove' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Students');
  await expect(page.getByRole('link', { name: 'Test Student' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('admin: give the same subjects to a group of students in one go', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/admin/records?tab=group');
  await page.getByRole('textbox', { name: 'Student IDs' }).fill('260002\n260005, 999999');
  await expect(page.getByText('2 students: Nur Iman Hassan, Hana Yusof')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('No student has this ID: 999999');

  await page.getByLabel('Tick the subjects of a cohort plan').selectOption({ label: 'CAN · Grade 10 entry' });
  await page.getByLabel('For grade').selectOption({ label: 'Grade 10' });
  await page.getByRole('button', { name: 'Tick these' }).click();
  const ticked = Number((await page.getByText(/\d+ subjects ticked/).textContent())!.match(/\d+/)![0]);
  expect(ticked).toBeGreaterThan(5);
  // Untick one, found by searching.
  await page.getByLabel('Find a course').fill('Islamiyat');
  await page.getByRole('checkbox', { name: 'Islamiyat' }).uncheck();
  await page.getByLabel('Find a course').fill('');
  await expect(page.getByText(`${ticked - 1} subjects ticked`)).toBeVisible();

  await page.getByLabel('Academic year').selectOption('2027-2028');
  await expect(page.getByText(`${ticked - 1} subjects × 2 students = ${(ticked - 1) * 2} records`)).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: `Add ${ticked - 1} subjects to 2 students` }).click();
  await expect(page.getByText(`Added ${(ticked - 1) * 2} records for 2 students.`)).toBeVisible();
  // Running it again adds nothing new.
  await page.getByRole('button', { name: `Add ${ticked - 1} subjects to 2 students` }).click();
  await expect(page.getByText(`Added 0 records for 2 students. ${(ticked - 1) * 2} were already there`)).toBeVisible();

  await go(page, '/admin/students/260002');
  await expect(page.getByRole('heading', { name: /2027-2028/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin: tick students on the Students page, then add subjects to them', async ({ page }) => {
  await page.goto('/admin/students');
  await page.getByLabel('Select Adam Tan').check();
  await page.getByLabel('Select Sara Lee').check();
  await page.getByRole('button', { name: 'Add subjects to them' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Subjects & grades');
  await expect(page.getByRole('textbox', { name: 'Student IDs' })).toHaveValue('260003\n260004');
  await expect(page.getByText('2 students: Adam Tan, Sara Lee')).toBeVisible();
});
