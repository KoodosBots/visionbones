-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    selected_platform TEXT,
    platform_username TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expiry TIMESTAMP WITH TIME ZONE,
    social_links JSONB DEFAULT '{}',
    verified_badge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platforms table
CREATE TABLE platforms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    icon_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stats table
CREATE TABLE stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wins INTEGER DEFAULT 0 CHECK (wins >= 0),
    losses INTEGER DEFAULT 0 CHECK (losses >= 0),
    win_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN (wins + losses) = 0 THEN 0
            ELSE ROUND(wins::DECIMAL / (wins + losses), 4)
        END
    ) STORED,
    games_played INTEGER GENERATED ALWAYS AS (wins + losses) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    platform TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed')),
    UNIQUE(user_id, platform)
);

-- Create bible_verses table for the Bible feature
CREATE TABLE bible_verses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL,
    version TEXT DEFAULT 'NIV',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(book, chapter, verse, version)
);

-- Create reading_plans table
CREATE TABLE reading_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reading_plan_days table
CREATE TABLE reading_plan_days (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reading_plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    reading_reference TEXT NOT NULL, -- e.g., "Genesis 1:1-31"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reading_plan_id, day_number)
);

-- Create user_reading_progress table
CREATE TABLE user_reading_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reading_plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
    current_day INTEGER DEFAULT 1,
    completed_days INTEGER[] DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reading_plan_id)
);

-- Create admin_actions table for audit logging
CREATE TABLE admin_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES users(id),
    action_type TEXT NOT NULL, -- 'stats_update', 'user_verification', etc.
    target_user_id UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_stats_user_id ON stats(user_id);
CREATE INDEX idx_stats_platform ON stats(platform);
CREATE INDEX idx_stats_verification_status ON stats(verification_status);
CREATE INDEX idx_stats_win_rate ON stats(win_rate DESC);
CREATE INDEX idx_stats_games_played ON stats(games_played DESC);
CREATE INDEX idx_user_reading_progress_user_id ON user_reading_progress(user_id);
CREATE INDEX idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target_user_id ON admin_actions(target_user_id);

-- Insert some default platforms
INSERT INTO platforms (name, description, is_active) VALUES
('Domino! by Flyclops', 'Popular mobile domino game', TRUE),
('Microsoft Dominoes', 'Classic Windows domino game', TRUE),
('Dominoes Live', 'Online multiplayer dominoes', TRUE);

-- Insert a sample reading plan
INSERT INTO reading_plans (name, description, duration_days, is_active) VALUES
('30-Day Bible Reading Plan', 'A month-long journey through key Bible passages', 30, TRUE);

-- Add some sample reading plan days
INSERT INTO reading_plan_days (reading_plan_id, day_number, reading_reference) 
SELECT 
    (SELECT id FROM reading_plans WHERE name = '30-Day Bible Reading Plan'),
    generate_series(1, 30),
    'Genesis ' || generate_series(1, 30) || ':1-31';

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = telegram_id);

-- Users can update their own data (except premium fields)
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = telegram_id);

-- Everyone can read public user data for leaderboards
CREATE POLICY "Public user data readable" ON users
    FOR SELECT USING (TRUE);

-- Stats are readable by everyone (for leaderboards)
CREATE POLICY "Stats readable by all" ON stats
    FOR SELECT USING (TRUE);

-- Only admins can insert/update stats
CREATE POLICY "Only admins can modify stats" ON stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.telegram_id = auth.uid()::text 
            AND users.telegram_id = ANY(string_to_array(current_setting('app.admin_telegram_ids', TRUE), ','))
        )
    );

-- Platforms are readable by everyone
CREATE POLICY "Platforms readable by all" ON platforms
    FOR SELECT USING (TRUE);

-- Bible content is readable by everyone
CREATE POLICY "Bible verses readable by all" ON bible_verses
    FOR SELECT USING (TRUE);

CREATE POLICY "Reading plans readable by all" ON reading_plans
    FOR SELECT USING (TRUE);

CREATE POLICY "Reading plan days readable by all" ON reading_plan_days
    FOR SELECT USING (TRUE);

-- Users can manage their own reading progress
CREATE POLICY "Users can manage own reading progress" ON user_reading_progress
    FOR ALL USING (auth.uid()::text = (SELECT telegram_id FROM users WHERE id = user_id));

-- Admin actions are only accessible to admins
CREATE POLICY "Admin actions only for admins" ON admin_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.telegram_id = auth.uid()::text 
            AND users.telegram_id = ANY(string_to_array(current_setting('app.admin_telegram_ids', TRUE), ','))
        )
    );

-- Create a function to update the last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_active
CREATE TRIGGER update_users_last_active
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- Create a function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO admin_actions (admin_user_id, action_type, target_user_id, details)
        VALUES (
            (SELECT id FROM users WHERE telegram_id = auth.uid()::text),
            TG_TABLE_NAME || '_' || lower(TG_OP),
            NEW.user_id,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stats changes
CREATE TRIGGER log_stats_changes
    AFTER INSERT OR UPDATE ON stats
    FOR EACH ROW
    EXECUTE FUNCTION log_admin_action();