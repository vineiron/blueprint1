-- ============================================================================
-- LiveWell XP — Consolidated DDL (reflected from db/migrations 000001–000004)
-- Engine: PostgreSQL (sqlc). Generated for ERD visualization.
-- Tables are declared in dependency order so inline FK REFERENCES resolve.
-- Note: gen_random_uuid() requires PostgreSQL 13+ (or the pgcrypto extension).
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- CORE: Organizations, Users, Auth
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_is_active ON organizations(is_active) WHERE is_active = true;


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),

    -- Auth fields
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    user_type VARCHAR(20) NOT NULL DEFAULT 'member',   -- admin, hr, member
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Password reset
    password_reset_token VARCHAR(10),
    password_reset_expires_at TIMESTAMPTZ,

    -- Profile (shared)
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,

    -- Member-specific fields (nullable for admin/HR users)
    employee_id VARCHAR(100),
    department VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20),
    weight_kg NUMERIC(5,2),

    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;


CREATE TABLE auth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,             -- e.g. google, apple, microsoft
    provider_user_id VARCHAR(255) NOT NULL,    -- the sub/ID from the OAuth provider
    provider_email VARCHAR(255),
    provider_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_auth_providers_user_id ON auth_providers(user_id);


CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(64) NOT NULL UNIQUE,  -- random 64-char hex string, not a JWT
    device_info TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);


-- ════════════════════════════════════════════════════════════════════════════
-- CHALLENGES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    banner_url TEXT,
    invitation_code VARCHAR(6) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, upcoming, ongoing, completed, archived
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_challenges_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_challenges_organization_id ON challenges(organization_id);
CREATE INDEX idx_challenges_invitation_code ON challenges(invitation_code);
CREATE INDEX idx_challenges_status ON challenges(status);


CREATE TABLE challenge_whitelists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_registered BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(challenge_id, email)
);

CREATE INDEX idx_challenge_whitelists_challenge_id ON challenge_whitelists(challenge_id);


CREATE TABLE challenge_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,   -- e.g. description, rules, how_to_join, terms_and_conditions
    content TEXT NOT NULL,          -- raw HTML
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(challenge_id, section)
);

CREATE INDEX idx_challenge_info_challenge_id ON challenge_info(challenge_id);


CREATE TABLE challenge_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL,    -- individual or team
    rank SMALLINT NOT NULL,        -- 1 = 1st place, 2 = 2nd place, etc.
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(challenge_id, scope, rank)
);

CREATE INDEX idx_challenge_prizes_challenge_id ON challenge_prizes(challenge_id);


-- ════════════════════════════════════════════════════════════════════════════
-- ENROLLMENTS, PROGRAMS, TEAMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, withdrawn, disqualified

    -- Cached totals (updated by service layer after each activity)
    total_distance_meters NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 0,
    total_activities INTEGER NOT NULL DEFAULT 0,

    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_enrollments_challenge_id ON enrollments(challenge_id);
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_status ON enrollments(status) WHERE status = 'active';


CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL,   -- running, walking, cycling
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Activity validation config
    max_activities_per_day SMALLINT NOT NULL DEFAULT 3,
    max_distance_per_activity_meters NUMERIC(10,2),
    min_distance_per_activity_meters NUMERIC(10,2) DEFAULT 0,
    min_pace_per_km_minutes NUMERIC(8,2),
    max_pace_per_km_minutes NUMERIC(8,2),
    max_backdate_days SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_programs_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_programs_challenge_id ON programs(challenge_id);
CREATE INDEX idx_programs_type ON programs(type);


CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(challenge_id, name)
);

CREATE INDEX idx_teams_challenge_id ON teams(challenge_id);


CREATE TABLE team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(enrollment_id)   -- one enrollment = one team
);

CREATE INDEX idx_team_assignments_team_id ON team_assignments(team_id);


-- ════════════════════════════════════════════════════════════════════════════
-- ACTIVITIES (GPS-tracked sessions)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key UUID NOT NULL UNIQUE,   -- client-generated, dedupes retries

    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    program_id UUID NOT NULL REFERENCES programs(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Core activity data (from Flutter payload)
    activity_type VARCHAR(20) NOT NULL,   -- running, walking, cycling
    started_at TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL,
    distance_meters NUMERIC(10,2) NOT NULL,
    elevation_gain_meters NUMERIC(8,2) NOT NULL,
    steps INTEGER NOT NULL,
    avg_heart_rate SMALLINT,
    calories NUMERIC(8,2),

    -- Computed pace (generated column): minutes per km
    pace_per_km NUMERIC(8,2) GENERATED ALWAYS AS (
        CASE WHEN distance_meters > 0
            THEN (duration_seconds / 60.0) / (distance_meters / 1000.0)
            ELSE NULL
        END
    ) STORED,

    -- GPS & splits (JSONB)
    path_data JSONB NOT NULL,     -- [{lat, lng, ele}, ...]
    splits_data JSONB NOT NULL,   -- [{km, seconds}, ...]

    is_flagged BOOLEAN NOT NULL DEFAULT false,
    is_valid BOOLEAN NOT NULL DEFAULT true,

    -- Device metadata
    device_info TEXT,
    app_version VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_enrollment_id ON activities(enrollment_id);
CREATE INDEX idx_activities_program_id ON activities(program_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_started_at ON activities(started_at);
CREATE INDEX idx_activities_is_valid ON activities(is_valid) WHERE is_valid = true;
CREATE INDEX idx_activities_is_flagged ON activities(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_activities_user_started_valid ON activities(user_id, started_at DESC) WHERE is_valid = true;


-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL,   -- all, team (target_id = team_id), personal (target_id = user_id)
    target_id UUID,               -- NULL when scope = all
    title VARCHAR(255) NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_challenge_id ON notifications(challenge_id);
CREATE INDEX idx_notifications_scope ON notifications(scope);
CREATE INDEX idx_notifications_target_id ON notifications(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);


CREATE TABLE notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user_id ON notification_reads(user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- LEADERBOARD CACHES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE program_user_activity_stats (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    program_id        UUID NOT NULL REFERENCES programs(id)    ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    enrollment_id     UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,

    distance_meters   NUMERIC(12,2) NOT NULL DEFAULT 0,
    duration_seconds  INTEGER       NOT NULL DEFAULT 0,
    steps             INTEGER       NOT NULL DEFAULT 0,
    activity_count    INTEGER       NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (program_id, user_id)
);

CREATE INDEX idx_program_user_activity_stats_rank
    ON program_user_activity_stats(program_id, distance_meters DESC, created_at ASC);


CREATE TABLE program_team_activity_stats (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    program_id        UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    team_id           UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,

    distance_meters   NUMERIC(12,2) NOT NULL DEFAULT 0,
    duration_seconds  INTEGER       NOT NULL DEFAULT 0,
    steps             INTEGER       NOT NULL DEFAULT 0,
    activity_count    INTEGER       NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (program_id, team_id)
);

CREATE INDEX idx_program_team_activity_stats_rank
    ON program_team_activity_stats(program_id, distance_meters DESC, created_at ASC);


-- ════════════════════════════════════════════════════════════════════════════
-- REWARDS: Master data + wallet
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_is_active ON partners(is_active) WHERE is_active = true;


CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    type_label VARCHAR(30),   -- display grouping only (percentage / fixed / free_upsize)

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vouchers_challenge_id ON vouchers(challenge_id);
CREATE INDEX idx_vouchers_partner_id   ON vouchers(partner_id);
CREATE INDEX idx_vouchers_is_active    ON vouchers(challenge_id) WHERE is_active = true;


CREATE TABLE voucher_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,

    code VARCHAR(100) NOT NULL,

    valid_from DATE,
    valid_until DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'available',  -- available = stock; claimed = wallet item
    claimed_by_user_id UUID REFERENCES users(id),
    claimed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (voucher_id, code),
    CONSTRAINT chk_voucher_codes_status CHECK (status IN ('available', 'claimed'))
);

CREATE INDEX idx_voucher_codes_available ON voucher_codes(voucher_id) WHERE status = 'available';


-- ════════════════════════════════════════════════════════════════════════════
-- REWARDS: Milestones
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    period VARCHAR(10) NOT NULL,        -- daily, weekly, monthly
    target_type VARCHAR(20) NOT NULL,   -- distance (only, for now)
    target_value NUMERIC(10,2) NOT NULL,-- standard unit per target_type (meters for distance)

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_milestones_period       CHECK (period IN ('daily', 'weekly', 'monthly')),
    CONSTRAINT chk_milestones_target_type  CHECK (target_type IN ('distance')),
    CONSTRAINT chk_milestones_target_value CHECK (target_value > 0),
    CONSTRAINT chk_milestones_dates        CHECK (end_date >= start_date)
);

CREATE INDEX idx_milestones_program_id    ON milestones(program_id);
CREATE INDEX idx_milestones_active_window ON milestones(program_id, period, start_date, end_date) WHERE is_active = true;


CREATE TABLE user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),

    current_value NUMERIC(10,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (milestone_id, user_id),
    CONSTRAINT chk_user_milestones_value CHECK (current_value >= 0)
);

CREATE INDEX idx_user_milestones_user_id ON user_milestones(user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- REWARDS: Reward flow (points ledger + milestone↔voucher link)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    milestone_id UUID NOT NULL REFERENCES milestones(id),

    status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open = unspent; used = spent on a voucher
    used_at TIMESTAMPTZ,
    spent_on_voucher_id UUID REFERENCES vouchers(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_user_points_status CHECK (status IN ('open', 'used'))
);

CREATE INDEX idx_user_points_open         ON user_points(user_id) WHERE status = 'open';
CREATE INDEX idx_user_points_milestone_id ON user_points(milestone_id);


CREATE TABLE milestone_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,

    quota INT,                          -- max total claims across all users; NULL = no cap
    user_limit INT NOT NULL DEFAULT 1,  -- max claims by one user; NULL = no per-user cap

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (milestone_id, voucher_id),
    CONSTRAINT chk_milestone_vouchers_quota      CHECK (quota IS NULL OR quota > 0),
    CONSTRAINT chk_milestone_vouchers_user_limit CHECK (user_limit IS NULL OR user_limit > 0)
);

CREATE INDEX idx_milestone_vouchers_milestone_id ON milestone_vouchers(milestone_id);
CREATE INDEX idx_milestone_vouchers_voucher_id   ON milestone_vouchers(voucher_id);
