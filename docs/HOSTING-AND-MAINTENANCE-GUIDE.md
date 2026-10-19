# Canadian Diploma website: Hosting & Maintenance Guide

For the Deputy Head of Secondary (Academic), the IMAS IT team, and anyone who edits the site.
No programming is needed for day-to-day work.

| | Address |
|---|---|
| Website | <https://imas-canadian.netlify.app> |
| Admin panel (staff) | <https://imas-canadian.netlify.app/admin> |
| Student Portal | <https://imas-canadian.netlify.app/portal> |
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
You don't have to buy anything: `imas-canadian.netlify.app` works now and is free. If you want a different address, choose one:

| Option | Cost per year | Who | Notes |
|---|---|---|---|
| Keep `imas-canadian.netlify.app` | Free | — | Works now. |
| `canadian.imas.edu.my` | Free | IT, once | Most trusted by parents, because it carries the school's own domain. In Netlify: **Domain management → Add a domain**; IT adds the **CNAME** record Netlify shows. |
| Your own domain bought in Netlify (e.g. `imascanadian.com`) | Shown before you pay | You | Easiest without IT: Netlify sets up the address and the padlock by itself. **Domain management → Add a domain → Register a new domain**. |
| Your own domain from Cloudflare | About US$10–10.50 for a `.com` | You | Cheapest; same price each year; a few extra setup steps (ask Claude to guide you). |
| A `.my` domain (e.g. `imascanadian.my`) | About RM100–150 | You | Needs a Malaysian ID or the school's company documents. |

If you buy a domain:
- Register it to a **school email**, not a personal one, and keep **auto-renew** on. If the domain lapses, the site goes offline and someone else can buy the name.
- In Netlify click **Set as primary domain**. The `.netlify.app` address keeps working and forwards to the new one. The site's page list for Google (the sitemap) updates itself.
- In Supabase open **Authentication → URL Configuration** and set **Site URL** to the new address.

**You don't need Supabase's "Custom Domain" add-on** (about US$10 a month). It only renames the database's behind-the-scenes address (`…supabase.co`), which visitors never see.

### Step 6: Check it works
1. Open <https://imas-canadian.netlify.app> and turn a few pages.
2. Open `/admin` and sign in with the email and password from Step 2. You should see **Staff sign-in** (no pink "Demo mode" banner), and after signing in the dashboard should say **Connected to the database**.
3. Change one FAQ, save it, then open the FAQ page to see the change.
4. In **Students**, add one test student (section 3) and check it says **1 created**. Sign in as them at `/portal`, create a password, then remove the test student.

### Step 7: Get found on Google (10 minutes)
A new website does not appear on Google until Google has visited it, which can take days or weeks. Until then Google may describe it as having no information or as inactive. Nothing is wrong with the site. To speed this up (if you plan to buy a domain, do that first):
1. Open <https://search.google.com/search-console> and sign in with a school Google account.
2. **Add property → URL prefix**, enter the site's address, and choose the **HTML tag** check. Send the tag to Claude, who adds it to the site; then click **Verify**.
3. Open **Sitemaps**, type `sitemap.xml` and click **Submit**. The site builds this list of its pages automatically.
4. Paste the home page address into the search bar at the top and click **Request indexing**.
5. Ask whoever edits imas.edu.my and kl.imas.edu.my to link to the site, for example a "Canadian Diploma" item in their menus. Links from the school's main sites help Google most.

---

## 3. Everyday editing (no code)

Sign in at **imas-canadian.netlify.app/admin** (or use **Staff sign-in** at the bottom of any page).

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

**Hiding vs deleting.** To take something down temporarily, untick **Show on the website**. Deleting is permanent.

**Deleting a course** also removes it from every cohort plan that uses it. The admin panel warns you first.

### Student accounts (admin → **Students**)
Each student signs in with their **Student ID** (their account is `StudentID@imas.edu.my`). Their first password is their **ID number** (IC or passport). The first time they sign in, the portal makes them create their own password. Until they do, the portal stays locked; they can only sign out.

**Adding students (for example, all 300 at the start of the year)**
1. In Excel or Google Sheets, make columns headed **Student ID**, **Full name**, **ID number**, and optionally **Track**.
2. Select the rows including the heading row, copy, and paste them into **Paste the rows here** (or choose a CSV file).
3. Check the preview. Rows with problems are listed and left out until fixed.
4. Click **Create … accounts**. Accounts are created 25 at a time, so 300 students take a minute or two. Students who already have an account are skipped, so you can paste the whole list again safely when new students join.

**Writing the track.** The words can be in any order: `Grade 10 CAN`, `CAN Grade 10`, `Gr 10 CAN`, `CAN 10`, `Dual Science Grade 11`, `Dual Commerce Gr 10`, or the code (`can-g10`, `cad-sci-g11`). Dual Program rows must say **Science** or **Commerce**. There is no Grade 12 entry. If a track isn't recognised, the student is still added without a cohort: click the student, choose the **Cohort**, and **Save**.

**What to tell students:** go to the website → **Student Hub → Sign in to the portal** (or **Student sign-in** at the bottom of any page). Type your Student ID and your ID number, then create your own password: at least 8 characters, letters and numbers, not your Student ID.

**A student forgot their password:** open **Students**, click the student, type a temporary password (for example their ID number) and click **Reset password**. They create a new one when they next sign in.

**Leavers:** click the student → **Remove student**. This deletes their sign-in account.

**Important:** the first password must be something only the student knows, such as their IC or passport number. If it were the same as their Student ID, anyone who knows the ID could sign in before the student does.

### Adding another editor
1. In Supabase open **Authentication → Users → Add user → Create new user**. Enter their IMAS email and a temporary password, tick **Auto Confirm User**, and create the user.
2. Open **Table Editor → admins → Insert row**, type the same email in lower case and save.
3. Give them the temporary password privately. After signing in at `/admin`, they set their own under **Your password** on the dashboard.

To remove an editor, delete their row in **admins** (and their user in **Authentication → Users**).

**Forgotten staff password:** nobody can look a password up. In Supabase open **Authentication → Users**, click **⋯** on that person's row → **Delete user**, then add them again (step 1) with a new password. Their editor access stays, because it is linked to the email in **admins**.

---

## 4. Backups

- **Monthly:** in the admin dashboard click **Download backup** and save the file to a shared Drive folder (for example `Canadian Diploma / Website backups`). Also do this before big changes.
- **Database backups:** Supabase's paid Pro plan keeps daily backups automatically. We recommend Pro before Stage 2, when grades are stored.
- **Code:** GitHub keeps every version of the code. Netlify keeps every published version. To undo a bad release, open **Netlify → Deploys**, choose an earlier deploy and click **Publish deploy**.

---

## 5. Costs (check each provider's current pricing)

| Service | Stage 1 | Stage 2 (student portal) |
|---|---|---|
| GitHub | Free (private repository) | Free |
| Netlify | Free plan is usually enough | Free or paid, depending on traffic |
| Supabase | Free plan works. Free projects are paused after a period of inactivity. | **Pro recommended**: daily backups, no pausing, more capacity |
| Sign-in for staff and 300 students | Included in Supabase, well within the free plan's limits | Included |
| Website address | Free: `imas-canadian.netlify.app`, or `canadian.imas.edu.my` with IT | Free |
| Your own domain (optional) | About US$10–20 a year for a `.com`, or RM100–150 for a `.my` | Same |
| Supabase "Custom Domain" add-on | **Not needed** | Not needed |
| AI academic advisor | — | Pay-as-you-go Claude API usage |

---

## 6. Troubleshooting

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
| Staff sign-in says the email or password isn't right | Check the user exists in **Authentication → Users** and is confirmed. If the password is forgotten, see "Forgotten staff password" (section 3). |
| A student's sign-in says the ID or password isn't right | Check their Student ID in **Students**. If needed, reset their password. |
| Import: *Could not find the table 'public.students'* | The third SQL file hasn't been run. Run `supabase/migrations/0002_students.sql` (Step 2), then import again. |
| Import: *track "…" wasn't recognised* | The student is still added without a cohort. Click the student, choose the **Cohort** and **Save**. See "Writing the track" (section 3). |
| **Students** page says the student accounts function isn't set up | Do Step 3 (the function must be named exactly `manage-students`). |
| **Students** page says your sign-in has expired, or **Invalid JWT** | Sign out of the admin panel and sign in again. If it keeps happening, open **Edge Functions → manage-students → Details** in Supabase and switch off **Verify JWT** (sometimes called **Enforce JWT verification**). The function checks who is signed in by itself. |
| Import says an email "already has a sign-in account that isn't linked to a student" | Delete that user in **Authentication → Users**, then paste the student again. |
| Google shows no information, or calls the site inactive | The site is new and Google hasn't visited it yet. Do Step 7. |
| Site is down after a code change | In Netlify → Deploys, publish the previous deploy, then tell Claude what happened. |

---

## 7. Asking Claude for changes

Start a Claude Code session with the `imas-canadian-diploma` GitHub repository attached and describe what you want, for example:

- "Add a chapter about student life with photos from this Drive folder."
- "Change the Grade 12 subjects for the Dual Commerce Grade 10 cohort."
- "Start Stage 2: student profiles with grades imported from our gradebook."

Claude makes the change, runs the tests and pushes to GitHub, and Netlify publishes it automatically.

For Claude to test the live site itself, allow `netlify.app`, `supabase.co` and `supabase.com` under **Network access** in the Claude Code cloud environment's settings.

---

## 8. Stage 2 at a glance (planned)

- **Student sign-in: done.** Student ID and password, with a forced change of the first password (section 3).
- **Student profiles:** cohort, courses completed and in progress, grades per course (continuous assessment and final exam), credit-hours earned out of 100, IELTS status, projected graduation date.
- **Academic calendar** for each year, edited in the admin panel.
- **AI academic advisor:** personal suggestions for improving, based on the student's own results. It runs on the server so the API key is never exposed, and teachers can review its notes.
- **Data import:** grades uploaded from the school's gradebook (CSV or Google Sheets).
