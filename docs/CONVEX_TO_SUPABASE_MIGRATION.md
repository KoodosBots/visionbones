# Convex to Supabase Migration Guide

## Overview

This document outlines the complete migration strategy for converting VisionBones from Convex to Supabase. The migration preserves all functionality while adapting to Supabase's architecture patterns.

## Migration Philosophy

### Core Principles
1. **Preserve Business Logic**: All premium validation, subscription handling, and user management logic is maintained
2. **Minimize Client Changes**: Where possible, client code changes should be minimal
3. **Maintain Data Integrity**: All constraints and relationships are preserved
4. **Security First**: Row Level Security (RLS) policies replace Convex's built-in security

### Conversion Patterns

| Convex Pattern | Supabase Equivalent | Use Case |
|---------------|-------------------|----------|
| `query` (simple read) | Direct client call | Basic data fetching |
| `query` (complex logic) | Edge Function | Business logic, calculations |
| `mutation` (simple write) | Direct client call | Basic data operations |
| `mutation` (complex logic) | Edge Function | Validation, external APIs |
| `internalQuery` | Edge Function | Server-side operations |
| `internalMutation` | Edge Function | Webhooks, admin operations |
| `httpAction` | Edge Function | HTTP endpoints, webhooks |

## Directory Structure

```
supabase/
├── functions/
│   ├── user-management/         # User CRUD operations
│   ├── premium-management/      # Premium status and features
│   ├── subscription-management/ # Stripe subscription handling
│   ├── webhook-handlers/        # Stripe webhook endpoints
│   ├── checkout/               # Stripe checkout sessions
│   └── shared/                 # Common utilities
├── migrations/
│   └── 20240101000001_initial_schema.sql
└── CONVEX_TO_SUPABASE_MIGRATION.md
```

## Function-by-Function Conversion

### User Management (`users.ts`)

| Original Function | Conversion Strategy | New Location |
|------------------|-------------------|--------------|
| `createOrUpdateUser` | Edge Function (needs validation) | `/user-management/create-or-update` |
| `getUserByTelegramId` | Direct client call or Edge Function | `/user-management/by-telegram-id` |
| `updateSocialLinks` | Edge Function (premium validation) | `/user-management/social-links` |
| `getUserByStripeCustomerId` | Edge Function (internal use) | `/user-management/by-stripe-customer` |
| `updatePremiumStatus` | Edge Function (internal use) | `/user-management/premium-status` |

**Client Migration Example:**
```typescript
// Before (Convex)
const user = useQuery(api.users.getUserByTelegramId, { telegramId })

// After (Supabase) - Direct client call
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('telegram_id', telegramId)
  .single()

// For complex operations, use Edge Function
const response = await fetch('/functions/v1/user-management/create-or-update', {
  method: 'POST',
  body: JSON.stringify({ telegramId, username, selectedPlatform, platformUsername })
})
```

### Premium Management (`premium.ts`)

| Original Function | Conversion Strategy | New Location |
|------------------|-------------------|--------------|
| `isPremiumUser` | Edge Function (can be client call) | `/premium-management/is-premium` |
| `getPremiumFeatures` | Edge Function (business logic) | `/premium-management/features` |
| `validatePremiumFeature` | Edge Function (validation logic) | `/premium-management/validate-feature` |
| `getPremiumStatus` | Edge Function (complex query) | `/premium-management/status` |

**Client Migration Example:**
```typescript
// Before (Convex)
const isPremium = useQuery(api.premium.isPremiumUser, { userId })

// After (Supabase) - Direct client call for simple check
const { data } = await supabase
  .from('users')
  .select('is_premium, premium_expiry')
  .eq('id', userId)
  .single()

const isPremium = data.is_premium && (!data.premium_expiry || new Date(data.premium_expiry) > new Date())

// For feature validation, use Edge Function
const response = await fetch(`/functions/v1/premium-management/validate-feature?userId=${userId}&feature=socialLinks`)
```

### Subscription Management (`subscriptions.ts`)

| Original Function | Conversion Strategy | New Location |
|------------------|-------------------|--------------|
| `handleSubscriptionUpdate` | Edge Function (Stripe webhooks) | `/subscription-management/handle-subscription-update` |
| `handleSubscriptionDeleted` | Edge Function (Stripe webhooks) | `/subscription-management/handle-subscription-deleted` |
| `handlePaymentSucceeded` | Edge Function (Stripe webhooks) | `/subscription-management/handle-payment-succeeded` |
| `handlePaymentFailed` | Edge Function (Stripe webhooks) | `/subscription-management/handle-payment-failed` |
| `getUserSubscription` | Direct client call or Edge Function | `/subscription-management/user-subscription` |
| `cancelSubscription` | Edge Function (Stripe API) | `/subscription-management/cancel-subscription` |

### Checkout Management (`checkout.ts`)

| Original Function | Conversion Strategy | New Location |
|------------------|-------------------|--------------|
| `createCheckoutSession` | Edge Function (Stripe API) | `/checkout/create-session` |
| `createPortalSession` | Edge Function (Stripe API) | `/checkout/create-portal` |

### Webhook Handling (`http.ts`, `stripe.ts`, `webhooks.ts`)

| Original Function | Conversion Strategy | New Location |
|------------------|-------------------|--------------|
| Stripe webhook handler | Edge Function (HTTP endpoint) | `/webhook-handlers/stripe` |
| `getWebhookEvent` | Database query in Edge Function | `/webhook-handlers/event` |
| `logWebhookEvent` | Database insert in Edge Function | `/webhook-handlers/log-event` |
| `markEventProcessed` | Database update in Edge Function | `/webhook-handlers/mark-processed` |
| `logWebhookError` | Database update in Edge Function | `/webhook-handlers/log-error` |

## Database Schema Migration

### Key Conversions

| Convex Schema | PostgreSQL Schema | Notes |
|--------------|------------------|-------|
| `v.id("users")` | `UUID REFERENCES users(id)` | Foreign key relationships |
| `v.number()` (timestamp) | `TIMESTAMP WITH TIME ZONE` | Proper date handling |
| `v.optional()` | Nullable columns | Optional fields |
| `v.object()` | `JSONB` | JSON data with indexing |
| `.index()` | `CREATE INDEX` | Database indexes |

### Schema Features
- **UUID Primary Keys**: More secure than auto-incrementing integers
- **Foreign Key Constraints**: Enforce referential integrity
- **Check Constraints**: Data validation at database level
- **Triggers**: Automatic timestamp updates
- **Row Level Security**: Multi-tenant security policies

## Security Migration

### Convex Security → Supabase RLS

```sql
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
```

## Client-Side Migration Patterns

### 1. Simple Queries (Direct Migration)
```typescript
// Replace useQuery with direct Supabase calls
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('telegram_id', telegramId)
  .single()
```

### 2. Complex Operations (Edge Functions)
```typescript
// Replace useMutation with fetch to Edge Functions
const response = await fetch('/functions/v1/user-management/create-or-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

### 3. Real-time Updates (Supabase Subscriptions)
```typescript
// Replace Convex real-time with Supabase subscriptions
const subscription = supabase
  .channel('users')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'users' },
    (payload) => {
      // Handle real-time updates
    }
  )
  .subscribe()
```

## Environment Variables

### Required Variables
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (same as Convex)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment Configuration

### Edge Functions Deployment
```bash
# Deploy all functions
supabase functions deploy user-management
supabase functions deploy premium-management
supabase functions deploy subscription-management
supabase functions deploy webhook-handlers
supabase functions deploy checkout
```

### Stripe Webhook Configuration
Update Stripe webhook endpoint to:
```
https://your-project.supabase.co/functions/v1/webhook-handlers/stripe
```

## Migration Checklist

### Pre-Migration
- [ ] Set up Supabase project
- [ ] Configure environment variables
- [ ] Review Convex schema and functions

### Migration
- [ ] Run initial schema migration
- [ ] Deploy Edge Functions
- [ ] Update client-side code
- [ ] Configure Stripe webhooks
- [ ] Set up RLS policies

### Post-Migration Testing
- [ ] Test user registration/login
- [ ] Test premium subscription flow
- [ ] Test Stripe webhooks
- [ ] Verify real-time updates
- [ ] Test all premium features

### Cleanup
- [ ] Remove Convex dependencies
- [ ] Update documentation
- [ ] Archive Convex project

## Performance Considerations

### Edge Function Optimization
- Use service role key for internal operations
- Implement proper error handling and logging
- Consider caching for frequently accessed data

### Database Optimization
- Proper indexing on frequently queried columns
- Connection pooling for high-traffic operations
- Query optimization for complex joins

## Troubleshooting

### Common Issues
1. **RLS Policy Conflicts**: Ensure policies don't block legitimate access
2. **Timestamp Conversion**: Handle timezone differences between Convex and PostgreSQL
3. **JSON Field Migration**: Ensure JSONB fields maintain proper structure
4. **Foreign Key Constraints**: Verify all relationships are properly established

### Monitoring
- Set up Supabase logging and metrics
- Monitor Edge Function performance
- Track database query performance
- Set up alerts for failed webhook events

## Benefits of Migration

### Immediate Benefits
- **Better SQL Support**: Complex queries and relationships
- **Improved Security**: Row Level Security and fine-grained permissions
- **PostgreSQL Ecosystem**: Rich extension support and tooling
- **Cost Efficiency**: Potentially lower costs at scale

### Long-term Benefits
- **Scalability**: Better performance for large datasets
- **Flexibility**: More deployment options and configurations
- **Community**: Larger PostgreSQL and Supabase community
- **Integration**: Better third-party tool integration

This migration maintains all existing functionality while providing a more robust, scalable foundation for VisionBones.