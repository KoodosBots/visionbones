# VisionBones Supabase Migration

## Overview

This directory contains the complete Supabase migration structure for VisionBones, converting from Convex to Supabase while preserving all functionality.

## Directory Structure

```
supabase/
├── functions/                          # Supabase Edge Functions
│   ├── user-management/
│   │   └── index.ts                    # User CRUD operations
│   ├── premium-management/
│   │   └── index.ts                    # Premium status and features
│   ├── subscription-management/
│   │   └── index.ts                    # Stripe subscription handling
│   ├── webhook-handlers/
│   │   └── index.ts                    # Stripe webhook endpoints
│   ├── checkout/
│   │   └── index.ts                    # Stripe checkout sessions
│   └── shared/
│       └── utils.ts                    # Common utilities and types
├── migrations/
│   └── 20240101000001_initial_schema.sql # Database schema migration
├── CONVEX_TO_SUPABASE_MIGRATION.md    # Detailed migration guide
└── README.md                          # This file
```

## Function Mapping

### User Management (`/functions/user-management/`)
- **POST /create-or-update** - Create or update user
- **GET /by-telegram-id** - Get user by Telegram ID
- **PUT /social-links** - Update social media links (premium)
- **GET /by-stripe-customer** - Get user by Stripe customer ID (internal)
- **PUT /premium-status** - Update premium status (internal)

### Premium Management (`/functions/premium-management/`)
- **GET /is-premium** - Check if user has premium access
- **GET /features** - Get available premium features
- **GET /validate-feature** - Validate access to specific feature
- **GET /status** - Get comprehensive premium status

### Subscription Management (`/functions/subscription-management/`)
- **POST /handle-subscription-update** - Handle Stripe subscription updates
- **POST /handle-subscription-deleted** - Handle subscription cancellation
- **POST /handle-payment-succeeded** - Handle successful payments
- **POST /handle-payment-failed** - Handle failed payments
- **GET /user-subscription** - Get user's subscription
- **POST /cancel-subscription** - Cancel user's subscription
- **POST /upsert-subscription** - Create/update subscription (internal)
- **POST /update-subscription-status** - Update subscription status (internal)

### Webhook Handlers (`/functions/webhook-handlers/`)
- **POST /stripe** - Main Stripe webhook endpoint
- **GET /event** - Get webhook event by ID
- **POST /log-event** - Log webhook event
- **POST /mark-processed** - Mark event as processed
- **POST /log-error** - Log webhook error

### Checkout (`/functions/checkout/`)
- **POST /create-session** - Create Stripe checkout session
- **POST /create-portal** - Create Stripe billing portal session

## Database Schema

The migration creates three main tables:

### Users (`users`)
- `id` (UUID, Primary Key)
- `telegram_id` (Text, Unique)
- `username` (Text)
- `selected_platform` (Text)
- `platform_username` (Text)
- `is_premium` (Boolean)
- `premium_expiry` (Timestamp)
- `stripe_customer_id` (Text, Unique)
- `stripe_subscription_id` (Text)
- `social_links` (JSONB)
- `verified_badge` (Boolean)
- `created_at` (Timestamp)
- `last_active` (Timestamp)

### Subscriptions (`subscriptions`)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `stripe_subscription_id` (Text, Unique)
- `stripe_customer_id` (Text)
- `status` (Text)
- `current_period_start` (Timestamp)
- `current_period_end` (Timestamp)
- `cancel_at_period_end` (Boolean)
- `canceled_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Webhook Events (`webhook_events`)
- `id` (UUID, Primary Key)
- `stripe_event_id` (Text, Unique)
- `event_type` (Text)
- `processed` (Boolean)
- `processed_at` (Timestamp)
- `error` (Text)
- `created_at` (Timestamp)

## Security

### Row Level Security (RLS)
- Users can only access their own data
- Subscriptions inherit user access permissions
- Webhook events are only accessible to service role

### Authentication
- Uses Supabase Auth with Telegram integration
- Service role key for internal operations
- Anonymous key for client operations

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deployment

### 1. Database Migration
```bash
supabase db push
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy user-management
supabase functions deploy premium-management
supabase functions deploy subscription-management
supabase functions deploy webhook-handlers
supabase functions deploy checkout
```

### 3. Configure Stripe Webhooks
Update webhook endpoint to:
```
https://your-project.supabase.co/functions/v1/webhook-handlers/stripe
```

Subscribe to events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Client Migration Examples

### Simple Query (Direct Client Call)
```typescript
// Before (Convex)
const user = useQuery(api.users.getUserByTelegramId, { telegramId })

// After (Supabase)
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('telegram_id', telegramId)
  .single()
```

### Complex Operation (Edge Function)
```typescript
// Before (Convex)
const result = await useMutation(api.users.createOrUpdateUser)({
  telegramId, username, selectedPlatform, platformUsername
})

// After (Supabase)
const response = await fetch('/functions/v1/user-management/create-or-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ telegramId, username, selectedPlatform, platformUsername })
})
const result = await response.json()
```

### Real-time Updates
```typescript
// Before (Convex)
// Automatic real-time updates with useQuery

// After (Supabase)
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

## Key Benefits

1. **PostgreSQL Power**: Advanced SQL capabilities and ecosystem
2. **Better Security**: Row Level Security and fine-grained permissions
3. **Cost Efficiency**: Potentially lower costs at scale
4. **Flexibility**: More deployment options and configurations
5. **Ecosystem**: Rich PostgreSQL extension support

## Migration Checklist

- [ ] Deploy database schema
- [ ] Deploy Edge Functions
- [ ] Update client-side code
- [ ] Configure Stripe webhooks
- [ ] Test all functionality
- [ ] Update environment variables
- [ ] Monitor performance

## Support

For detailed migration instructions, see `CONVEX_TO_SUPABASE_MIGRATION.md`.

For Supabase-specific documentation, visit [Supabase Docs](https://supabase.com/docs).

For Stripe integration help, see [Stripe Documentation](https://stripe.com/docs).