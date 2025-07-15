--
-- VisionBones Initial Schema Migration
-- Converts Convex schema to PostgreSQL
--
-- CONVERSION NOTES:
-- - Convex v.id("table") → PostgreSQL UUID with foreign keys
-- - Convex v.number() timestamps → PostgreSQL timestamp with time zone
-- - Convex v.optional() → PostgreSQL nullable columns
-- - Convex indexes → PostgreSQL indexes and constraints
-- - Convex v.object() → PostgreSQL JSONB
--

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (converted from Convex users schema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    selected_platform TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    premium_expiry TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    social_links JSONB, -- Converted from Convex v.object()
    verified_badge BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for users table (converted from Convex indexes)
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_last_active ON users(last_active);

-- Subscriptions table (converted from Convex subscriptions schema)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for subscriptions table (converted from Convex indexes)
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Webhook events table (converted from Convex webhookEvents schema)
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for webhook_events table (converted from Convex indexes)
CREATE INDEX idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

-- Add constraints for data integrity
ALTER TABLE users ADD CONSTRAINT check_premium_expiry 
    CHECK (NOT is_premium OR premium_expiry IS NOT NULL OR stripe_subscription_id IS NOT NULL);

ALTER TABLE subscriptions ADD CONSTRAINT check_subscription_status
    CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'));

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies for multi-tenant security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (auth.uid()::text = telegram_id);

-- Subscriptions inherit user access
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth.uid()::text = telegram_id
        )
    );

-- Webhook events are only accessible to service role
CREATE POLICY "Service role access to webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with Telegram integration and premium status';
COMMENT ON TABLE subscriptions IS 'Stripe subscription records linked to users';
COMMENT ON TABLE webhook_events IS 'Stripe webhook event log for deduplication and debugging';

COMMENT ON COLUMN users.telegram_id IS 'Unique Telegram user ID (string format)';
COMMENT ON COLUMN users.social_links IS 'JSON object containing social media links (premium feature)';
COMMENT ON COLUMN users.premium_expiry IS 'When premium access expires (null for lifetime premium)';

COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for API calls';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of current billing period (premium expiry)';

COMMENT ON COLUMN webhook_events.stripe_event_id IS 'Stripe event ID for deduplication';
COMMENT ON COLUMN webhook_events.processed IS 'Whether the webhook has been successfully processed';

--
-- MIGRATION VALIDATION
--

-- Verify table structure
DO $$
BEGIN
    -- Check that all expected tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'users table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        RAISE EXCEPTION 'subscriptions table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_events') THEN
        RAISE EXCEPTION 'webhook_events table not created';
    END IF;
    
    -- Check that indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_telegram_id') THEN
        RAISE EXCEPTION 'users telegram_id index not created';
    END IF;
    
    RAISE NOTICE 'Migration validation passed';
END
$$;