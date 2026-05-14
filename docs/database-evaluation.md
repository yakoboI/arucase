# PostgreSQL database evaluation (this repository)

This document evaluates **this project’s** PostgreSQL usage: runtime configuration, schema lifecycle, and operations. It is grounded in the codebase under `backend/`, not a generic product review.

---

## What “high quality” usually means for an app database

Strong setups typically combine:

- **PostgreSQL (or similar)** with a **single, ordered schema history** (migrations), not parallel fixes that environments apply in different orders.
- **Constraints and indexes** that match **real query patterns** (filters, joins, uniqueness enforced in the database—not only in application code).
- **Parameterized access** everywhere user-controlled data reaches SQL.
- **Connection pooling** sized against **PostgreSQL `max_connections`** and realistic app concurrency.
- **Observability**: slow queries, lock waits, pool wait time; ideally `pg_stat_statements` or APM database spans.
- **Operational basics**: backups, tested restores, optional PITR, documented **RTO/RPO**.
- **Security**: least-privilege database roles, TLS with verification where feasible, secrets outside the repository.

---

## How this project compares

### Strengths

1. **Engine choice** — PostgreSQL fits relational school data (students, classes, marks, foreign keys, reporting).

2. **Runtime safeguards** (`backend/config/database.js`)

   - Connection **pool** with configurable maximum size and connection timeout (tuned for production vs development).
   - **`statement_timeout`** on pooled clients to cap runaway queries.
   - Optional **`MAX_CONCURRENT_QUERIES`** returning **503** when the cap is reached—uncommon in small apps, useful under spikes.
   - **`withTransaction`** helper with **BEGIN / COMMIT / ROLLBACK** for multi-step writes.
   - **Slow-query logging** for statements exceeding one second.

3. **Schema bootstrapping** (`backend/scripts/initDatabase.js`)

   - **`CREATE TABLE IF NOT EXISTS`** plus **`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** and conditional `DO $$` blocks for evolving columns (e.g. `com`, `term`).
   - Pragmatic for **brownfield** databases where a full rebuild is not acceptable.

4. **Indexing**

   - Example: `students` indexes aligned with class-style access (`level`, `stream`, `year`) and admission lookups (`adm_no`, `(adm_no, year)`).

5. **Query style**

   - Route code generally uses **bound parameters** (`$1`, `$2`), which is the baseline defense against **SQL injection**.

---

### Weaknesses and risks

1. **Schema drift / multiple sources of truth** *(partially addressed)*

   - **Example (historical):** Pre–Form One was described differently in **`initDatabase.js`** (legacy `adm_no`) vs **`database/create_preformone_table_fixed.sql`** and **`routes/preFormOne.js`** (`admission_number`, `serial_number`, `parish`).
   - **What we did:** `initDatabase.js` now creates the **canonical** `preform_one_students` shape; migration **`1778755582339_preform-one-schema-align.sql`** upgrades existing databases (rename `adm_no` → `admission_number`, add columns, constraints, indexes, `updated_at` trigger). **`database/create_preformone_table_fixed.sql`** remains a human-readable reference—prefer **`npm run db:migrate`** for live DDL.
   - **Remaining:** Other tables or legacy SQL files may still diverge; treat **`backend/migrations/`** as the source of truth for **incremental** production changes.

2. **Historically ad-hoc change scripts**

   - Many one-off `*.js` / `*.sql` files under `backend/` preceded a single migration history.
   - **Impact:** Hard to answer “what is the schema at commit *X*?” without tribal knowledge.
   - **Mitigation (implemented):** **Versioned migrations** under `backend/migrations/` using **node-pg-migrate** (see below). New schema changes should go here.

3. **SSL in production** (`rejectUnauthorized: false` in pool config)

   - Common on some managed hosts; weakens strict TLS verification.
   - **Recommendation:** Prefer provider CA bundles and verified TLS, or keep the DB on a **private network** and document the threat model.

4. **`query()` pattern**

   - Each call checks out a client, runs one statement, releases. Sequential `await query()` chains add **round-trip latency**.
   - **Recommendation:** Measure hot paths; batch reads, reuse one client per request, or use a single SQL statement where safe.

5. **Trigger / function ordering**

   - Some standalone SQL assumes functions such as `update_updated_at_column()` already exist. Fresh installs can fail if scripts run out of order.
   - **Recommendation:** Encode dependencies in **ordered migrations** (or fold triggers into `initDatabase.js` with guards).

6. **Evolving uniqueness on `students`**

   - Application code uses **`ON CONFLICT`** variants; uniqueness in the database must match the business rule exactly.
   - **Recommendation:** One documented unique constraint (or exclusion constraint) in migrations, matching production.

---

### Additional dimensions

| Dimension | In this repo (typical) | Strong practice |
|-----------|-------------------------|-----------------|
| **Backups & restore** | Hosting responsibility | Automated backups + **restore drills**; RPO/RTO documented |
| **Least-privilege DB users** | Often one app user | Separate migrate role vs runtime role where feasible |
| **Migrations in CI** | To be wired per pipeline | Run `npm run db:migrate` (or dry-run) on deploy/staging |
| **Read replicas** | Usually unnecessary until scale | Add when reads dominate |

---

### Overall verdict

| Dimension | Rating (school admin app) | Notes |
|-----------|-----------------------------|--------|
| **DB engine & pooling** | **Good** | PostgreSQL + pool + timeouts is a solid baseline. |
| **Operational safety** | **Good** | Timeouts, optional concurrency cap, transactions. |
| **Data model consistency & migrations** | **Improving** | Versioned migrations added; drift cleanup is ongoing. |
| **Security defaults (TLS, roles)** | **Mixed** | Parameterized queries help; TLS verification and roles need explicit policy. |
| **Maintainability at scale** | **Fair → improving** | Migrations reduce script sprawl for **new** changes. |
| **Observability** | **Basic** | Slow-query logging; add DB metrics/APM as load grows. |
| **Disaster recovery** | **External** | Confirm with host (e.g. Railway): backups, PITR, retention. |

**Summary:** The **runtime database layer is stronger than average** for a Node school app. The main historical gap was **schema lifecycle** (drift, many ad-hoc scripts). **node-pg-migrate** and `backend/migrations/` establish an ordered path forward; **`initDatabase.js`** remains relevant for greenfield bootstrap—**run migrations after init** on new environments.

---

## Implemented: versioned migrations

### Tooling

- **Package:** `node-pg-migrate` (dependency in `backend/package.json`).
- **Migration directory:** `backend/migrations/`.
- **Journal table:** `public.pgmigrations` (created automatically).

### Commands (run from `backend/`)

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Apply pending migrations (`DATABASE_URL` or `PG*` vars). |
| `npm run db:migrate:dry-run` | Print SQL without executing. |
| `npm run db:migrate:down` | Roll back one migration (use with care in shared environments). |
| `npm run db:migrate:create -- <name>` | Scaffold a new **SQL** migration (pass name after `--`). |

Connection settings follow the same environment variables as `backend/config/database.js` (e.g. `DATABASE_URL`, or `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

### Current migrations

1. **`…_baseline-extensions.sql`** — `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` (matches `initDatabase.js` usage). Down migration is a deliberate no-op so extensions are not dropped while objects may depend on them.
2. **`…_preform-one-year-index.sql`** — Creates `idx_preform_one_year` on `preform_one_students(year)` when the table exists (`CREATE INDEX IF NOT EXISTS` inside a `DO` block).
3. **`…_preform-one-schema-align.sql`** — Brownfield alignment for `preform_one_students`: `adm_no` → `admission_number`, `serial_number` / `parish`, NOT NULLs, sex CHECK, unique `preform_one_students_admission_number_key`, serial/parish indexes, `update_updated_at_column` + trigger. No-op when the table is missing.

### Conventions for contributors

1. **Do not** add parallel “fix” SQL in `backend/` root for schema that belongs in production—add a **new ordered migration** instead.
2. Prefer **idempotent** DDL where possible (`IF NOT EXISTS`, guarded `DO $$` blocks for conditional tables).
3. For risky data backfills, pair the migration with a **backup**, test on a **copy** of production data, and document rollback in the migration file header (the Pre–Form One alignment migration normalizes null/invalid `sex` to `Male`—review if you need a different policy).
4. After cloning: configure `.env`, run **`npm run init-db`** if you need a full bootstrap, then **`npm run db:migrate`** so `pgmigrations` and incremental DDL stay in sync.

---

## Prioritized roadmap (remaining work)

| Priority | Item |
|----------|------|
| **P0** | ~~Reconcile **Pre–Form One** column naming~~ **Done** — `initDatabase.js` + migration `1778755582339` + `preFormOne.js` `sendError` usage fixed. |
| **P0** | Wire **`db:migrate`** into deployment/CI for staging and production. |
| **P1** | Align **`students`** unique constraints with `ON CONFLICT` usage in routes. |
| **P1** | Tighten **TLS** (CA bundle / private networking) or document accepted risk. |
| **P2** | Profile hot routes; reduce sequential `query()` where measured. |
| **P2** | Backup/restore checklist with hosting provider. |

---

## Related files

- `backend/config/database.js` — pool, timeouts, `query`, `withTransaction`.
- `backend/scripts/initDatabase.js` — initial / additive schema for empty databases.
- `backend/migrations/` — ordered, versioned DDL (source of truth for **new** changes).
- `backend/database/*.sql` — legacy / reference scripts; treat with care; prefer migrations for production deltas.

---

*Last updated: includes Pre–Form One schema alignment migration and canonical `initDatabase.js` definition for `preform_one_students`.*
