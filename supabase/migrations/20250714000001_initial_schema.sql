-- Initial schema migration for VisionBones
-- Converted from Convex schema to PostgreSQL

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    selected_platform TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    premium_expiry TIMESTAMPTZ NULL,
    stripe_customer_id TEXT NULL,
    stripe_subscription_id TEXT NULL,
    social_links JSONB NULL DEFAULT '{}', -- JSON object for social links
    verified_badge BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create webhook_events table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ NULL,
    error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
-- Users table indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_is_premium ON users(is_premium);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active ON users(last_active);

-- Subscriptions table indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- Webhook events table indexes
CREATE INDEX idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (telegram_id = current_setting('app.current_user_telegram_id', true));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (telegram_id = current_setting('app.current_user_telegram_id', true));

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role can do everything on users" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for subscriptions table
-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE telegram_id = current_setting('app.current_user_telegram_id', true)
        )
    );

-- Service role can do everything on subscriptions
CREATE POLICY "Service role can do everything on subscriptions" ON subscriptions
    FOR ALL USING (current_setting('role') = 'service_role');

-- RLS Policies for webhook_events table
-- Only service role can access webhook events (admin/system only)
CREATE POLICY "Only service role can access webhook events" ON webhook_events
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create a view for public user profiles (for leaderboards)
CREATE VIEW public_user_profiles AS
SELECT 
    id,
    username,
    selected_platform,
    platform_username,
    is_premium,
    social_links,
    verified_badge,
    created_at
FROM users
WHERE telegram_id IS NOT NULL; -- Only include valid users

-- Grant permissions for the public view
GRANT SELECT ON public_user_profiles TO authenticated, anon;

-- Add some useful constraints
ALTER TABLE users ADD CONSTRAINT users_telegram_id_not_empty CHECK (length(telegram_id) > 0);
ALTER TABLE users ADD CONSTRAINT users_username_not_empty CHECK (length(username) > 0);
ALTER TABLE users ADD CONSTRAINT users_platform_username_not_empty CHECK (length(platform_username) > 0);

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_valid 
    CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'));

ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_stripe_event_id_not_empty 
    CHECK (length(stripe_event_id) > 0);
ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_event_type_not_empty 
    CHECK (length(event_type) > 0);

-- Create a function to get user by telegram_id (helper for RLS and queries)
CREATE OR REPLACE FUNCTION get_user_by_telegram_id(telegram_id_param TEXT)
RETURNS TABLE(
    id UUID,
    telegram_id TEXT,
    username TEXT,
    selected_platform TEXT,
    platform_username TEXT,
    is_premium BOOLEAN,
    premium_expiry TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    social_links JSONB,
    verified_badge BOOLEAN,
    created_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.telegram_id,
        u.username,
        u.selected_platform,
        u.platform_username,
        u.is_premium,
        u.premium_expiry,
        u.stripe_customer_id,
        u.stripe_subscription_id,
        u.social_links,
        u.verified_badge,
        u.created_at,
        u.last_active,
        u.updated_at
    FROM users u
    WHERE u.telegram_id = telegram_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update user's last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active(telegram_id_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_active = NOW()
    WHERE telegram_id = telegram_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE users IS 'Main users table storing Telegram user information and platform details';
COMMENT ON TABLE subscriptions IS 'Stripe subscription tracking for premium features';
COMMENT ON TABLE webhook_events IS 'Log of Stripe webhook events for debugging and ensuring idempotency';

COMMENT ON COLUMN users.telegram_id IS 'Unique Telegram user ID as string';
COMMENT ON COLUMN users.social_links IS 'JSON object containing social media links (twitter, instagram, tiktok)';
COMMENT ON COLUMN users.premium_expiry IS 'When premium subscription expires (NULL for non-premium or active subscriptions)';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status (active, canceled, etc.)';
COMMENT ON COLUMN webhook_events.processed IS 'Whether this webhook event has been successfully processed';