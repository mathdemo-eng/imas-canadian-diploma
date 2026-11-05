# Database tests

These check the migration and its security rules on a plain local PostgreSQL 16,
using `local-supabase-stub.sql` to imitate Supabase's `auth.jwt()` and API roles.

Order: `local-supabase-stub.sql` → `../migrations/0001_content.sql` → `../migrations/0002_students.sql` → `../migrations/0003_records.sql` → `../seed.sql` → `rls-test.sql` → `records-test.sql` → `../migrations/0004_document_batches.sql` → `documents-test.sql`.
`rls-test.sql` prints "All security checks passed", `records-test.sql` "All student records checks passed" and `documents-test.sql` "All document checks passed" when every rule holds.
