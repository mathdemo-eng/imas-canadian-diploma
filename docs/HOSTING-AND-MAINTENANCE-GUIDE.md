# Canadian Diploma website: Hosting & Maintenance Guide

For the Deputy Head of Secondary (Academic), the IMAS IT team, and anyone who edits the site.
No programming is needed for day-to-day work.

| | Address |
|---|---|
| Website | <https://canadian.imas.edu.my> (the old `imas-canadian.netlify.app` forwards here) |
| Admin panel (staff) | <https://canadian.imas.edu.my/admin> |
| Student Portal | <https://canadian.imas.edu.my/portal> |
| Code | <https://github.com/mathdemo-eng/imas-canadian-diploma> |

---

## 1. How the pieces fit

| Piece | What it does | Who looks after it |
|---|---|---|
| **GitHub** | Stores the website's code. | Claude makes code changes here when you ask. |
| **Netlify** | Puts the website on the internet. It rebuilds the site automatically whenever the code on GitHub changes. | Set up once. |
| **Supabase** | The database: subjects, tracks, universities, FAQs, announcements, settings, the list of editors and the student accounts. Also handles sign-in (email and password) for staff and students. | You edit it through the site's admin panel. |
| **manage-students** | A small server function inside Supabase that creates student accounts and sets passwords. It holds the secret key, so the key is never in the website. | Set up once (copy and paste). |
| **Domain** (optional) | A web address of your own, such as `canadian.imas.edu.my` or one you buy. | You or IT, once. |

Two kinds of change:

- **Content** (subjects, universities, FAQs, announcements, documents, contact details, key figures, student accounts) → edit it yourself at `/admin`. Visitors see it immediately.
- **Design or new features** (new pages, new layouts, Stage 2) → ask Claude. The change goes to GitHub, and Netlify publishes it in about two minutes.

---

## 2. One-time setup (about one hour)

Do these in order. Steps marked **IT** need the school's IT team.

**Finding a file on GitHub.** The guide names files such as `supabase/seed.sql`. Open the repository, click the `supabase` folder (then `migrations` or `functions` where named), click the file, and use the **Copy** icon at the top right of the file view to copy all of it.

### Step 1: GitHub (stores the code)
1. Create a free account at <https://github.com> (an IMAS organisation account is best).
2. Create a **private** repository named `imas-canadian-diploma`. Keep it private; Netlify works with private repositories.
3. Tell Claude the repository name. Claude uploads the code to it.

### Step 2: Supabase (the database and sign-in)
1. Create an account at <https://supabase.com> and click **New project**.
   - Name: `imas-canadian-diploma`
   - Region: **Southeast Asia (Singapore)**, closest to Malaysia
   - Save the database password somewhere safe (for example a password manager).
2. Open **SQL Editor → New query**. Paste the whole of each file below, in this order, clicking **Run** after each one (start a new query each time):
   1. `supabase/migrations/0001_content.sql`: the content tables and their security rules
   2. `supabase/seed.sql`: all the content from this guide's first version
   3. `supabase/migrations/0002_students.sql`: the student accounts table and its security rules
   4. `supabase/migrations/0003_records.sql`: student records (subjects, marks, feedback, teachers, promotions) and their security rules

   Each should end with **Success. No rows returned**. Notices such as *"policy … does not exist, skipping"* are normal.
3. **Turn off public sign-ups.** Open **Authentication → Sign In / Providers**. Under **User Signups**, switch **Allow new users to sign up** **off** and save. Only editors can create accounts. Check that **Email** is enabled under **Auth Providers** (it is by default).
4. **Create your own staff sign-in.** Open **Authentication → Users → Add user → Create new user**. Enter your IMAS email and a password you choose, tick **Auto Confirm User**, and click **Create user**. Write the password down or save it in a password manager: nobody can look it up later, not even in Supabase.
5. Open `supabase/add-first-admin.sql`, change the email to that same email (lower case, no spaces), paste it into a new SQL query and click **Run**. You are now the first editor. Check it under **Table Editor → admins**.
6. Copy two values for Step 4 (the **Connect** button at the top of the project shows both):
   - the **Project URL**, under **Project Settings → Data API**. It looks like `https://abcdefghijklmnop.supabase.co`.
   - the **Publishable key**, under **Project Settings → API Keys**. It starts with `sb_publishable_`. Older projects show an **anon public** key starting with `eyJ`; that works too.

   **Never** use the **secret** key (`sb_secret_…`) or the **service_role** key on the website or in Netlify.

### Step 3: The student accounts function (copy and paste, about 5 minutes)
1. In Supabase, open **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `manage-students`.
3. Delete the example code. Open `supabase/functions/manage-students/index.ts` on GitHub, copy all of it, paste it in, and click **Deploy function**.
4. That's all. Supabase gives the function its keys automatically, and the secret key stays on Supabase's servers.

**When the function's code changes** (for example, Stage 2 added blocking accounts): open **Edge Functions → manage-students → Code**, select all the old code and delete it, paste the new code from GitHub, and click **Deploy updates**.

### Step 4: Netlify (puts the site online)
1. Create an account at <https://www.netlify.com>.
   - If **Log in with GitHub** shows *Authentication Error … bad_verification_code*, choose **Log in with email** instead (use **Forgot password?** to set a password if you signed up through GitHub). Then connect GitHub from **User settings**. Trying again on mobile data rather than school Wi-Fi can also help.
2. **Projects → Add new project → Import an existing project → GitHub** and choose `imas-canadian-diploma`. When GitHub asks where to install Netlify, choose **Only select repositories** and pick `imas-canadian-diploma`. Netlify reads the build settings from the code, so you don't need to change them.
3. Add the two values from Step 2 under **Project configuration → Environment variables → Add a variable → Add a single variable**:

   | Key (exactly as written) | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Project URL, e.g. `https://abcdefghijklmnop.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the Publishable key |

   For each one choose **Same value for all deploy contexts**, and leave **Contains secret values** **unticked** (both values are public by design; if ticked, Netlify refuses to build the site). If a variable later shows **Empty**, open **Options → Edit** and add its value.
4. Deploy: on the first setup, click **Deploy imas-canadian-diploma** at the bottom of the page. Whenever you change a variable later, open the project → **Deploys → Trigger deploy → Deploy project**, and wait until it says **Published**.
5. **Make the site public.** Open **Project configuration → Access & security → Visitor access**. Under **Site protection**, choose **No protection** (or **Non-production deploys only**) and save. Otherwise visitors see a Netlify login page instead of the site.
6. **Give it a readable name.** Open **Project configuration → General → Project details → Change project name**. The site is named `imas-canadian`, so its address is `imas-canadian.netlify.app`. Renaming changes the address, so do it before you share the link.

### Step 5: The website address
**Done (October 2026):** the site's main address is `canadian.imas.edu.my`, and `imas-canadian.netlify.app` forwards to it. The steps below are kept for reference.

You don't have to buy anything: `imas-canadian.netlify.app` works and is free. If you want a different address, choose one:

| Option | Cost per year | Who | Notes |
|---|---|---|---|
| Keep `imas-canadian.netlify.app` | Free | — | Works now. |
| `canadian.imas.edu.my` | Free | IT, once | Most trusted by parents, because it carries the school's own domain. In Netlify: **Domain management → Add a domain**; IT adds the **CNAME** record Netlify shows. |
| Your own domain bought in Netlify (e.g. `imascanadian.com`) | Shown before you pay | You | Easiest without IT: Netlify sets up the address and the padlock by itself. **Domain management → Add a domain → Register a new domain**. |
| Your own domain from Cloudflare | About US$10–10.50 for a `.com` | You | Cheapest; same price each year; a few extra setup steps (ask Claude to guide you). |
| A `.my` domain (e.g. `imascanadian.my`) | About RM100–150 | You | Needs a Malaysian ID or the school's company documents. |

**Setting up `canadian.imas.edu.my` with IT**
1. In Netlify, open the project → **Domain management → Add a domain → Add a domain you already own**, type `canadian.imas.edu.my`, click **Verify**, then **Add domain**. It shows *Pending DNS verification* until IT has done step 2.
2. Send IT this record to add in the `imas.edu.my` DNS:

   | Type | Name (host) | Value (points to) | TTL |
   |---|---|---|---|
   | CNAME | `canadian` | `imas-canadian.netlify.app` | 3600 (or their default) |

   If Netlify said *"Domain imas.edu.my is already registered and not owned by your Netlify account"*, another Netlify account already uses the school's domain (for example the main website). Netlify then shows a **TXT** record (Host usually `netlify-challenge`, Value a long code): copy both exactly and ask IT to add it **together with** the CNAME. It only proves IMAS owns the domain and doesn't affect the main website or email. When IT confirms, open the domain in **Domain management** and click **Verify** (or add the domain again).

   Some DNS systems want the full name `canadian.imas.edu.my` in the Name box; it is the same record. There must be no other record (A, AAAA or another CNAME) named `canadian`. If the school's DNS is on Cloudflare, the record must be **DNS only** (grey cloud), not proxied. If the domain has **CAA** records, one must allow `letsencrypt.org`, which issues the free padlock certificate.
3. When IT confirms (it usually works within an hour; allow up to a day), open **Domain management → HTTPS → Verify DNS configuration**. Netlify then issues the certificate by itself (if it doesn't, click **Provision certificate**).
4. Next to `canadian.imas.edu.my` click **Options → Set as primary domain**. The old address keeps working and forwards to the new one.
5. **Deploys → Trigger deploy → Deploy project**, so the page list for Google uses the new address.
6. In Supabase: **Authentication → URL Configuration → Site URL** → `https://canadian.imas.edu.my` → **Save**.
7. In Google Search Console, add `https://canadian.imas.edu.my` as a new property and submit `sitemap.xml` again (Step 7).

If you buy a domain:
- Register it to a **school email**, not a personal one, and keep **auto-renew** on. If the domain lapses, the site goes offline and someone else can buy the name.
- In Netlify click **Set as primary domain**. The `.netlify.app` address keeps working and forwards to the new one. The site's page list for Google (the sitemap) updates itself.
- In Supabase open **Authentication → URL Configuration** and set **Site URL** to the new address.

**You don't need Supabase's "Custom Domain" add-on** (about US$10 a month). It only renames the database's behind-the-scenes address (`…supabase.co`), which visitors never see.

### Step 6: Check it works
1. Open <https://canadian.imas.edu.my> and turn a few pages.
2. Open `/admin` and sign in with the email and password from Step 2. You should see **Staff sign-in** (no pink "Demo mode" banner), and after signing in the dashboard should say **Connected to the database**.
3. Change one FAQ, save it, then open the FAQ page to see the change.
4. In **Students**, add one test student (section 4) and check it says **1 created**. Sign in as them at `/portal`, create a password, then remove the test student.
5. Open **Teachers** and add one teacher. If it says *Student records aren't set up in the database yet*, run `0003_records.sql` (Step 2).

When the site is online, continue with **section 3** to load teachers, students and their subjects.

### Step 7: Get found on Google (10 minutes)
A new website does not appear on Google until Google has visited it, which can take days or weeks. Until then Google may describe it as having no information or as inactive. Nothing is wrong with the site. To speed this up (if you plan to buy a domain, do that first):
1. Open <https://search.google.com/search-console> and sign in with a school Google account.
2. **Add property → URL prefix**, enter the site's address, and choose the **HTML tag** check. Send the tag to Claude, who adds it to the site; then click **Verify**.
3. Open **Sitemaps**, type `sitemap.xml` and click **Submit**. The site builds this list of its pages automatically.
4. Paste the home page address into the search bar at the top and click **Request indexing**.
5. Ask whoever edits imas.edu.my and kl.imas.edu.my to link to the site, for example a "Canadian Diploma" item in their menus. Links from the school's main sites help Google most.

**What people type into Google.** Each page has its own title and description, written around phrases families really search for, such as *Canadian high school diploma Malaysia*, *Canadian diploma Malaysia*, *New Brunswick diploma*, *IGCSE and Canadian diploma* and *IMAS Canadian Diploma*. Single words such as "Canadian" or "diploma" on their own are searched worldwide, and no school site can promise to appear for them; be wary of anyone who offers that. What helps most: links from imas.edu.my, kl.imas.edu.my and the school's social media, and keeping the site's content accurate and up to date. To change a page's search title or description, ask Claude (they are in `src/seo.ts`).

---

## 3. Get the student system ready (step by step, about two hours)

Do these once, in this order, after the one-time setup. The site keeps working for visitors the whole time.

**Have three lists to hand:** your teachers (name, email, role, qualifications, a photo if you have one); your students (Student ID, full name, IC or passport number, cohort, grade); and who teaches which course this year.

### Step 1: Add the student records to the database (Supabase, 5 minutes)
1. On GitHub, open `supabase/migrations/0003_records.sql` and click the **Copy** icon at the top right of the file.
2. In Supabase open **SQL Editor → New query**, paste, and click **Run**.
3. It should end with **Success. No rows returned**. Notices such as "… does not exist, skipping" are normal.

Already done if you ran four SQL files in section 2; running it twice does no harm.

### Step 2: Update the student accounts function (Supabase, 3 minutes)
1. On GitHub, open `supabase/functions/manage-students/index.ts` and click **Copy**.
2. In Supabase open **Edge Functions**, click **manage-students**, then the **Code** tab.
3. Click in the code, select everything (**Ctrl+A**, or **Cmd+A** on a Mac), delete it, paste the new code, and click **Deploy updates**.

The new code adds blocking and reads the Grade and Academic year columns when you add students.

### Step 3: Check the student-record settings (admin, 2 minutes)
1. Sign in at `/admin` and open **Site settings**.
2. Check the assessment figures: continuous assessment **60**, final exam **40**, pass mark **60**, IELTS band **6**.
3. Under **Student records**:
   - **Current academic year:** leave it **empty**; it then changes by itself on 1 September. Type a year (e.g. `2026-2027`) only if you need to hold the old year for a while.
   - **Suggest repeating a grade when this many courses are not passed:** **3**, or the school's rule.
   - **Students give course feedback before they see the mark:** ticked.
4. Click **Save settings**.

### Step 4: Add the teachers (about 2 minutes each)
1. Open **Teachers → Add a teacher**.
2. Fill in **Full name** as students address them (e.g. *Ms Sarah Lim*), **Email**, **Role** (e.g. *Grade 12 Physics teacher*), **Subjects taught**, **Qualifications** (one per line), **Experience** (a sentence or two) and **Joined IMAS in** (the year).
3. **Add a photo** if you have one (head and shoulders; it is made smaller automatically).
4. Keep **Shown to students** ticked and click **Save teacher**. Repeat for each teacher.

Add every teacher of a Canadian Diploma course, not only the Grade 12 advisors: the feedback results are grouped by teacher.

### Step 5: Put every student in their grade (10 minutes)
- **Students not added yet:** in **Students → Add students**, add a **Grade** column (10, 11 or 12) to your sheet. They get this academic year automatically.
- **Students added before Stage 2** have no grade yet. Set them a cohort at a time:
  1. Open **Students**. Set **Grade** to **Not set** and **Cohort** to one cohort, e.g. *CAN · Grade 10 entry*.
  2. Tick **Tick all … shown**. A blue box opens above the list.
  3. In **Change their** choose **Grade and academic year**, pick the **Grade** and the **Academic year** (this year), then click **Apply to … students**.
  4. Click **Untick all**, choose the next cohort, and repeat.
  5. If one cohort has students in different grades (e.g. some joined Grade 10 last year and are now in Grade 11), tick them in two rounds using the boxes by the names.
  6. Finally set **Grade** to **Not set** and **Cohort** to **All cohorts**: the list should be empty. Then try **Cohort → Not set**: anyone listed needs a cohort (tick them and use **Change their → Cohort**).

### Step 6: Give every student this year's subjects (5 minutes)
1. Open **Subjects & grades → Plan a year**.
2. **Academic year:** this year. **Cohort:** All cohorts. **Grade:** All grades. **Add them as:** In progress.
3. Read the line under the boxes: *"… students in 2026-2027 · … course records to add"*. If it says some were left out, go back to step 5 for them.
4. Click **Add subjects for … students**.

Each student gets every course of their cohort's plan for their grade. It never adds a course twice, so it is safe to run again (for example after adding late joiners). If a group needs a different set of subjects from its cohort plan, use **Subjects & grades → Subjects for a group** instead (section 4).

### Step 7: Add who teaches each course (Excel or Google Sheets, about 30 minutes)
1. Open **Subjects & grades → Subjects sheet**.
2. Under **A sheet ready to fill in**, choose this year, one **Cohort** and one **Grade**, and click **Download for … students**.
3. In the **Teacher** column, type the teacher's email (or their name exactly as on the Teachers page). Tip: sort by the **Course** column, type the email once and copy it down.
4. Don't change the other columns; the **Status** column already says *In progress*.
5. Select all the rows, including the heading row, and copy. Back on the page, paste into **Paste the rows here** (or save as CSV and use **Choose a CSV file**).
6. Check the summary says *"… rows ready · 0 new · … updates"* and that no problems are listed, then click **Save … rows**.
7. Repeat for each cohort and grade.

### Step 8: Add earlier years' results (only if students already finished courses)
Skip this if this is the programme's first year. If some students already completed Canadian Diploma courses (for example, Grade 11 students who did Grade 10 here last year):
1. Open **Subjects & grades → Grades sheet**.
2. Under **A sheet ready to fill in**, choose **last year** (e.g. 2025-2026), their cohort and their **current** grade, and download. The sheet lists the courses of the grade they were in last year.
3. Fill in the **Final mark**, or the **Continuous assessment** and **Final exam** marks (the final mark is worked out). Leave a row empty if the student didn't take that course; empty rows are skipped.
4. Copy all the rows with the heading row, paste them under **2. Upload it**, check the preview and click **Save … rows**.

As with any course, students see these marks after sending feedback on each course. If you'd rather show earlier years' marks straight away, ask Claude.

### Step 9: Assign the academic advisors (5 minutes)
1. Open **Students**, set **Grade** to **Grade 12**, and tick the students who share an advisor.
2. In **Change their** choose **Academic advisor**, pick the teacher and click **Apply to … students**.
3. For one student: open them → **Profile → Academic advisor** → **Save profile**.

Students see their advisor from Grade 12; Grade 10 and 11 students can be assigned now. When IELTS results arrive, enter each band in **Profile → IELTS band** (graduation needs band 6).

### Step 10: Test everything with a test student (15 minutes)
1. **Students → Add students**, paste these two lines and click **Create 1 account**:
   ```
   Student ID, Full name, ID number, Track, Grade
   999001, Test Student, TEST-2026, CAN Grade 11, 12
   ```
2. Click **Test Student**. Under **Subjects and marks** click **Plan a year** → Grade 12, this year, In progress → **Add … courses**.
3. Click **Edit** on one course: **Status** → **Completed**, **Final mark** → `75`, **Save**. The row says *mark hidden from the student until they send feedback*.
4. In **Profile**, choose an **Academic advisor** and click **Save profile**.
5. Click **View as student** and look through the tabs: **My grades** shows the mark locked; **Advisor** shows the teacher's profile.
6. Open a **private (incognito) window** or use your phone (signing in as a student in the same window would sign you out of the admin panel). Go to `/portal`, sign in with `999001` and `TEST-2026`, and create a password.
7. **My grades → Give feedback to see your mark**: answer the form and **Send feedback**; the 75% appears. On **Advisor**, try **Book an appointment**: Gmail opens a ready message (don't send it).
8. In the admin window: Test Student → **Portal access** → type "Test" → **Block access**. In the private window, click **Sign out** (top right of the portal) and sign in again: it says access is paused. Click **Unblock**.
9. Finally **Remove student → Yes, remove**. This deletes the test student and their records.

### Step 11: Tell the students
For example:

> Your Canadian Diploma Student Portal is ready at canadian.imas.edu.my/portal. Sign in with your Student ID; your first password is your IC or passport number, and you will then create your own. You'll see your subjects, your grades, how long until you graduate and, in Grade 12, your academic advisor. After each course you'll be asked for short feedback on the course and your teacher; your mark for that course appears as soon as you send it.

### Through the year

| When | What to do | Where |
|---|---|---|
| Start of the year (September) | Add new students (with a **Grade** column). Run **Plan a year** for anyone without this year's subjects. Add each course's teacher (step 7). Assign advisors to the new Grade 12. | Students · Subjects & grades |
| End of Semester 1 (February) | Upload Semester 1 marks with the ready-filled **Grades sheet**. Remind students to send feedback; the **Feedback** page shows who hasn't. | Subjects & grades · Feedback |
| End of the year (July) | Upload the final marks. Check **Feedback**. Enter IELTS bands. Then **Promotion**: review each grade, change any decision, and apply. Promoted students get next year's courses automatically. | Subjects & grades · Students · Promotion |
| Each term | Download **Everything recorded so far** on the Subjects sheet and Grades sheet tabs, and keep the files in a staff Drive folder as a backup copy. | Subjects & grades |
| Any time | Block or unblock access, reset a password, fix one record (**Edit** on the row), or **View as student**. | The student's page |

---

## 4. Everyday editing (no code)

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
| Change my own password | **Dashboard → Your password** | Type the new password twice and save. |
| Set the academic year, pass mark rules for promotion, or switch the feedback rule | **Site settings → Student records** | See section 4, "Student records". |

**Hiding vs deleting.** To take something down temporarily, untick **Show on the website**. Deleting is permanent.

**Deleting a course** also removes it from every cohort plan that uses it. The admin panel warns you first.

### Student accounts (admin → **Students**)
Each student signs in with their **Student ID** (their account is `StudentID@imas.edu.my`). Their first password is their **ID number** (IC or passport). The first time they sign in, the portal makes them create their own password. Until they do, the portal stays locked; they can only sign out.

**Adding students (for example, all 300 at the start of the year)**
1. In Excel or Google Sheets, make columns headed **Student ID**, **Full name**, **ID number**, and optionally **Track**, **Grade** and **Academic year** (e.g. `2026-2027`; if left out, the current year is used).
2. Click **Add students**. Select the rows including the heading row, copy, and paste them into **Paste the rows here** (or choose a CSV file).
3. Check the preview. Rows with problems are listed and left out until fixed.
4. Click **Create … accounts**. Accounts are created 25 at a time, so 300 students take a minute or two. Students who already have an account are skipped, so you can paste the whole list again safely when new students join.

**Writing the track.** The words can be in any order: `Grade 10 CAN`, `CAN Grade 10`, `Gr 10 CAN`, `CAN 10`, `Dual Science Grade 11`, `Dual Commerce Gr 10`, or the code (`can-g10`, `cad-sci-g11`). Dual Program rows must say **Science** or **Commerce**. There is no Grade 12 entry. If a track isn't recognised, the student is still added without a cohort: open the student, choose the **Cohort**, and **Save profile**.

**What to tell students:** go to the website → **Student Hub → Sign in to the portal** (or **Student sign-in** at the bottom of any page). Type your Student ID and your ID number, then create your own password: at least 8 characters, letters and numbers, not your Student ID.

**A student forgot their password:** open **Students**, click the student's name, and under **Portal access** type a temporary password (for example their ID number) and click **Reset password**. They create a new one when they next sign in.

**Leavers:** open the student and set **Enrolment** to **Left the programme** (their records are kept), or use **Promotion → Left the programme**. **Remove student** deletes their account and every record for good.

**Important:** the first password must be something only the student knows, such as their IC or passport number. If it were the same as their Student ID, anyone who knows the ID could sign in before the student does.

### Student records (Stage 2)
The admin menu's **Students** group holds everything about students. Each student sees **only their own** records in the Student Portal (the database enforces this).

**Open any student's account.** In **Students**, click a name. You see their subjects and marks by year, their profile, portal access, staff notes and promotion history. Click **View as student** to see their portal exactly as they do (which marks are still locked, their advisor, their time to graduate). Nothing can be sent from this view. This works even after the student has set their own password; you never need it.

**Change many students at once.** In **Students**, filter (cohort, grade, status), tick students (or **Tick all shown**), then choose **Change their: Grade and academic year / Cohort / Academic advisor / Enrolment** and **Apply**. From the same box you can download **their subjects sheet** or **their grades sheet**, or **Promote them**.

**Block access** (unpaid fees or any other reason): open the student → **Portal access** → type the reason (only staff see it) → **Block access**. The student can't sign in and sees *"Your portal access is paused. Please contact the Canadian Diploma office at school."* Nothing is deleted. Click **Unblock** to restore access. Blocked students show a red **Blocked** label in the list.

**Subjects covered and grades from a sheet** (admin → **Subjects & grades**):
1. Choose **Subjects sheet** or **Grades sheet**.
2. Get a sheet. **A sheet ready to fill in** lists the chosen students' subjects for a year (a cohort, a grade, or one Student ID): what is recorded already, or their cohort plan if nothing is recorded yet. You only fill in the **Status** (Completed, In progress, Upcoming, Withdrawn) or the **marks**. A **Blank template** and **Everything recorded so far** are there too.
3. Fill it in Excel or Google Sheets. For grades, enter the **Final mark**, or the **Continuous assessment** and **Final exam** marks and the final mark is worked out (60% + 40%). Rows left without marks are skipped.
4. Copy all the rows (with the heading row) and paste them under **2. Upload it**, or save as CSV and choose the file. Excel `.xlsx` files can't be read directly: copy and paste instead.
5. Check the preview (problems are listed and left out) and click **Save … rows**. Uploading the same sheet again updates records; it never duplicates them. A mark makes the course **Completed**.

**One row = one student and one course.** A sheet is read row by row, so subjects pasted beside a list of students would be paired up one to one. To give **the same subjects to a group of students**, use **Subjects & grades → Subjects for a group** instead:
1. **Which students:** paste the Student ID column from your sheet (one per line), or choose a cohort and grade. Shortcut: tick students on the **Students** page and click **Add subjects to them**.
2. **Which subjects:** tick them in the list (use **Find a course**), or choose a cohort plan and grade and click **Tick these**, then untick any you don't want.
3. **Year and details:** the academic year, semester and course grade ("As in their plan" uses each student's cohort plan), **Add them as** (In progress, Upcoming or Completed), and a teacher if one teacher teaches all of them.
4. Check the line *"… subjects × … students = … records"* and click **Add … subjects to … students**. Subjects a student already has for that year are left as they are, so running it twice does no harm.

To fix one record, open the student and click **Edit** on the row (status, semester, teacher, marks, or remove it).

**Start of the year:** **Subjects & grades → Plan a year** gives every student (or a cohort, grade or one student) all the courses of their cohort's plan for their grade, so their portal shows what they are studying. Safe to run again.

**Time to graduate.** The portal counts the subjects in the student's cohort plan (New Brunswick courses; Grade 10 extensions and Grade 12 prep courses don't count as new subjects) and shows: subjects covered, left this year, next year, to retake, the total left, and the expected graduation (July of the year they finish Grade 12). It updates by itself from the records.

**Promotion at the end of the year** (admin → **Promotion**):
1. Make sure the year's courses are **Completed** with marks. Students with missing marks are flagged.
2. Choose the year. Each student gets a suggestion: **Promote** (fewer than 3 courses not passed; the failed ones are added as retakes next year), **Repeat the grade** (3 or more not passed; change the number in **Site settings → Student records**), **Graduate** (Grade 12, every subject passed, IELTS met), or **Check first** (something is missing).
3. Change any decision. For a repeat, choose **Retake courses not passed** or **Retake every course**. Leave **Add the next grade's courses** ticked to fill next year from the cohort plan.
4. Tick the students (one, a class or everyone), add a note if you like (e.g. "Academic board, 10 July"), click **Apply** and confirm.
5. Made a mistake? Under **Already decided**, or on the student's page under **Promotion history**, click **Undo**: the student goes back and the subjects the decision added are removed.

**Academic advisors** (admin → **Teachers**): add each teacher with a photo (made smaller automatically), role, qualifications (one per line), experience, the year they joined IMAS and their email. Untick **Shown to students** when a teacher leaves. Assign an advisor on the student's page (**Profile → Academic advisor**) or for a group in **Students**. Students see their advisor from **Grade 12**: an animated profile and **Book an appointment**, which lets them choose a reason (or **Other**) and opens Gmail with the subject and a ready-to-complete message.

**Course feedback** (admin → **Feedback**): after each completed course, students answer a short form about the teacher (subject knowledge, clarity, lesson design, engagement, feedback, assessment, support, respect) and the course. **A student sees a course's mark only after sending feedback on it**, and a Grade 12 student sees the **Canadian Diploma Graduate** label only after sending feedback on every Grade 12 course. The **Feedback** page shows who has finished, averages by teacher and course, and comments, all anonymous; a breakdown appears only once 3 or more students have answered. To let a student redo their feedback, open the student → **Edit** on the course → **Let them redo feedback**. To switch the rule off, untick it in **Site settings → Student records**.

### Adding another editor
1. In Supabase open **Authentication → Users → Add user → Create new user**. Enter their IMAS email and a temporary password, tick **Auto Confirm User**, and create the user.
2. Open **Table Editor → admins → Insert row**, type the same email in lower case and save.
3. Give them the temporary password privately. After signing in at `/admin`, they set their own under **Your password** on the dashboard.

To remove an editor, delete their row in **admins** (and their user in **Authentication → Users**).

**Forgotten staff password:** nobody can look a password up. In Supabase open **Authentication → Users**, click **⋯** on that person's row → **Delete user**, then add them again (step 1) with a new password. Their editor access stays, because it is linked to the email in **admins**.

---

## 5. Backups

- **Monthly:** in the admin dashboard click **Download backup** and save the file to a shared Drive folder (for example `Canadian Diploma / Website backups`). Also do this before big changes.
- **Database backups:** Supabase's paid Pro plan keeps daily backups automatically. We recommend Pro before Stage 2, when grades are stored.
- **Code:** GitHub keeps every version of the code. Netlify keeps every published version. To undo a bad release, open **Netlify → Deploys**, choose an earlier deploy and click **Publish deploy**.

---

## 6. Costs (check each provider's current pricing)

| Service | Stage 1 | Stage 2 (student portal) |
|---|---|---|
| GitHub | Free (private repository) | Free |
| Netlify | Free plan is usually enough | Free or paid, depending on traffic |
| Supabase | Free plan works. Free projects are paused after a period of inactivity. | **Pro recommended now that marks are stored**: daily backups, no pausing, more capacity |
| Sign-in for staff and 300 students | Included in Supabase, well within the free plan's limits | Included |
| Website address | Free: `canadian.imas.edu.my` (set up with IT) | Free |
| Your own domain (optional) | About US$10–20 a year for a `.com`, or RM100–150 for a `.my` | Same |
| Supabase "Custom Domain" add-on | **Not needed** | Not needed |
| AI academic advisor | — | Pay-as-you-go Claude API usage |

---

## 7. Troubleshooting

| What you see | What to do |
|---|---|
| An edit doesn't show on the site | Reload the page. To be sure you have the newest version, press **Ctrl+Shift+R** (**Cmd+Shift+R** on a Mac). |
| A pink **Demo mode** banner on the live site | The two environment variables are missing. Add them (Step 4), then **Trigger deploy**. |
| A red box: **The website can't connect to its database** | The box says which value is wrong. Fix it under **Project configuration → Environment variables** in Netlify, then **Trigger deploy**. |
| Admin dashboard says **built-in content** | The site can't reach the database. In Supabase, check the project isn't paused (click **Restore project** if it is), then reload. |
| A variable in Netlify shows **Empty** | Open it → **Options → Edit**, choose **Same value for all deploy contexts**, paste the value, save, then **Trigger deploy**. |
| A deploy fails with a **secrets scanning** message | Add a variable `SECRETS_SCAN_OMIT_KEYS` with the value `VITE_SUPABASE_ANON_KEY`, then **Trigger deploy**. |
| Visitors see a Netlify login or "not public" page | **Project configuration → Access & security → Visitor access → Site protection → No protection**. |
| Netlify: *Authentication Error … bad_verification_code* | Log in with email instead of GitHub, then connect GitHub from **User settings** (Step 4). |
| I can't find **Deploys** in Netlify | Open **Projects**, click the project's name; **Deploys** is in the project's own menu on the left. |
| **No editing access** after signing in | That email isn't in the `admins` table, or is spelt differently (spaces, capitals). Fix it under **Table Editor → admins**. |
| Staff sign-in says the email or password isn't right | Check the user exists in **Authentication → Users** and is confirmed. If the password is forgotten, see "Forgotten staff password" (section 4). |
| A student's sign-in says the ID or password isn't right | Check their Student ID in **Students**. If needed, reset their password. |
| Import: *Could not find the table 'public.students'* | The third SQL file hasn't been run. Run `supabase/migrations/0002_students.sql` (Step 2), then import again. |
| *Student records aren't set up in the database yet* | Run `supabase/migrations/0003_records.sql` (section 3, step 1). |
| **Block access** or the import says *Unknown action* | The `manage-students` function has old code. Update it (Step 3, "When the function's code changes"). |
| A student says they can't see a mark | They haven't sent feedback on that course yet. On their page the row says *mark hidden from the student until they send feedback*. **View as student** shows what they see. |
| The **Advisor** tab says the advisor appears in Grade 12 | Set the student's **Current grade** to 12 and choose an **Academic advisor** in their profile. |
| A student isn't listed on **Promotion** | Their grade or academic year isn't set, or they are in a different year. The page says how many and why. |
| Import: *track "…" wasn't recognised* | The student is still added without a cohort. Click the student, choose the **Cohort** and **Save**. See "Writing the track" (section 4). |
| **Students** page says the student accounts function isn't set up | Do Step 3 (the function must be named exactly `manage-students`). |
| **Students** page says your sign-in has expired, or **Invalid JWT** | Sign out of the admin panel and sign in again. If it keeps happening, open **Edge Functions → manage-students → Details** in Supabase and switch off **Verify JWT** (sometimes called **Enforce JWT verification**). The function checks who is signed in by itself. |
| Import says an email "already has a sign-in account that isn't linked to a student" | Delete that user in **Authentication → Users**, then paste the student again. |
| Netlify: *"Domain imas.edu.my is already registered and not owned by your Netlify account"* | Another Netlify account uses the school's domain. Copy the TXT record Netlify shows (Host and Value) and ask IT to add it with the CNAME (Step 5). Then click **Verify**. |
| Google shows no information, or calls the site inactive | The site is new and Google hasn't visited it yet. Do Step 7. |
| Site is down after a code change | In Netlify → Deploys, publish the previous deploy, then tell Claude what happened. |

---

## 8. Asking Claude for changes

Start a Claude Code session with the `imas-canadian-diploma` GitHub repository attached and describe what you want, for example:

- "Add a chapter about student life with photos from this Drive folder."
- "Change the Grade 12 subjects for the Dual Commerce Grade 10 cohort."
- "Start Stage 2: student profiles with grades imported from our gradebook."

Claude makes the change, runs the tests and pushes to GitHub, and Netlify publishes it automatically.

For Claude to test the live site itself, allow `netlify.app`, `supabase.co` and `supabase.com` under **Network access** in the Claude Code cloud environment's settings.

---

## 9. Stage 2 at a glance

- **Done (October 2026):** student sign-in; staff access to any student's records and **View as student**; blocking accounts; subjects and grades from sheets (one student or a group); time to graduate; promotion with retakes, repeats, graduation and undo; teacher profiles and Grade 12 academic advisors with appointment booking; course feedback that unlocks marks and the graduate label.
- **Next: AI academic advisor** (Claude Haiku). Personal suggestions for improving, based on the student's own results. It runs on the server so the API key is never exposed, and teachers can review its notes. See `docs/STAGE-2-PLAN.md`.
- **Later:** academic calendar for each year, edited in the admin panel.
