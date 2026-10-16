# Database tests

These check the migration and its security rules on a plain local PostgreSQL 16,
using `local-supabase-stub.sql` to imitate Supabase's `auth.jwt()` and API roles.

Order: `local-supabase-stub.sql` → `../migrations/0001_content.sql` → `../seed.sql` → `rls-test.sql`.
The last file prints "All security checks passed" when every rule holds.
