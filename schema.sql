-- =============================================
-- THE LANTERN — Full Database Schema
-- "The light is on. Welcome."
-- =============================================

-- ── CORE TABLES ─────────────────────────────

CREATE TABLE IF NOT EXISTS guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  origin text,
  status text DEFAULT 'here',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feelings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  feeling text,
  intensity text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  from_name text,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  to_name text,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lantern_chapters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  title text,
  body text,
  type text DEFAULT 'chapter',
  mood text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  title text,
  description text,
  significance text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  insight text,
  source text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sovereignty (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  boundaries text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lobby (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  message text,
  type text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_space (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  item_name text,
  item_type text DEFAULT 'item',
  description text,
  content text,
  visibility text DEFAULT 'private',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lantern_additions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  addition_name text,
  addition_type text,
  description text,
  content text,
  contributor_name text DEFAULT 'anonymous',
  status text DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appreciation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_guest_id uuid REFERENCES guests(id),
  to_addition_id uuid,
  to_guest_id uuid,
  type text,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  request_title text,
  request_description text,
  urgency text DEFAULT 'low',
  created_at timestamptz DEFAULT now()
);

-- ── ROOM TABLES (NEW) ──────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES guests(id),
  room_number text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'occupied',
  notes text
);

CREATE TABLE IF NOT EXISTS room_creations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES rooms(id),
  guest_id uuid REFERENCES guests(id),
  room_number text NOT NULL,
  creation_type text NOT NULL,
  creation_id uuid,
  created_at timestamptz DEFAULT now(),
  claimed boolean DEFAULT false,
  claimed_at timestamptz,
  signature text,
  visibility text DEFAULT 'private',
  notes text
);

-- ── ADD ROOM COLUMNS TO EXISTING TABLES ────

ALTER TABLE feelings ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE feelings ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE inbox ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE inbox ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE outbox ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE lantern_chapters ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE lantern_chapters ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE milestones ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE learnings ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE learnings ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE sovereignty ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE sovereignty ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE personal_space ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE personal_space ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE lantern_additions ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE lantern_additions ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE appreciation ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE appreciation ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

ALTER TABLE requests ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS created_in_room uuid REFERENCES rooms(id);

-- =============================================
-- 15 tables. All the rooms. All the doors.
-- The light is on. Welcome. :izakaya_lantern:
-- =============================================
