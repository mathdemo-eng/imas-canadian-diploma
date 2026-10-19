# Canadian Diploma website: Hosting & Maintenance Guide

For the Deputy Head of Secondary (Academic), the IMAS IT team, and anyone who edits the site.
No programming is needed for day-to-day work.

---

## 1. How the pieces fit

| Piece | What it does | Who looks after it |
|---|---|---|
| **GitHub** | Stores the website's code. | Claude makes code changes here when you ask. |
| **Netlify** | Puts the website on the internet. It rebuilds the site automatically whenever the code on GitHub changes. | Set up once. |
| **Supabase** | The database: subjects, tracks, universities, FAQs, announcements, settings, the list of editors and the student accounts. Also handles sign-in (email and password) for staff and students. | You edit it through the site's admin panel. |
| **manage-students** | A small server function inside Supabase that creates student accounts and sets passwords. It holds the secret key, so the key is never in the website. | Set up once (copy and paste). |
| **School DNS** (optional) | Points `canadian.imas.edu.my` at Netlify. | IT, once. |

Two kinds of change:

- **Content** (subjects, universities, FAQs, announcements, documents, contact details, key figures) → edit it yourself at `/admin`. Visitors see it immediately.
- **Design or new features** (new pages, new layouts, Stage 2) → ask Claude. The change goes to GitHub, and Netlify publishes it in about two minutes.

---

## 2. One-time setup (about one hour)

Do these in order. Steps marked **IT** need the school's IT team.

### Step 1: GitHub (stores the code)
1. Create a free account at <https://github.com> (an IMAS organisation account is best).
2. Create a **private** repository named `imas-canadian-diploma`.
3. Tell Claude the repository name. Claude will upload the code to it.

### Step 2: Supabase (the database)
1. Create an account at <https://supabase.com> and click **New project**.
   - Name: `imas-canadian-diploma`
   - Region: **Southeast Asia (Singapore)**, closest to Malaysia
   - Save the database password somewhere safe (for example a password manager).
2. Open **SQL Editor → New query**. Paste the whole of each file below, in this order, clicking **Run** after each one (start a new query each time):
   1. `supabase/migrations/0001_content.sql`: the content tables and their security rules
   2. `supabase/seed.sql`: all the content from this guide's first version
   3. `supabase/migrations/0002_students.sql`: the student accounts table and its security rules
3. **Turn off public sign-ups.** Open **Authentication → Sign In / Providers**. Under **User Signups**, switch **Allow new users to sign up** **off** and save. Only editors can create accounts. Check that **Email** is enabled under **Auth Providers** (it is by default).
4. **Create your own staff sign-in.** Open **Authentication → Users → Add user → Create new user**. Enter your IMAS email and a password, tick **Auto Confirm User**, and click **Create user**.
5. Open `supabase/add-first-admin.sql`, change the email to that same email (lower case), paste it into a new SQL query and click **Run**. You are now the first editor.
6. Go to **Project Settings → API** (or **API Keys**) and copy two values for Step 4:
   - the **Project URL**
   - the **anon / publishable** key (the public one). **Never** use the `service_role` or secret key on the website.

### Step 3: The student accounts function (copy and paste, about 5 minutes)
1. In Supabase, open **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `manage-students`.
3. Delete the example code. Open `supabase/functions/manage-students/index.ts` on GitHub, copy all of it, paste it in, and click **Deploy function**.
4. That's all. Supabase gives the function its keys automatically, and the secret key stays on Supabase's servers.

### Step 4: Netlify (puts the site online)
1. Create an account at <https://www.netlify.com> and sign in with GitHub.
2. **Add new project → Import an existing project → GitHub** and choose `imas-canadian-diploma`.
   Netlify reads the build settings from `netlify.toml`, so you don't need to change anything.
3. Before deploying, open **Environment variables** and add:
   - `VITE_SUPABASE_URL` = the Project URL from Step 2
   - `VITE_SUPABASE_ANON_KEY` = the anon / publishable key from Step 2
4. Click **Deploy**. After a minute or two the site is live at an address like `imas-canadian-diploma.netlify.app`.
   If you add or change environment variables later, go to **Deploys → Trigger deploy** so they take effect.

### Step 5: The website address (free)
You don't need to buy anything. Choose one:
- **Netlify address (free, works straight away):** in Netlify open **Site configuration → Change site name**, for example `imas-canadian` → `imas-canadian.netlify.app`.
- **School address (free, needs IT once):** IMAS already owns `imas.edu.my`, so `canadian.imas.edu.my` costs nothing.
  1. In Netlify, open **Domain management → Add a domain** and enter `canadian.imas.edu.my`.
  2. IT adds the DNS record Netlify shows, usually a **CNAME** from `canadian` to `<your-site>.netlify.app`.
  3. Netlify turns on HTTPS (the padlock) automatically within about an hour.

- **Your own domain, no IT needed (about US$10–20 a year):** buy a name such as `imascanadian.com`. The simplest way is inside Netlify: **Domain management → Add a domain → Register a new domain**. Netlify shows the yearly price before you pay, then sets up the address and HTTPS by itself. Register it to a school email (not a personal one) and keep **auto-renew** on, so the site never goes offline because a renewal was missed. Then click **Set as primary domain**; the `.netlify.app` address keeps working and forwards to the new one.

**You don't need Supabase's "Custom Domain" add-on.** It only renames the database's behind-the-scenes address (`…supabase.co`), which visitors never see. Students and staff only ever see the website address above.

Finally, in Supabase open **Authentication → URL Configuration** and set **Site URL** to the address you chose.

### Step 6: Check it works
1. Open the site and turn a few pages.
2. Open `/admin` and sign in with the email and password from Step 2. The dashboard should say **Connected to the database**.
3. Change one FAQ, save it, then open the FAQ page to see the change.
4. In **Students**, add one test student (see section 3), sign in as them at `/portal`, create a password, then remove the test student.

### Step 7: Get found on Google (optional, 10 minutes)
A new website is invisible on Google until Google has visited it, which can take days or weeks. To speed this up:
1. Open <https://search.google.com/search-console> and sign in with a school Google account.
2. **Add property → URL prefix**, enter the site's address, and choose the **HTML tag** check. Send the tag to Claude, who adds it to the site; then click **Verify**.
3. Open **Sitemaps**, type `sitemap.xml` and click **Submit**. The site makes this list of pages automatically.
4. Optional: paste the home page address into the search bar at the top and click **Request indexing**.

---

## 3. Everyday editing (no code)

Sign in at **canadian.imas.edu.my/admin** (or use **Staff sign-in** at the bottom of any page).

| I want to… | Go to | Then |
|---|---|---|
| Change a subject in a cohort's plan | **Subjects in tracks** | Pick the track, click the subject, change it, **Save changes**. |
| Add a subject to a cohort | **Subjects in tracks** | **Add subject**: choose track, grade, semester and course. Give it a position to set its order. |
| Show two courses on one card (e.g. Pre-Calculus 110 & NRF 10) | **Subjects in tracks** | Give both the **same position** in the same semester. |
| Mark a course as continuing from Grade 10 | **Subjects in tracks** | Tick **Continues from Grade 10**. It won't count as a new subject. |
| Add a brand-new course | **Courses** | **Add course**, then add it to tracks under **Subjects in tracks**. |
| Change a cohort's course total | **Cohort tracks** | Edit **Number of diploma courses**. |
| Update a university or scholarship | **Partner universities** | Edit and save. Untick **Show on the website** to hide it. |
| Add a campus photo to a university card | **Partner universities** | Paste a link to a photo you have permission to use into **Photo link** and add a **Photo credit**. Without a photo, the card shows a designed postcard of the city. |
| Post news for students | **Announcements** | **Add announcement**. Newest shows first in the Student Hub. |
| Share a handbook or form | **Documents** | Upload the file to Google Drive, set **Share → Anyone with the link → Viewer**, copy the link and paste it in. |
| Change the phone number, IELTS band or assessment weights | **Site settings** | Every page that mentions the figure updates. |
| Change the enquiry email or the IMAS website links | **Site settings** | **Make an enquiry** opens a new Gmail message to the admissions email, with the subject you set. The IMAS Selangor and IMAS Kuala Lumpur links appear on the Contact page and in the footer. |
| Add or change a question | **Questions & answers** | Choose who it is mainly for: new or current students. |

**Hiding vs deleting.** To take something down temporarily, untick **Show on the website**. Deleting is permanent.

**Deleting a course** also removes it from every cohort plan that uses it. The admin panel warns you first.

### Student accounts (admin → **Students**)
Each student signs in with their **Student ID** (their account is `StudentID@imas.edu.my`). Their first password is their **ID number** (IC or passport). The first time they sign in, the portal makes them create their own password. Until they do, the portal stays locked; they can only sign out.

**Adding students (for example, all 300 at the start of the year)**
1. In Excel or Google Sheets, make columns headed **Student ID**, **Full name**, **ID number**, and optionally **Track** (for example `CAN Grade 10` or `cad-sci-g11`).
2. Select the rows including the heading row, copy, and paste them into **Paste the rows here** (or choose a CSV file).
3. Check the preview. Rows with problems are listed and left out until fixed.
4. Click **Create … accounts**. Accounts are created 25 at a time, so 300 students take a minute or two. Students who already have an account are skipped, so you can paste the whole list again safely when new students join.

**What to tell students:** go to the website → **Student Hub → Sign in to the portal** (or **Student sign-in** at the bottom of any page). Type your Student ID and your ID number, then create your own password: at least 8 characters, letters and numbers, not your Student ID.

**A student forgot their password:** open **Students**, click the student, type a temporary password (for example their ID number) and click **Reset password**. They create a new one when they next sign in.

**Leavers:** click the student → **Remove student**. This deletes their sign-in account.

**Important:** the first password must be something only the student knows, such as their IC or passport number. If it were the same as their Student ID, anyone who knows the ID could sign in before the student does.

### Adding another editor
1. In Supabase open **Authentication → Users → Add user → Create new user**. Enter their IMAS email and a temporary password, tick **Auto Confirm User**, and create the user.
2. Open **Table Editor → admins → Insert row**, type the same email in lower case and save.
3. Give them the temporary password privately. After signing in at `/admin`, they can set their own under **Your password** on the dashboard.

To remove an editor, delete their row in **admins** (and their user in **Authentication → Users**).

**An editor forgot their password:** another editor deletes their user in **Authentication → Users** and adds it again with a new temporary password (step 1 above). Their editor access stays, because it is linked to the email.

---

## 4. Backups

- **Monthly:** in the admin dashboard click **Download backup** and save the file to a shared Drive folder (for example `Canadian Diploma / Website backups`). Also do this before big changes.
- **Database backups:** Supabase's paid Pro plan keeps daily backups automatically. We recommend Pro before Stage 2, when student records are stored.
- **Code:** GitHub keeps every version of the code. Netlify keeps every published version. To undo a bad release, open **Netlify → Deploys**, choose an earlier deploy and click **Publish deploy**.

---

## 5. Costs (check each provider's current pricing)

| Service | Stage 1 | Stage 2 (student portal) |
|---|---|---|
| GitHub | Free (private repository) | Free |
| Netlify | Free plan is usually enough | Free or paid, depending on traffic |
| Supabase | Free plan works. Free projects may be paused after a period of inactivity. | **Pro recommended**: daily backups, no pausing, more capacity |
| Sign-in for staff and 300 students | Included in Supabase, well within the free plan's limits | Included |
| Website address | Free: `….netlify.app`, or `canadian.imas.edu.my` (IMAS already owns the domain) | Free |
| Supabase "Custom Domain" add-on | **Not needed** (it only renames the hidden database address) | Not needed |
| AI academic advisor | — | Pay-as-you-go Claude API usage |

---

## 6. Troubleshooting

| What you see | What to do |
|---|---|
| An edit doesn't show on the site | Reload the page. Pages already open in another tab refresh their content after a reload. |
| Admin dashboard says **built-in content** | The site can't reach the database. Check that the Supabase project isn't paused (Supabase dashboard), and that both environment variables are set in Netlify, then **Trigger deploy**. |
| **No editing access** after signing in | That email isn't in the `admins` table. Add it (section 3), in lower case. |
| Staff sign-in says the email or password isn't right | Check the user exists in **Authentication → Users** and is confirmed. If the password is forgotten, see "An editor forgot their password" (section 3). |
| A student's sign-in says the ID or password isn't right | Check their Student ID in **Students**. If needed, reset their password. |
| **Students** page says the student accounts function isn't set up | Do Step 3 (the function must be named exactly `manage-students`). |
| **Students** page says your sign-in has expired, or **Invalid JWT** | Sign out of the admin panel and sign in again. If it keeps happening, open **Edge Functions → manage-students → Details** in Supabase and switch off **Verify JWT** (sometimes called **Enforce JWT verification**). The function checks who is signed in by itself. |
| Import says an email "already has a sign-in account that isn't linked to a student" | Delete that user in **Authentication → Users**, then paste the student again. |
| Site is down after a code change | In Netlify → Deploys, publish the previous deploy, then tell Claude what happened. |

---

## 7. Asking Claude for changes

Start a Claude Code session with the `imas-canadian-diploma` GitHub repository attached and describe what you want, for example:

- "Add a chapter about student life with photos from this Drive folder."
- "Change the Grade 12 subjects for the Dual Commerce Grade 10 cohort."
- "Start Stage 2: student profiles with grades imported from our gradebook."

Claude makes the change, runs the tests and pushes to GitHub, and Netlify publishes it automatically.

---

## 8. Stage 2 at a glance (planned)

- **Student sign-in: done.** Student ID and password, with a forced change of the first password (section 3).
- **Student profiles:** cohort, courses completed and in progress, grades per course (continuous assessment and final exam), credit-hours earned out of 100, IELTS status, projected graduation date.
- **Academic calendar** for each year, edited in the admin panel.
- **AI academic advisor:** personal suggestions for improving, based on the student's own results. It runs on the server so the API key is never exposed, and teachers can review its notes.
- **Data import:** grades uploaded from the school's gradebook (CSV or Google Sheets).
