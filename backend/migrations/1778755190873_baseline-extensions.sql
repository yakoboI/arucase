-- Up Migration
-- Aligns with scripts/initDatabase.js (uuid-ossp). Safe on existing databases.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Down Migration
-- No-op: do not drop uuid-ossp (users table and other objects may depend on it).
SELECT 1;
