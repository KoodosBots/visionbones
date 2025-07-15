# VisionBones Web App

React-based Telegram Mini App for domino game leaderboard aggregation.

## Quick Start

1. **Local Development with Docker**
   ```bash
   # From project root
   docker-compose up -d --build
   ```

2. **Local Development (without Docker)**
   ```bash
   npm install
   npm run dev
   ```

## Environment Variables

Set up `.env.local` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## Tech Stack

- React + TypeScript + Vite
- Supabase (PostgreSQL + Edge Functions)
- Stripe (Premium subscriptions)
- React Query (State management)
- Telegram Mini App SDK

See main README for full project documentation.