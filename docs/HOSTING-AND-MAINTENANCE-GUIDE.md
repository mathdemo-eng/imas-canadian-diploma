# Canadian Diploma website: Hosting & Maintenance Guide

For the Deputy Head of Secondary (Academic), the IMAS IT team, and anyone who edits the site.
No programming is needed for day-to-day work.

---

## 1. How the pieces fit

| Piece | What it does | Who looks after it |
|---|---|---|
| **GitHub** | Stores the website's code. | Claude makes code changes here when you ask. |
| **Netlify** | Puts the website on the internet. It rebuilds the site automatically whenever the code on GitHub changes. | Set up once. |
| **Supabase** | The database: subjects, tracks, universities, FAQs, announcements, settings and the list of editors. Also handles Google sign-in. | You edit it through the site's admin panel. |
| **Google Workspace** | Staff sign in to the admin panel with their @imas.edu.my accounts. | IT, once. |
| **School DNS** | Points `canadian.imas.edu.my` at Netlify. | IT, once. |

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
2. Open **SQL Editor → New query**. Paste the whole of `supabase/migrations/0001_content.sql` and click **Run**.
3. Start another new query. Paste the whole of `supabase/seed.sql` and click **Run**. This loads all the content from this guide's first version.
4. Open `supabase/add-first-admin.sql`, change the email to **your own** IMAS Google address (lower case), paste it into a new query and click **Run**. You are now the first editor.
5. Go to **Project Settings → API** (or **API Keys**) and copy two values for Step 4:
   - the **Project URL**
   - the **anon / publishable** key (the public one). **Never** use the `service_role` or secret key on the website.

### Step 3: Google sign-in (**IT**)
1. In <https://console.cloud.google.com>, create a project called `IMAS Canadian Diploma`.
2. Open **Google Auth Platform** (OAuth consent screen). Set **Audience / User type: Internal**, so only @imas.edu.my accounts can sign in.
3. Create an **OAuth client**, type **Web application**:
   - **Authorised JavaScript origins:** `https://canadian.imas.edu.my`
   - **Authorised redirect URI:** the callback URL shown in Supabase under **Authentication → Sign In / Providers → Google**. It looks like `https://<your-project>.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client secret** into Supabase (**Authentication → Sign In / Providers → Google**), switch Google **on** and save.
5. In Supabase, open **Authentication → URL Configuration**:
   - **Site URL:** `https://canadian.imas.edu.my`
   - **Redirect URLs:** add `https://canadian.imas.edu.my/admin` and the Netlify address from Step 4 followed by `/admin`.

### Step 4: Netlify (puts the site online)
1. Create an account at <https://www.netlify.com> and sign in with GitHub.
2. **Add new project → Import an existing project → GitHub** and choose `imas-canadian-diploma`.
   Netlify reads the build settings from `netlify.toml`, so you don't need to change anything.
3. Before deploying, open **Environment variables** and add:
   - `VITE_SUPABASE_URL` = the Project URL from Step 2
   - `VITE_SUPABASE_ANON_KEY` = the anon / publishable key from Step 2
4. Click **Deploy**. After a minute or two the site is live at an address like `imas-canadian-diploma.netlify.app`.
   If you add or change environment variables later, go to **Deploys → Trigger deploy** so they take effect.

### Step 5: The school address (**IT**)
1. In Netlify, open **Domain management → Add a domain** and enter `canadian.imas.edu.my`.
2. IT adds the DNS record Netlify shows, usually a **CNAME** from `canadian` to `<your-site>.netlify.app`.
3. Netlify turns on HTTPS (the padlock) automatically within about an hour.

### Step 6: Check it works
1. Open `https://canadian.imas.edu.my` and turn a few pages.
2. Open `https://canadian.imas.edu.my/admin` and sign in. The dashboard should say **Connected to the database**.
3. Change one FAQ, save it, then open the FAQ page to see the change.

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

### Adding another editor
In Supabase open **Table Editor → admins → Insert row**, type their IMAS email in lower case and save.
They can then sign in at `/admin`. To remove an editor, delete their row.

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
| Google sign-in | Free with Google Workspace | Free |
| AI academic advisor | — | Pay-as-you-go Claude API usage |

---

## 6. Troubleshooting

| What you see | What to do |
|---|---|
| An edit doesn't show on the site | Reload the page. Pages already open in another tab refresh their content after a reload. |
| Admin dashboard says **built-in content** | The site can't reach the database. Check that the Supabase project isn't paused (Supabase dashboard), and that both environment variables are set in Netlify, then **Trigger deploy**. |
| **No editing access yet** after signing in | That email isn't in the `admins` table. Add it (section 3), in lower case. |
| Google shows **redirect_uri_mismatch** | The redirect URI in Google Cloud must exactly match the callback URL shown in Supabase (Step 3). |
| Google says the app is restricted | You signed in with a personal Gmail account. Use your @imas.edu.my account. |
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

- **Student sign-in** with @imas.edu.my Google accounts, using the same Supabase project.
- **Student profiles:** cohort, courses completed and in progress, grades per course (continuous assessment and final exam), credit-hours earned out of 100, IELTS status, projected graduation date.
- **Academic calendar** for each year, edited in the admin panel.
- **AI academic advisor:** personal suggestions for improving, based on the student's own results. It runs on the server so the API key is never exposed, and teachers can review its notes.
- **Data import:** grades uploaded from the school's gradebook (CSV or Google Sheets).
