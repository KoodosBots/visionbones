# VisionBones Development Guidelines

## 🎯 Project Overview
VisionBones is a Telegram Mini App that serves as a **domino game leaderboard aggregator**. Users connect their gaming platform accounts, admins manually verify and enter stats, and everyone can view competitive leaderboards with Bible features.

**Core Concept:** "A godly and competitive view on dominoes" - Track your domino stats across different platforms in one place.

**Tech Stack:**
- Frontend: React (Telegram Mini Web App)
- Backend: Supabase (PostgreSQL + Edge Functions)
- Bot: Minimal Telegram Bot (just launches the web app)
- Deployment: Hostinger VPS (Docker containers + PM2)
- Process Management: PM2 (clustering, monitoring, auto-restart)
- Payments: Stripe ($4.99/month premium)

---

## 🔄 Project Awareness & Context

### How It Works
1. **User Onboarding**: Users select their domino gaming platform and provide their username
2. **Admin Verification**: Admins manually look up users on their platforms and enter stats
3. **Leaderboards**: Real-time leaderboards show rankings across all platforms
4. **Bible Integration**: Free Bible verses and reading plans for all users
5. **Premium Features**: Social links, verified badge, and advanced analytics

### Supported Platforms
- Domino! by Flyclops
- Other domino gaming platforms (expandable list)

### NOT Building (Yet)
- ❌ Automated stats fetching from platforms
- ❌ Tournament organization
- ❌ Wagering/escrow features
- ❌ Complex game mechanics

---

## 🏗️ VisionBones Architecture

### Telegram Mini App Structure (Primary Interface)
```
webapp/
├── src/
│   ├── pages/
│   │   ├── Onboarding.tsx      # Platform selection & username input
│   │   ├── Leaderboard.tsx     # Rankings display
│   │   ├── Profile.tsx         # User stats & customization
│   │   ├── Bible.tsx           # Verses & reading plans
│   │   ├── Admin.tsx           # Protected admin panel
│   │   └── Premium.tsx         # Subscription management
│   ├── components/
│   │   ├── common/             # Reusable UI components
│   │   ├── leaderboard/        # Ranking components
│   │   └── admin/              # Admin-specific components
│   ├── hooks/
│   │   ├── useTelegram.ts      # Telegram Web App integration
│   │   ├── useSupabase.ts      # Supabase real-time hooks
│   │   └── useAuth.ts          # Admin authentication
│   └── utils/
│       ├── telegram.ts         # Telegram utilities
│       └── premium.ts          # Premium feature gating
```

### Minimal Bot Structure (Just a Launcher)
```
bot/
├── index.js                    # Simple bot that launches web app
└── package.json
```

### Supabase Backend Structure
```
supabase/
├── functions/                  # Edge Functions
│   ├── user-management/        # User CRUD operations
│   ├── checkout/               # Stripe checkout functionality
│   ├── premium-management/     # Premium subscription management
│   ├── stripe-webhook/         # Stripe webhook handler
│   ├── subscription-management/ # Subscription lifecycle
│   ├── telegram-auth/          # Telegram authentication
│   └── webhook-handlers/       # Generic webhook handlers
└── migrations/                 # Database schema migrations
    ├── 20240101000000_initial_schema.sql
    ├── 20240101000001_initial_schema.sql
    └── 20250714000001_initial_schema.sql
```

---

## 🗄️ Database Schema

### Users Table
```typescript
{
  telegramId: string,
  username: string,
  selectedPlatform: string,      // e.g., "Domino! by Flyclops"
  platformUsername: string,      // Their username on that platform
  isPremium: boolean,
  premiumExpiry?: Date,
  socialLinks?: {                // Premium only
    twitter?: string,
    instagram?: string,
    tiktok?: string
  },
  verifiedBadge: boolean,        // Premium only
  createdAt: Date,
  lastActive: Date
}
```

### Stats Table
```typescript
{
  userId: string,
  wins: number,
  losses: number,
  winRate: number,               // Calculated: wins / (wins + losses)
  gamesPlayed: number,
  lastUpdated: Date,
  updatedBy: string,              // Admin who entered stats
  platform: string,
  verificationStatus: "pending" | "verified" | "disputed"
}
```

### Platforms Table
```typescript
{
  name: string,                  // e.g., "Domino! by Flyclops"
  iconUrl?: string,
  description?: string,
  isActive: boolean,
  addedAt: Date
}
```

---

## 📱 User Flow Implementation

### 1. Onboarding Flow
```typescript
// Onboarding.tsx
1. Welcome screen with app description
2. Platform selection (dropdown/cards)
3. Username input for selected platform
4. Submit → Create user record with "pending" status
5. Show waiting screen: "Admin will verify your stats soon!"
```

### 2. Admin Panel Flow
```typescript
// Admin.tsx (Protected Route)
1. List of pending verifications
2. For each user:
   - Show platform & username
   - Admin manually checks platform
   - Input form: Wins, Losses
   - Submit → Updates stats, marks as verified
3. Bulk update tools
4. User management features
```

### 3. Leaderboard Views
- **Overall**: All users across all platforms
- **By Platform**: Filter by specific game
- **Time-based**: Weekly/Monthly/All-time
- **Friends**: Telegram contacts on VisionBones

---

## 💳 Premium Features ($4.99/month)

### Free Tier
- Basic stat tracking
- View all leaderboards
- Bible verses & reading plans
- Basic profile

### Premium Tier
- Social media links on profile
- Verified badge
- Advanced analytics (trends, graphs)
- Profile customization (colors, badges)
- Priority stat updates
- Export stats to CSV

### Implementation
```typescript
// Premium feature gating
const { isPremium } = useUser();

if (!isPremium && tryingToAccessPremiumFeature) {
  return <PremiumUpgradePrompt />;
}
```

---

## 🧪 Testing Strategy

### MVP Testing Priorities
1. **Telegram Web App Integration**: Ensure proper initialization
2. **Admin Panel**: Test stat entry and verification flow
3. **Leaderboard Calculations**: Verify ranking accuracy
4. **Premium Gating**: Test feature access control
5. **Mobile Responsiveness**: Test on various devices

---

## 🚀 Deployment

### Hostinger VPS Deployment
VisionBones is deployed on Hostinger VPS using Docker containers with PM2 for process management, providing easy scaling, monitoring, and automatic restarts.

#### Docker Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  webapp:
    build:
      context: ./webapp
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - VITE_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
    restart: unless-stopped

  bot:
    build:
      context: ./bot
      dockerfile: Dockerfile
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_WEBAPP_URL=${TELEGRAM_WEBAPP_URL}
    restart: unless-stopped
    depends_on:
      - webapp

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - webapp
    restart: unless-stopped
```

#### Deployment Options

**Option 1: Docker Deployment**
```bash
# Initial setup
git clone <repository>
cd VisionBones
cp .env.example .env
# Edit .env with your values

# Deploy with Docker
./deploy.sh

# View logs
docker-compose logs -f
```

**Option 2: PM2 Deployment (Recommended for VPS)**
```bash
# Initial setup (same as above)
git clone <repository>
cd VisionBones
cp .env.example .env
# Edit .env with your values

# Deploy with PM2
./deploy-pm2.sh

# View logs and status
pm2 logs
pm2 list

# Management commands
./scripts/pm2-management.sh status
./scripts/pm2-management.sh logs
./scripts/pm2-management.sh restart
```

#### PM2 Process Management
```bash
# Start services
pm2 start ecosystem.config.js --env production

# Monitor services
pm2 monit

# View logs
pm2 logs

# Restart with zero downtime
pm2 reload all

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### Environment Variables
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBAPP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
ADMIN_TELEGRAM_IDS=    # Comma-separated admin Telegram IDs
```

---

## ✅ Task Completion Checklist

### MVP Launch Requirements
- [ ] Minimal bot that launches web app
- [ ] Onboarding flow complete
- [ ] Admin panel functional
- [ ] Basic leaderboards working
- [ ] Bible verses integrated
- [ ] Premium subscription flow
- [ ] Deployed to Hostinger VPS

### Quality Checks
- [ ] Mobile-responsive design
- [ ] Real-time updates working
- [ ] Admin authentication secure
- [ ] Payment processing tested
- [ ] Error handling implemented

---

## 🔒 Security Considerations

### Admin Access
- Verify admin Telegram IDs on backend
- Protected routes in web app
- Audit log for stat changes

### Data Validation
- Sanitize all user inputs
- Validate stat ranges (no negative wins)
- Platform username verification

---

## 📋 Development Priorities

### Phase 1 (MVP)
1. Basic functionality with manual stat entry
2. Core leaderboards
3. Simple admin panel
4. Bible verses

### Phase 2 (Post-Launch)
1. Enhanced admin tools
2. More platforms
3. Social features
4. Advanced analytics

### Future Considerations
- API integration for automated stats (when available)
- Tournament partnerships
- Mobile app version
- Multi-language support

---

This CLAUDE.md serves as the single source of truth for VisionBones development, focusing on building a simple but effective domino leaderboard aggregator that can grow with user needs.