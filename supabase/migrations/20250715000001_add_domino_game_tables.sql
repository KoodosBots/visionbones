-- Add domino game core functionality tables
-- This migration adds the missing tables for stats tracking and platforms

-- Create platforms table for supported domino games
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    icon_url TEXT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create stats table for tracking user game statistics
CREATE TABLE stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER GENERATED ALWAYS AS (wins + losses) STORED,
    win_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN (wins + losses) = 0 THEN 0 
            ELSE ROUND(wins::decimal / (wins + losses), 4)
        END
    ) STORED,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES users(id), -- Admin who last updated stats
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed')),
    verification_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one stat record per user per platform
    UNIQUE(user_id, platform_id)
);

-- Create admin_users table for managing admin access
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    granted_by UUID NULL REFERENCES admin_users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '{"verify_stats": true, "manage_users": false, "manage_admins": false}',
    
    UNIQUE(user_id),
    UNIQUE(telegram_id)
);

-- Create bible_verses table for daily verses
CREATE TABLE bible_verses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference TEXT NOT NULL, -- e.g., "John 3:16"
    text TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'NIV',
    category TEXT NULL, -- e.g., "encouragement", "wisdom", "strength"
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reading_plans table for Bible reading plans
CREATE TABLE reading_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    total_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reading_plan_days table for daily readings in plans
CREATE TABLE reading_plan_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    scripture_references TEXT[] NOT NULL, -- Array of scripture references
    reflection TEXT NULL,
    
    UNIQUE(plan_id, day_number)
);

-- Create user_reading_progress table to track user progress in reading plans
CREATE TABLE user_reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
    current_day INTEGER NOT NULL DEFAULT 1,
    completed_days INTEGER[] NOT NULL DEFAULT '{}', -- Array of completed day numbers
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    
    UNIQUE(user_id, plan_id)
);

-- Create indexes for performance
CREATE INDEX idx_platforms_name ON platforms(name);
CREATE INDEX idx_platforms_is_active ON platforms(is_active);

CREATE INDEX idx_stats_user_id ON stats(user_id);
CREATE INDEX idx_stats_platform_id ON stats(platform_id);
CREATE INDEX idx_stats_verification_status ON stats(verification_status);
CREATE INDEX idx_stats_win_rate ON stats(win_rate DESC);
CREATE INDEX idx_stats_games_played ON stats(games_played DESC);
CREATE INDEX idx_stats_wins ON stats(wins DESC);
CREATE INDEX idx_stats_updated_by ON stats(updated_by);

CREATE INDEX idx_admin_users_telegram_id ON admin_users(telegram_id);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX idx_admin_users_role ON admin_users(role);

CREATE INDEX idx_bible_verses_category ON bible_verses(category);
CREATE INDEX idx_bible_verses_is_active ON bible_verses(is_active);

CREATE INDEX idx_reading_plans_is_active ON reading_plans(is_active);

CREATE INDEX idx_reading_plan_days_plan_id ON reading_plan_days(plan_id);
CREATE INDEX idx_reading_plan_days_day_number ON reading_plan_days(day_number);

CREATE INDEX idx_user_reading_progress_user_id ON user_reading_progress(user_id);
CREATE INDEX idx_user_reading_progress_plan_id ON user_reading_progress(plan_id);
CREATE INDEX idx_user_reading_progress_is_completed ON user_reading_progress(is_completed);

-- Add update triggers for new tables
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stats_updated_at BEFORE UPDATE ON stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platforms (public read access)
CREATE POLICY "Anyone can view active platforms" ON platforms
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only service role can modify platforms" ON platforms
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for stats (public read for leaderboards, user can see own)
CREATE POLICY "Anyone can view verified stats" ON stats
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Users can view own stats" ON stats
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE telegram_id = current_setting('app.current_user_telegram_id', true)
        )
    );

CREATE POLICY "Only service role can modify stats" ON stats
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for admin_users (only service role and self access)
CREATE POLICY "Admins can view active admin list" ON admin_users
    FOR SELECT USING (
        is_active = true AND (
            current_setting('role') = 'service_role' OR
            telegram_id = current_setting('app.current_user_telegram_id', true)
        )
    );

CREATE POLICY "Only service role can modify admins" ON admin_users
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for bible_verses (public read access)
CREATE POLICY "Anyone can view active bible verses" ON bible_verses
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only service role can modify bible verses" ON bible_verses
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for reading_plans (public read access)
CREATE POLICY "Anyone can view active reading plans" ON reading_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only service role can modify reading plans" ON reading_plans
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for reading_plan_days (public read access)
CREATE POLICY "Anyone can view reading plan days" ON reading_plan_days
    FOR SELECT USING (
        plan_id IN (SELECT id FROM reading_plans WHERE is_active = true)
    );

CREATE POLICY "Only service role can modify reading plan days" ON reading_plan_days
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for user_reading_progress (users can see and modify own progress)
CREATE POLICY "Users can view own reading progress" ON user_reading_progress
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE telegram_id = current_setting('app.current_user_telegram_id', true)
        )
    );

CREATE POLICY "Users can modify own reading progress" ON user_reading_progress
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users 
            WHERE telegram_id = current_setting('app.current_user_telegram_id', true)
        )
    );

CREATE POLICY "Service role can do everything on reading progress" ON user_reading_progress
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create views for leaderboards
CREATE VIEW leaderboard_overall AS
SELECT 
    u.username,
    u.platform_username,
    u.selected_platform,
    u.is_premium,
    u.verified_badge,
    u.social_links,
    s.wins,
    s.losses,
    s.games_played,
    s.win_rate,
    s.last_updated,
    ROW_NUMBER() OVER (ORDER BY s.win_rate DESC, s.wins DESC, s.games_played DESC) as rank
FROM users u
JOIN stats s ON u.id = s.user_id
WHERE s.verification_status = 'verified'
    AND s.games_played > 0
ORDER BY s.win_rate DESC, s.wins DESC, s.games_played DESC;

CREATE VIEW leaderboard_by_platform AS
SELECT 
    u.username,
    u.platform_username,
    u.selected_platform,
    u.is_premium,
    u.verified_badge,
    u.social_links,
    s.wins,
    s.losses,
    s.games_played,
    s.win_rate,
    s.last_updated,
    p.display_name as platform_display_name,
    ROW_NUMBER() OVER (
        PARTITION BY s.platform_id 
        ORDER BY s.win_rate DESC, s.wins DESC, s.games_played DESC
    ) as platform_rank
FROM users u
JOIN stats s ON u.id = s.user_id
JOIN platforms p ON s.platform_id = p.id
WHERE s.verification_status = 'verified'
    AND s.games_played > 0
    AND p.is_active = true
ORDER BY p.display_name, s.win_rate DESC, s.wins DESC, s.games_played DESC;

-- Grant permissions on views
GRANT SELECT ON leaderboard_overall TO authenticated, anon;
GRANT SELECT ON leaderboard_by_platform TO authenticated, anon;

-- Insert default platforms
INSERT INTO platforms (name, display_name, description) VALUES
('domino-flyclops', 'Domino! by Flyclops', 'Popular domino game app by Flyclops on mobile devices'),
('microsoft-dominoes', 'Microsoft Dominoes', 'Classic dominoes game by Microsoft'),
('domino-qiu-qiu', 'Domino QiuQiu', 'Indonesian-style domino game'),
('other', 'Other Platform', 'Other domino gaming platforms');

-- Insert sample Bible verses
INSERT INTO bible_verses (reference, text, category) VALUES
('Philippians 4:13', 'I can do all this through him who gives me strength.', 'strength'),
('Jeremiah 29:11', 'For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, to give you hope and a future.', 'encouragement'),
('Proverbs 3:5-6', 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', 'wisdom'),
('Romans 8:28', 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', 'encouragement'),
('Psalm 23:1', 'The Lord is my shepherd, I lack nothing.', 'comfort'),
('Joshua 1:9', 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.', 'courage'),
('Matthew 11:28', 'Come to me, all you who are weary and burdened, and I will give you rest.', 'comfort'),
('Isaiah 40:31', 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', 'strength');

-- Insert a sample reading plan
INSERT INTO reading_plans (name, description, total_days) VALUES
('Daily Encouragement', 'A 7-day reading plan focused on encouragement and hope', 7);

-- Get the plan ID for inserting days
DO $$
DECLARE
    plan_uuid UUID;
BEGIN
    SELECT id INTO plan_uuid FROM reading_plans WHERE name = 'Daily Encouragement';
    
    INSERT INTO reading_plan_days (plan_id, day_number, title, scripture_references, reflection) VALUES
    (plan_uuid, 1, 'God''s Love', ARRAY['John 3:16', 'Romans 8:38-39'], 'Reflect on the depth of God''s unconditional love for you.'),
    (plan_uuid, 2, 'Hope in Trials', ARRAY['Romans 5:3-5', 'James 1:2-4'], 'Consider how trials can build character and hope.'),
    (plan_uuid, 3, 'Divine Strength', ARRAY['Philippians 4:13', 'Isaiah 40:31'], 'Think about how God provides strength in weakness.'),
    (plan_uuid, 4, 'Perfect Peace', ARRAY['Isaiah 26:3', 'John 14:27'], 'Meditate on the peace that comes from trusting God.'),
    (plan_uuid, 5, 'Future Hope', ARRAY['Jeremiah 29:11', 'Romans 8:28'], 'Consider God''s good plans for your future.'),
    (plan_uuid, 6, 'Daily Provision', ARRAY['Matthew 6:26', 'Philippians 4:19'], 'Reflect on how God provides for your daily needs.'),
    (plan_uuid, 7, 'Eternal Perspective', ARRAY['2 Corinthians 4:16-18', '1 Peter 1:3-4'], 'Focus on the eternal hope we have in Christ.');
END $$;

-- Add constraints for data integrity
ALTER TABLE stats ADD CONSTRAINT stats_wins_non_negative CHECK (wins >= 0);
ALTER TABLE stats ADD CONSTRAINT stats_losses_non_negative CHECK (losses >= 0);

ALTER TABLE reading_plan_days ADD CONSTRAINT reading_plan_days_day_number_positive CHECK (day_number > 0);
ALTER TABLE user_reading_progress ADD CONSTRAINT user_reading_progress_current_day_positive CHECK (current_day > 0);

-- Comments for documentation
COMMENT ON TABLE platforms IS 'Supported domino gaming platforms';
COMMENT ON TABLE stats IS 'User game statistics per platform with admin verification';
COMMENT ON TABLE admin_users IS 'Admin users with permissions to verify stats and manage the system';
COMMENT ON TABLE bible_verses IS 'Collection of Bible verses for daily inspiration';
COMMENT ON TABLE reading_plans IS 'Bible reading plans with multiple days';
COMMENT ON TABLE reading_plan_days IS 'Individual days within reading plans';
COMMENT ON TABLE user_reading_progress IS 'User progress tracking for reading plans';

COMMENT ON COLUMN stats.verification_status IS 'Status of stat verification by admin (pending, verified, disputed)';
COMMENT ON COLUMN stats.win_rate IS 'Automatically calculated win percentage (wins / total games)';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object defining what actions this admin can perform';