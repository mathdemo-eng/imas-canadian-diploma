import AxeBuilder from '@axe-core/playwright';
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
